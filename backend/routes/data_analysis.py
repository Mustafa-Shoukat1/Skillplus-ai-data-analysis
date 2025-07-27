import asyncio
import os
import uuid
import time
import pandas as pd
from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from models.database import UploadedFile, User, AnalysisResult
from models.data_analysis import DataAnalysisRequest, ChartGenerationResponse, AnalysisVisibilityUpdate, AnalysisListResponse
from services.auth import get_current_active_user
from services.data_analysis import DataAnalysisService
from core.database import get_async_db, get_async_db_dependency
from core.logger import logger, log_exception, log_function_entry, log_function_exit

router = APIRouter(prefix="/analysis", tags=["Data Analysis"])

# In-memory storage for background task results
# In production, use Redis or similar
analysis_results: Dict[str, Any] = {}

# Add manual CORS handling for preflight requests - FIXED
@router.options("/visibility/{analysis_id}")
async def options_visibility_handler(analysis_id: str, request: Request):
    """Handle OPTIONS requests for visibility endpoint CORS preflight"""
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "http://localhost:3000",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Credentials": "true"
        }
    )

@router.options("/{path:path}")
async def options_handler(request: Request):
    """Handle OPTIONS requests for CORS preflight - general catch-all"""
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "http://localhost:3000",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Credentials": "true"
        }
    )

@router.post("/analyze/{file_id}")
async def start_analysis(
    file_id: str,
    request: DataAnalysisRequest,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Start and complete data analysis, returning result in database format with task_id"""
    
    log_function_entry(logger, "start_analysis", file_id=file_id, 
                      prompt_length=len(request.prompt) if request.prompt else 0,
                      model=request.model)
    
    try:
        logger.info(f"🎯 Received analysis request for file_id: {file_id}")
        logger.debug(f"📝 Request details: {request.model_dump()}")
        
        # Generate task_id for frontend compatibility
        task_id = str(uuid.uuid4())
        logger.info(f"🏷️ Generated task_id: {task_id}")
        
        # Use default user_id = 1 for now
        default_user_id = 1
        
        # Generate proper analysis_id with consistent format
        timestamp = int(time.time())
        unique_suffix = str(uuid.uuid4())[:8]
        analysis_id = f"analysis_{timestamp}_{unique_suffix}"
        logger.info(f"🆔 Generated analysis_id: {analysis_id}")
        
        # Validate file exists with enhanced logging
        logger.debug(f"🔍 Validating file existence: {file_id}")
        result = await db.execute(
            select(UploadedFile).where(UploadedFile.file_id == file_id)
        )
        file_obj = result.scalar_one_or_none()
        
        if not file_obj:
            logger.warning(f"❌ File not found in database: {file_id}")
            raise HTTPException(status_code=404, detail="File not found")
        
        logger.info(f"✅ File validated: {file_obj.original_filename}")
        logger.debug(f"📁 File path: {file_obj.file_path}")
        logger.debug(f"📊 File type: {file_obj.file_type}")
        logger.debug(f"📏 File size: {file_obj.file_size} bytes")
        
        # Initialize task in storage for status endpoint compatibility
        analysis_results[task_id] = {
            "status": "processing",
            "progress": 50,
            "task_id": task_id,
            "file_id": file_id,
            "user_id": default_user_id,
            "analysis_id": analysis_id  # Pre-assign the proper analysis_id
        }
        
        # Load data as separate DataFrames - NO CONCATENATION
        try:
            dfs_list = []  # List of separate DataFrames
            dfs_metadata = []  # Metadata for each DataFrame
            
            if file_obj.file_type.lower() in ['.xlsx', '.xls']:
                logger.info("📊 Loading Excel file with skiprows=4 - keeping DataFrames separate")
                
                # Read all sheets with skiprows=4
                sheets = pd.read_excel(file_obj.file_path, sheet_name=None, skiprows=4)
                
                if not sheets:
                    raise Exception("No readable sheets found in Excel file")
                
                # Process each sheet as separate DataFrame - MINIMAL PREPROCESSING
                for sheet_name, sheet_df in sheets.items():
                    try:
                        # MINIMAL preprocessing - only remove completely empty rows/columns
                        original_shape = sheet_df.shape
                        sheet_df = sheet_df.dropna(how='all').dropna(axis=1, how='all')
                        
                        if not sheet_df.empty:
                            dfs_list.append(sheet_df.copy())  # Use copy to avoid reference issues
                            
                            # Create metadata for this DataFrame
                            df_metadata = {
                                "sheet_name": sheet_name,
                                "sheet_index": len(dfs_list) - 1,
                                "shape": sheet_df.shape,
                                "original_shape": original_shape,
                                "columns": sheet_df.columns.tolist(),
                                "data_types": {str(col): str(dtype) for col, dtype in sheet_df.dtypes.items()},
                                "source_file": file_obj.original_filename,
                                "processing_method": "minimal_cleanup_only"
                            }
                            dfs_metadata.append(df_metadata)
                            
                            logger.info(f"✅ Loaded sheet '{sheet_name}': {sheet_df.shape} (was {original_shape})")
                        else:
                            logger.warning(f"⚠️ Sheet '{sheet_name}' is empty after minimal cleanup")
                    except Exception as sheet_error:
                        logger.warning(f"⚠️ Could not load sheet {sheet_name}: {sheet_error}")
                
                if not dfs_list:
                    raise Exception("No valid data found in any sheet")
                
                # For analysis, use the largest DataFrame (no concatenation)
                largest_df_index = max(range(len(dfs_list)), key=lambda i: len(dfs_list[i]))
                primary_df = dfs_list[largest_df_index].copy()  # Use copy to avoid reference issues
                primary_sheet_name = dfs_metadata[largest_df_index]["sheet_name"]
                
                logger.info(f"📈 Using '{primary_sheet_name}' as primary DataFrame for analysis: {primary_df.shape}")
                
            else:
                # CSV file
                try:
                    df = pd.read_csv(file_obj.file_path)
                    
                    # MINIMAL preprocessing - only remove completely empty rows/columns
                    original_shape = df.shape
                    df = df.dropna(how='all').dropna(axis=1, how='all')
                    
                    if not df.empty:
                        df = df.reset_index(drop=True)  # Reset index
                        
                        logger.info(f"📊 After cleanup: {df.shape} (was {original_shape})")
                        
                        dfs_list = [df.copy()]  # Use copy
                        # Create metadata for CSV DataFrame
                        dfs_metadata = [{
                            "sheet_name": "main",
                            "sheet_index": 0,
                            "shape": df.shape,
                            "original_shape": original_shape,
                            "columns": df.columns.tolist(),
                            "data_types": {str(col): str(dtype) for col, dtype in df.dtypes.items()},
                            "source_file": file_obj.original_filename,
                            "processing_method": "minimal_cleanup_csv"
                        }]
                        
                        primary_df = df
                        primary_sheet_name = "main"
                        
                        logger.info(f"📂 CSV processed: {df.shape} (was {original_shape})")
                    else:
                        raise Exception("CSV file is empty after cleanup")
                except Exception as csv_error:
                    log_exception(logger, "CSV processing error", csv_error)
                    raise
            
            logger.info(f"✅ Data loaded successfully. Total DataFrames: {len(dfs_list)}, Primary DataFrame shape: {primary_df.shape}")
            
        except Exception as file_load_error:
            logger.error(f"❌ Failed to load file {file_obj.file_path}: {file_load_error}")
            log_exception(logger, "File loading error", file_load_error)
            analysis_results[task_id] = {
                "status": "failed",
                "progress": 0,
                "error": f"Failed to load file: {str(file_load_error)}",
                "task_id": task_id,
                "success": False
            }
            raise HTTPException(status_code=400, detail=f"Failed to load file: {str(file_load_error)}")
        
        # Run analysis synchronously
        logger.info(f"🚀 Starting AI workflow analysis...")
        start_time = time.time()
        
        # Validate prompt
        if not request.prompt or len(request.prompt.strip()) < 10:
            logger.error(f"❌ Invalid or too short prompt: '{request.prompt}'")
            analysis_results[task_id] = {
                "status": "failed",
                "progress": 0,
                "error": "Prompt is too short or empty",
                "task_id": task_id,
                "success": False
            }
            raise HTTPException(status_code=400, detail="Prompt is too short or empty")
        
        # Update progress
        analysis_results[task_id]["progress"] = 75
        
        # Run analysis
        try:
            from agents.graphs.graph import run_analysis
            
            # Enhanced prompt with separate DataFrames information
            enhanced_prompt = f"""
{request.prompt}

AVAILABLE DATAFRAMES INFORMATION (NO CONCATENATION):
- Total DataFrames: {len(dfs_list)}
- Primary DataFrame: '{primary_sheet_name}' (Shape: {primary_df.shape})
- Processing: Minimal cleanup only (empty rows/columns removed)
"""
            if len(dfs_list) > 1:
                enhanced_prompt += "\n- Additional DataFrames available:\n"
                for meta in dfs_metadata:
                    if meta['sheet_name'] != primary_sheet_name:
                        enhanced_prompt += f"  * '{meta['sheet_name']}' (Shape: {meta['shape']}, Columns: {len(meta['columns'])})\n"
                enhanced_prompt += "\nNote: Each DataFrame is separate and unmodified except for empty row/column removal.\n"
            
            # Pass primary DataFrame for analysis
            analysis_result = await asyncio.get_event_loop().run_in_executor(
                None, run_analysis, primary_df, enhanced_prompt, request.model
            )
            
            logger.info(f"✅ AI workflow completed")
            
        except Exception as workflow_error:
            logger.error(f"❌ AI workflow execution failed: {workflow_error}")
            log_exception(logger, "AI workflow execution error", workflow_error)
            analysis_results[task_id] = {
                "status": "failed",
                "progress": 0,
                "error": f"AI workflow failed: {str(workflow_error)}",
                "task_id": task_id,
                "success": False
            }
            raise HTTPException(status_code=500, detail=f"AI workflow failed: {str(workflow_error)}")
        
        processing_time = time.time() - start_time
        logger.info(f"⏱️ Analysis completed in {processing_time:.2f} seconds")
        
        # Save to database - ENSURE THIS HAPPENS with proper analysis_id
        try:
            logger.info(f"💾 Saving analysis result to database with analysis_id: {analysis_id}")
            db_result = await DataAnalysisService.save_analysis_result(
                db, default_user_id, file_obj.id, request.prompt, 
                analysis_result, processing_time, request.model, analysis_id  # Pass the proper analysis_id
            )
            logger.info(f"✅ Analysis saved successfully with ID: {db_result.analysis_id}")
            
            # Verify the analysis_id matches what we generated
            if db_result.analysis_id != analysis_id:
                logger.warning(f"⚠️ Analysis ID mismatch: expected {analysis_id}, got {db_result.analysis_id}")
                # This should not happen, but if it does, use what was actually saved
                analysis_id = db_result.analysis_id
            
        except Exception as save_error:
            logger.error(f"❌ CRITICAL: Failed to save to database: {save_error}")
            log_exception(logger, "Database save error", save_error)
            
            # For general queries, we MUST save to database for visibility toggle to work
            # Try alternative save approach with the SAME analysis_id
            try:
                logger.info(f"🔄 Attempting alternative database save with analysis_id: {analysis_id}")
                
                # Create minimal analysis result for database
                minimal_result = {
                    "success": True,
                    "classification": {"query_type": "general"},
                    "analysis": {"query_understanding": request.prompt},
                    "execution": {"success": True, "output": "Analysis completed"},
                    "final_results": {"answer": "Analysis completed", "summary": request.prompt}
                }
                
                # Use the same database session and the SAME analysis_id
                db_result = await DataAnalysisService.save_analysis_result(
                    db, default_user_id, file_obj.id, request.prompt, 
                    minimal_result, processing_time, request.model, analysis_id  # Pass the SAME analysis_id
                )
                logger.info(f"✅ Alternative save successful: {db_result.analysis_id}")
                
                # Verify it's the same ID
                if db_result.analysis_id != analysis_id:
                    logger.warning(f"⚠️ Alternative save changed ID: expected {analysis_id}, got {db_result.analysis_id}")
                    analysis_id = db_result.analysis_id
                
            except Exception as alt_save_error:
                logger.error(f"❌ Alternative save also failed: {alt_save_error}")
                log_exception(logger, "Alternative save error", alt_save_error)
                
                # ONLY IF BOTH SAVES FAIL, then use temp ID
                logger.error("📝 BOTH database saves failed - using temporary ID but this should be investigated")
                analysis_id = f"temp_{int(time.time())}"
                db_result = None
                
                # Log this as a critical issue
                logger.critical(f"⚠️ CRITICAL: Analysis {analysis_id} will not be available for visibility toggle")

        # Extract data in database format
        def safe_extract_dict(obj, default=None):
            if obj is None:
                return default or {}
            if hasattr(obj, 'model_dump'):
                return obj.model_dump()
            elif isinstance(obj, dict):
                return obj
            else:
                return default or {}
        
        classification_data = safe_extract_dict(analysis_result.get("classification"), {})
        analysis_code_data = safe_extract_dict(analysis_result.get("analysis"), {})
        execution_data = safe_extract_dict(analysis_result.get("execution"), {})
        final_results_data = safe_extract_dict(analysis_result.get("final_results"), {})
        
        # Handle query type
        query_type = classification_data.get("query_type", "unknown")
        if hasattr(query_type, 'value'):
            query_type_str = query_type.value
        else:
            query_type_str = str(query_type).lower()
        
        # Get visualization HTML for visualization queries
        visualization_html = None
        if query_type_str == "visualization":
            logger.info("📊 Processing visualization query - checking for HTML content")
            
            # Check execution results for file paths
            if execution_data.get("visualization_created") and execution_data.get("file_paths"):
                for file_path in execution_data.get("file_paths", []):
                    if file_path.endswith('.html'):
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                visualization_html = f.read()
                            logger.info(f"✅ Successfully read {len(visualization_html)} characters from {file_path}")
                            break
                        except Exception as e:
                            logger.warning(f"⚠️ Could not read visualization file {file_path}: {e}")
            
            # Check standard plots directory
            if not visualization_html:
                plots_dir = os.path.abspath('plots')
                html_file = os.path.join(plots_dir, 'visualization.html')
                if os.path.exists(html_file):
                    try:
                        with open(html_file, 'r', encoding='utf-8') as f:
                            visualization_html = f.read()
                        logger.info(f"✅ Read visualization HTML from standard location: {len(visualization_html)} characters")
                    except Exception as e:
                        logger.warning(f"⚠️ Could not read from standard location {html_file}: {e}")
            
            # Check if HTML is in the database result
            if not visualization_html and db_result and db_result.visualization_html:
                visualization_html = db_result.visualization_html
                logger.info(f"✅ Found HTML in database result: {len(visualization_html)} characters")
        
        # Determine overall success
        overall_success = (
            analysis_result.get("success", False) or
            bool(final_results_data.get("success")) or
            bool(execution_data.get("success")) or
            bool(analysis_result.get("generated_code"))
        )
        
        # Create the database format response with the PROPER analysis_id
        database_format_response = {
            "analysis_id": analysis_id,  # Use the consistent analysis_id that was saved
            "database_id": db_result.id if db_result else None,
            "user_query": request.prompt,
            "success": overall_success,
            "file_info": {
                "total_dataframes": len(dfs_list),
                "dataframes_metadata": dfs_metadata,
                "primary_dataframe": {
                    "sheet_name": primary_sheet_name,
                    "shape": primary_df.shape,
                    "columns": primary_df.columns.tolist()
                }
            },
            "classification": {
                "query_type": query_type_str,
                "reasoning": classification_data.get("reasoning"),
                "user_intent": classification_data.get("user_intent"),
                "requires_data_filtering": classification_data.get("requires_data_filtering"),
                "confidence": classification_data.get("confidence")
            },
            "analysis": {
                "query_understanding": analysis_code_data.get("query_understanding"),
                "approach": analysis_code_data.get("approach"),
                "required_columns": analysis_code_data.get("required_columns", []),
                "expected_output": analysis_code_data.get("expected_output")
            },
            "execution": {
                "success": execution_data.get("success"),
                "output": execution_data.get("output"),
                "visualization_created": execution_data.get("visualization_created", False),
                "file_paths": execution_data.get("file_paths", [])
            },
            "final_results": {
                "answer": final_results_data.get("answer"),
                "summary": final_results_data.get("summary"),
                "visualization_info": final_results_data.get("visualization_info")
            },
            "generated_code": analysis_result.get("generated_code"),
            "visualization_html": visualization_html,
            "retry_count": analysis_result.get("retry_count", 0),
            "processing_time": processing_time,
            "model_used": request.model,
            "created_at": datetime.now().isoformat(),
            "completed_at": datetime.now().isoformat()
        }
        
        # Store completed result in analysis_results for status endpoint
        analysis_results[task_id] = {
            "status": "completed",
            "progress": 100,
            "result": analysis_result,
            "analysis_id": analysis_id,  # Use the proper analysis_id that was saved
            "database_id": db_result.id if db_result else None,
            "task_id": task_id,
            "success": overall_success,
            "database_response": database_format_response
        }
        
        logger.info(f"✅ Analysis completed for task_id: {task_id}, analysis_id: {analysis_id}")
        
        # Return the database format response directly with task_id for compatibility
        return {
            **database_format_response,
            "task_id": task_id  # Add task_id for frontend compatibility
        }
        
    except HTTPException as http_error:
        logger.error(f"❌ HTTP Exception in start_analysis: {http_error.detail}")
        log_exception(logger, "HTTP Exception in start_analysis", http_error)
        raise
    except Exception as e:
        logger.error("❌ Unexpected error in start_analysis")
        log_exception(logger, "Failed to complete analysis", e)
        
        # Update task status on error
        if 'task_id' in locals():
            analysis_results[task_id] = {
                "status": "failed",
                "progress": 0,
                "error": str(e),
                "task_id": task_id,
                "success": False
            }
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete analysis: {str(e)}"
        )

@router.get("/status/{task_id}")
async def get_analysis_status(task_id: str):
    """Get status of background analysis task"""
    try:
        logger.debug(f"Checking status for task_id: {task_id}")
        
        if task_id not in analysis_results:
            logger.warning(f"Task not found: {task_id}")
            raise HTTPException(status_code=404, detail="Task not found")
        
        status_info = analysis_results[task_id]
        logger.debug(f"Task status: {status_info.get('status', 'unknown')}")
        
        # Enhanced status response with better completion indication
        response = {
            "task_id": task_id,
            "status": status_info.get("status", "unknown"),
            "progress": status_info.get("progress", 0),
            "completed": status_info.get("status") == "completed",
            "success": status_info.get("success", False),
            "error": status_info.get("error"),
            "analysis_id": status_info.get("analysis_id")
        }
        
        logger.debug(f"Returning status response: {response}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        log_exception(logger, f"Failed to get status for task: {task_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get task status"
        )

@router.get("/result/{task_id}", response_model=ChartGenerationResponse)
async def get_analysis_result(task_id: str):
    """Get completed analysis result"""
    logger.info(f"Fetching result for task_id: {task_id}")
    
    if task_id not in analysis_results:
        logger.warning(f"Task not found in analysis_results: {task_id}")
        logger.debug(f"Available task_ids: {list(analysis_results.keys())}")
        raise HTTPException(status_code=404, detail="Task not found")
    
    result = analysis_results[task_id]
    logger.info(f"Task result status: {result.get('status')}")
    
    if result["status"] == "processing":
        logger.debug(f"Task {task_id} still processing, progress: {result.get('progress', 0)}")
        raise HTTPException(status_code=202, detail="Analysis still in progress")
    
    if result["status"] == "failed":
        logger.error(f"Task {task_id} failed with error: {result.get('error')}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error", "Analysis failed")
        )
    
    # Extract analysis data
    analysis_data = result.get("result")
    if not analysis_data:
        logger.error(f"No analysis data found for task {task_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Analysis data missing"
        )
    
    logger.info(f"Processing analysis result for task {task_id}")
    logger.debug(f"Analysis data type: {type(analysis_data)}")
    
    # Convert Pydantic objects to dictionaries for safe access
    def safe_extract(obj):
        if hasattr(obj, 'model_dump'):
            return obj.model_dump()
        elif isinstance(obj, dict):
            return obj
        else:
            return {}
    
    # Safe extraction of nested data
    classification_dict = safe_extract(analysis_data.get("classification"))
    analysis_dict = safe_extract(analysis_data.get("analysis"))
    execution_dict = safe_extract(analysis_data.get("execution"))
    final_results_dict = safe_extract(analysis_data.get("final_results"))
    
    # Check query type
    query_type = classification_dict.get("query_type", "unknown")
    if hasattr(query_type, 'value'):
        query_type_str = query_type.value
    else:
        query_type_str = str(query_type).lower()
    
    logger.info(f"Processing result for query type: {query_type_str}")
    
    # Extract summary - try multiple sources
    summary = (
        final_results_dict.get("summary") or 
        final_results_dict.get("answer") or
        analysis_dict.get("query_understanding") or
        "Analysis completed successfully"
    )
    
    # Determine success status
    analysis_success = False
    if isinstance(analysis_data, dict):
        final_results_success = final_results_dict.get("success", False) if final_results_dict else False
        execution_success = execution_dict.get("success", False) if execution_dict else False
        has_code = bool(analysis_data.get("generated_code"))
        
        analysis_success = (
            analysis_data.get("success", False) or 
            final_results_success or
            execution_success or
            has_code
        )
    
    logger.info(f"Analysis success determined: {analysis_success}")
    
    # Get visualization HTML with enhanced fallback
    chart_html = None
    
    if query_type_str == "visualization":
        logger.info("Looking for visualization HTML content...")
        
        # Try multiple methods to get HTML
        chart_html = analysis_data.get("visualization_html")
        
        if not chart_html and result.get("analysis_id"):
            try:
                async with get_async_db() as db:
                    db_result = await db.execute(
                        select(AnalysisResult).where(AnalysisResult.analysis_id == result["analysis_id"])
                    )
                    analysis_record = db_result.scalar_one_or_none()
                    if analysis_record and analysis_record.visualization_html:
                        chart_html = analysis_record.visualization_html
                        logger.info(f"✅ Loaded HTML from database: {len(chart_html)} characters")
            except Exception as e:
                logger.warning(f"⚠️ Could not load HTML from database: {e}")
        
        # Check for HTML files if still not found
        if not chart_html and execution_dict:
            file_paths = execution_dict.get("file_paths", [])
            for file_path in file_paths:
                if file_path.endswith('.html') and os.path.exists(file_path):
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            chart_html = f.read()
                        logger.info(f"✅ Loaded HTML from file {file_path}: {len(chart_html)} characters")
                        break
                    except Exception as e:
                        logger.warning(f"⚠️ Could not read HTML file {file_path}: {e}")
        
        # Check standard location
        if not chart_html:
            plots_dir = os.path.abspath('plots')
            html_file = os.path.join(plots_dir, 'visualization.html')
            if os.path.exists(html_file):
                try:
                    with open(html_file, 'r', encoding='utf-8') as f:
                        chart_html = f.read()
                    logger.info(f"✅ Loaded HTML from standard location: {len(chart_html)} characters")
                except Exception as e:
                    logger.warning(f"⚠️ Could not read HTML from standard location: {e}")
    
    logger.info(f"Visualization HTML found: {bool(chart_html)}")
    
    # Build comprehensive response
    response = ChartGenerationResponse(
        success=analysis_success,
        chart_base64=None,
        chart_html=chart_html,
        insights=[],
        generated_code=analysis_data.get("generated_code"),
        analysis_summary=summary,
        query_analysis=classification_dict if classification_dict else None,
        data_analysis=analysis_dict if analysis_dict else None,
        execution_result=execution_dict if execution_dict else None,
        error_message=None if analysis_success else analysis_data.get("error", "Analysis completed but with issues"),
        analysis_id=result.get("analysis_id")
    )
    
    logger.info(f"Returning result for task {task_id}: success={response.success}, has_code={bool(response.generated_code)}, has_html={bool(response.chart_html)}")
    
    return response

@router.patch("/visibility/{analysis_id}")
async def toggle_analysis_visibility(
    analysis_id: str,
    visibility_data: dict,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Toggle analysis visibility for viewers using is_active field"""
    try:
        is_active = visibility_data.get("is_active", True)
        logger.info(f"Toggling analysis {analysis_id} is_active to: {is_active}")
        
        # Update the analysis is_active status in database
        result = await db.execute(
            update(AnalysisResult)
            .where(AnalysisResult.analysis_id == analysis_id)
            .values(is_active=is_active)
        )
        
        if result.rowcount == 0:
            logger.warning(f"Analysis not found: {analysis_id}")
            raise HTTPException(
                status_code=404,
                detail="Analysis not found"
            )
        
        await db.commit()
        logger.info(f"Analysis {analysis_id} is_active updated to: {is_active}")
        
        # Return response with CORS headers
        return JSONResponse(
            content={
                "success": True,
                "analysis_id": analysis_id,
                "is_active": is_active,
                "message": f"Analysis {'activated' if is_active else 'deactivated'} successfully"
            },
            headers={
                "Access-Control-Allow-Origin": "http://localhost:3000",
                "Access-Control-Allow-Credentials": "true"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating analysis visibility: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to update visibility"
        )

@router.get("/active")
async def get_active_analyses(
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get all active analyses visible to viewers"""
    try:
        result = await db.execute(
            select(AnalysisResult)
            .where(AnalysisResult.is_active == True)
            .order_by(AnalysisResult.created_at.desc())
        )
        analyses = result.scalars().all()
        
        # Convert to dict format
        active_analyses = []
        for analysis in analyses:
            analysis_dict = {
                "analysis_id": analysis.analysis_id,
                "user_query": analysis.user_query,
                "summary": analysis.summary,
                "query_type": analysis.query_type,
                "success": analysis.success,
                "visualization_created": analysis.visualization_created,
                "visualization_html": analysis.visualization_html,
                "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
                "is_active": analysis.is_active
            }
            active_analyses.append(analysis_dict)
        
        logger.info(f"Retrieved {len(active_analyses)} active analyses")
        
        return {
            "success": True,
            "data": active_analyses,
            "count": len(active_analyses)
        }
        
    except Exception as e:
        logger.error(f"Error fetching active analyses: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch active analyses"
        )

@router.get("/history")
async def get_analysis_history(
    active_only: bool = False,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get analysis history with optional active filter"""
    try:
        query = select(AnalysisResult)
        
        if active_only:
            query = query.where(AnalysisResult.is_active == True)
        
        query = query.order_by(AnalysisResult.created_at.desc())
        
        result = await db.execute(query)
        analyses = result.scalars().all()
        
        # Convert to dict format
        history = []
        for analysis in analyses:
            analysis_dict = {
                "analysis_id": analysis.analysis_id,
                "user_query": analysis.user_query,
                "summary": analysis.summary,
                "query_type": analysis.query_type,
                "success": analysis.success,
                "visualization_created": analysis.visualization_created,
                "visualization_html": analysis.visualization_html,
                "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
                "is_active": analysis.is_active  # Changed from is_visible
            }
            history.append(analysis_dict)
        
        return {
            "success": True,
            "data": history,
            "count": len(history)
        }
        
    except Exception as e:
        logger.error(f"Error fetching analysis history: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch analysis history"
        )

@router.get("/result/db/{analysis_id}")
async def get_saved_analysis_result(
    analysis_id: str,  # Changed from int to str
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get analysis result from database by analysis_id"""
    
    result = await db.execute(
        select(AnalysisResult).where(AnalysisResult.analysis_id == analysis_id)  # Use analysis_id instead of id
    )
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return {
        "analysis_id": analysis.analysis_id,  # Return analysis_id instead of id
        "database_id": analysis.id,  # Include internal ID for reference if needed
        "user_query": analysis.user_query,
        "success": analysis.success,
        "classification": {
            "query_type": analysis.query_type,
            "reasoning": analysis.classification_reasoning,
            "user_intent": analysis.user_intent,
            "requires_data_filtering": analysis.requires_data_filtering,
            "confidence": analysis.classification_confidence
        },
        "analysis": {
            "query_understanding": analysis.query_understanding,
            "approach": analysis.approach,
            "required_columns": analysis.required_columns,
            "expected_output": analysis.expected_output
        },
        "execution": {
            "success": analysis.execution_success,
            "output": analysis.execution_output,
            "visualization_created": analysis.visualization_created,
            "file_paths": analysis.file_paths
        },
        "final_results": {
            "answer": analysis.final_answer,
            "summary": analysis.summary,
            "visualization_info": analysis.visualization_info
        },
        "generated_code": analysis.generated_code,
        "visualization_html": analysis.visualization_html,
        "retry_count": analysis.retry_count,
        "processing_time": analysis.processing_time,
        "model_used": analysis.model_used,
        "created_at": analysis.created_at,
        "completed_at": analysis.completed_at
    }

@router.get("/visualization/{analysis_id}")
async def get_visualization_html(
    analysis_id: str,  # Changed from int to str
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get visualization HTML content for rendering by analysis_id"""
    
    result = await db.execute(
        select(AnalysisResult).where(AnalysisResult.analysis_id == analysis_id)  # Use analysis_id
    )
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    if not analysis.visualization_html:
        raise HTTPException(status_code=404, detail="No visualization available for this analysis")
    
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=analysis.visualization_html)

@router.get("/debug/tasks")
async def debug_tasks():
    """Debug endpoint to see all tasks (enhanced with file info)"""
    return {
        "total_tasks": len(analysis_results),
        "tasks": {
            task_id: {
                "status": task_data.get("status"),
                "progress": task_data.get("progress"),
                "has_result": "result" in task_data,
                "result_type": type(task_data.get("result")).__name__ if "result" in task_data else None,
                "success": task_data.get("success"),
                "analysis_id": task_data.get("analysis_id"),
                "file_info": task_data.get("file_info", {}),
                "keys": list(task_data.keys())
            }
            for task_id, task_data in analysis_results.items()
        }
    }