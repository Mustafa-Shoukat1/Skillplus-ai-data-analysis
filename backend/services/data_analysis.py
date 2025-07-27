import asyncio
import os
import pandas as pd
import time
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, BackgroundTasks
import uuid
from pathlib import Path

from models.database import UploadedFile, AnalysisResult, User
from models.data_analysis import DataAnalysisRequest, ChartGenerationResponse
from agents.graphs.graph import run_analysis
from core.database import get_async_db
from core.logger import logger, log_exception, log_function_entry, log_function_exit, log_data_info

class DataAnalysisService:
    
    @staticmethod
    async def get_file_by_id(db: AsyncSession, file_id: str, user_id: int = None) -> Optional[UploadedFile]:
        """Get uploaded file by ID (user_id now optional)"""
        if user_id:
            result = await db.execute(
                select(UploadedFile).where(
                    UploadedFile.file_id == file_id,
                    UploadedFile.user_id == user_id
                )
            )
        else:
            result = await db.execute(
                select(UploadedFile).where(UploadedFile.file_id == file_id)
            )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def save_analysis_result(
        db: AsyncSession,
        user_id: int,
        file_id: int,
        user_query: str,
        analysis_data: Dict[str, Any],
        processing_time: float,
        model_used: str,
        analysis_id: str = None  # Accept pre-generated analysis_id
    ) -> AnalysisResult:
        """Save analysis result to database with improved data extraction"""
        
        logger.info(f"Saving analysis result to database...")
        
        # ALWAYS use provided analysis_id if given, otherwise generate one
        if analysis_id:
            logger.info(f"Using provided analysis_id: {analysis_id}")
            # Validate that it has the correct format
            if not analysis_id.startswith("analysis_") and not analysis_id.startswith("temp_"):
                logger.warning(f"⚠️ Analysis ID doesn't have expected format: {analysis_id}")
        else:
            # Generate unique analysis ID with consistent format
            import uuid
            import time
            timestamp = int(time.time())
            unique_suffix = str(uuid.uuid4())[:8]
            analysis_id = f"analysis_{timestamp}_{unique_suffix}"
            logger.info(f"Generated new analysis_id: {analysis_id}")
        
        # Helper function to safely extract data from Pydantic objects or dicts
        def safe_extract_dict(obj, default=None):
            if obj is None:
                return default or {}
            if hasattr(obj, 'model_dump'):
                return obj.model_dump()
            elif isinstance(obj, dict):
                return obj
            else:
                logger.warning(f"Unexpected object type for extraction: {type(obj)}")
                return default or {}
        
        try:
            # Extract data with improved error handling
            classification_data = safe_extract_dict(analysis_data.get("classification"), {})
            analysis_code_data = safe_extract_dict(analysis_data.get("analysis"), {})
            execution_data = safe_extract_dict(analysis_data.get("execution"), {})
            final_results_data = safe_extract_dict(analysis_data.get("final_results"), {})
            
            # Determine query type - FIXED to handle both enum and string values
            query_type = classification_data.get("query_type", "unknown")
            
            # Handle both enum values and string values
            if hasattr(query_type, 'value'):
                query_type_str = query_type.value  # Extract string from enum
            else:
                query_type_str = str(query_type).lower()
            
            is_visualization_query = query_type_str == "visualization"
            
            logger.info(f"Query type: {query_type_str}, Is visualization: {is_visualization_query}")
            
            # Handle visualization HTML content - ONLY for visualization queries
            visualization_html = None
            
            if is_visualization_query:
                logger.info("Processing visualization query - checking for HTML content")
                
                # Method 1: Check execution results for file paths
                if execution_data.get("visualization_created") and execution_data.get("file_paths"):
                    for file_path in execution_data.get("file_paths", []):
                        if file_path.endswith('.html'):
                            try:
                                logger.info(f"Attempting to read visualization file: {file_path}")
                                with open(file_path, 'r', encoding='utf-8') as f:
                                    visualization_html = f.read()
                                logger.info(f"Successfully read {len(visualization_html)} characters from {file_path}")
                                break
                            except Exception as e:
                                logger.warning(f"Could not read visualization file {file_path}: {e}")
                
                # Method 2: Check standard plots directory (for all visualization queries)
                if not visualization_html:
                    plots_dir = os.path.abspath('plots')
                    html_file = os.path.join(plots_dir, 'visualization.html')
                    if os.path.exists(html_file):
                        try:
                            with open(html_file, 'r', encoding='utf-8') as f:
                                visualization_html = f.read()
                            logger.info(f"Read visualization HTML from standard location: {len(visualization_html)} characters")
                        except Exception as e:
                            logger.warning(f"Could not read from standard location {html_file}: {e}")
                    else:
                        logger.warning(f"No HTML file found at: {html_file}")
                
                # Method 3: Check if HTML is already in analysis_data
                if not visualization_html and analysis_data.get("visualization_html"):
                    visualization_html = analysis_data["visualization_html"]
                    logger.info(f"Found HTML in analysis data: {len(visualization_html)} characters")
                    
            else:
                logger.info(f"Skipping visualization HTML detection for {query_type_str} query")
            
            # Create database record with the analysis_id (provided or generated)
            db_result = AnalysisResult(
                analysis_id=analysis_id,  # Use the analysis_id as provided/generated
                user_query=user_query,
                success=analysis_data.get("success", False),
                
                # Classification data - with detailed extraction
                query_type=query_type_str,  # Store as string
                classification_reasoning=classification_data.get("reasoning"),
                user_intent=classification_data.get("user_intent"),
                requires_data_filtering=classification_data.get("requires_data_filtering"),
                classification_confidence=classification_data.get("confidence"),
                
                # Code analysis data - with detailed extraction
                query_understanding=analysis_code_data.get("query_understanding"),
                approach=analysis_code_data.get("approach"),
                required_columns=analysis_code_data.get("required_columns", []),
                generated_code=analysis_data.get("generated_code") or analysis_code_data.get("generated_code"),
                expected_output=analysis_code_data.get("expected_output"),
                
                # Execution data - with detailed extraction
                execution_success=execution_data.get("success"),
                execution_output=execution_data.get("output"),
                visualization_created=execution_data.get("visualization_created", False),
                file_paths=execution_data.get("file_paths", []),
                
                # Final results data - with detailed extraction
                final_answer=final_results_data.get("answer"),
                summary=final_results_data.get("summary"),
                visualization_info=final_results_data.get("visualization_info"),
                
                # Visualization HTML content
                visualization_html=visualization_html,
                
                # Metadata
                retry_count=analysis_data.get("retry_count", 0),
                processing_time=processing_time,
                model_used=model_used,
                
                # Foreign keys
                user_id=user_id,
                file_id=file_id,
                completed_at=datetime.now()
            )
            
            # Log what we're saving
            logger.info(f"Saving to DB with analysis_id: {analysis_id}")
            logger.info(f"Generated code length: {len(db_result.generated_code) if db_result.generated_code else 0}")
            logger.info(f"Visualization HTML length: {len(visualization_html) if visualization_html else 0}")
            
            # Add to database session
            db.add(db_result)
            await db.commit()
            await db.refresh(db_result)
            
            logger.info(f"✅ Analysis result saved with analysis_id: {db_result.analysis_id}")
            
            # Verify the ID was saved correctly
            if db_result.analysis_id != analysis_id:
                logger.error(f"❌ CRITICAL: Database saved different ID than expected!")
                logger.error(f"Expected: {analysis_id}")
                logger.error(f"Got: {db_result.analysis_id}")
                # This should never happen, but log it as critical
            
            return db_result
            
        except Exception as save_exception:
            logger.error(f"❌ Failed to save analysis result: {save_exception}")
            log_exception(logger, "Database save exception", save_exception)
            await db.rollback()
            raise save_exception

    @staticmethod
    async def get_analysis_by_analysis_id(
        db: AsyncSession, 
        analysis_id: str
    ) -> Optional[AnalysisResult]:
        """Get analysis result by analysis_id"""
        result = await db.execute(
            select(AnalysisResult).where(AnalysisResult.analysis_id == analysis_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_analysis_history_by_analysis_id(
        db: AsyncSession, 
        user_id: int, 
        limit: int = 50, 
        offset: int = 0
    ) -> list[AnalysisResult]:
        """Get user's analysis history using analysis_id"""
        result = await db.execute(
            select(AnalysisResult)
            .where(AnalysisResult.user_id == user_id)
            .order_by(AnalysisResult.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()

    @staticmethod
    async def run_background_analysis(
        file_id: str,
        user_id: int,
        request: DataAnalysisRequest,
        result_storage: Dict[str, Any],
        task_id: str,
        analysis_id: str = None  # Accept pre-generated analysis_id
    ) -> str:
        """Run analysis in background task with enhanced multi-DataFrame support"""
        
        log_function_entry(logger, "run_background_analysis", 
                          file_id=file_id, user_id=user_id, task_id=task_id, 
                          prompt_length=len(request.prompt) if request.prompt else 0)
        
        start_time = time.time()
        
        if task_id not in result_storage:
            result_storage[task_id] = {"status": "processing", "progress": 0}
        
        try:
            async with get_async_db() as db:
                # Get file with detailed logging
                logger.info(f"🔍 Looking up file_id: {file_id}")
                file_obj = await DataAnalysisService.get_file_by_id(db, file_id)
                if not file_obj:
                    logger.error(f"❌ File not found in database: {file_id}")
                    raise HTTPException(status_code=404, detail="File not found")
                
                logger.info(f"✅ File found: {file_obj.original_filename}, path: {file_obj.file_path}")
                
                # Verify file exists on disk with detailed logging
                if not os.path.exists(file_obj.file_path):
                    logger.error(f"❌ Physical file not found at path: {file_obj.file_path}")
                    logger.error(f"📁 Current working directory: {os.getcwd()}")
                    logger.error(f"📁 Directory contents: {os.listdir('.')}")
                    raise HTTPException(status_code=404, detail="Physical file not found")
                
                # Load data with enhanced logging and error handling
                logger.info(f"📂 Loading data from: {file_obj.file_path}")
                
                try:
                    dfs_list = []  # List of DataFrames
                    dfs_metadata = []  # Metadata for each DataFrame
                    
                    if file_obj.file_type.lower() in ['.xlsx', '.xls']:
                        logger.info("📊 Processing Excel file with skiprows=4 for all sheets")
                        
                        try:
                            # Read all sheets with skiprows=4
                            logger.debug("Reading Excel sheets...")
                            sheets = pd.read_excel(file_obj.file_path, sheet_name=None, skiprows=4)
                            logger.info(f"📋 Found {len(sheets)} sheets: {list(sheets.keys())}")
                            
                            if not sheets:
                                raise Exception("No readable sheets found in Excel file")
                            
                            # Process each sheet as separate DataFrame
                            for sheet_name, sheet_df in sheets.items():
                                try:
                                    logger.info(f"🔄 Processing sheet '{sheet_name}': {sheet_df.shape}")
                                    log_data_info(logger, sheet_df, f"sheet_{sheet_name}")
                                    
                                    # Clean the dataframe with logging
                                    original_shape = sheet_df.shape
                                    logger.debug(f"Original shape: {original_shape}")
                                    
                                    sheet_df = sheet_df.dropna(how='all').dropna(axis=1, how='all')
                                    logger.debug(f"After cleanup shape: {sheet_df.shape}")
                                    
                                    if not sheet_df.empty:
                                        dfs_list.append(sheet_df)
                                        
                                        # Create metadata for this DataFrame
                                        df_metadata = {
                                            "sheet_name": sheet_name,
                                            "sheet_index": len(dfs_list) - 1,
                                            "shape": sheet_df.shape,
                                            "columns": sheet_df.columns.tolist(),
                                            "data_types": {str(col): str(dtype) for col, dtype in sheet_df.dtypes.items()},
                                            "numeric_columns": sheet_df.select_dtypes(include=['number']).columns.tolist(),
                                            "categorical_columns": sheet_df.select_dtypes(include=['object']).columns.tolist(),
                                            "null_counts": sheet_df.isnull().sum().to_dict(),
                                            "memory_usage": int(sheet_df.memory_usage(deep=True).sum()),
                                            "source_file": file_obj.original_filename,
                                            "processing_method": "skiprows_4"
                                        }
                                        dfs_metadata.append(df_metadata)
                                        
                                        logger.info(f"✅ Loaded sheet '{sheet_name}': {sheet_df.shape}")
                                    else:
                                        logger.warning(f"⚠️ Sheet '{sheet_name}' is empty after cleaning")
                                        
                                except Exception as sheet_error:
                                    logger.error(f"❌ Could not load sheet '{sheet_name}'")
                                    log_exception(logger, f"Sheet processing error for {sheet_name}", sheet_error)
                            
                            if not dfs_list:
                                raise Exception("No valid data found in any sheet")
                            
                            # For primary analysis, use the largest DataFrame
                            primary_df = max(dfs_list, key=len)
                            primary_sheet_name = dfs_metadata[dfs_list.index(primary_df)]["sheet_name"]
                            
                            logger.info(f"🎯 Using '{primary_sheet_name}' as primary DataFrame for analysis: {primary_df.shape}")
                            log_data_info(logger, primary_df, "primary_dataframe")
                            
                        except Exception as excel_error:
                            logger.error("❌ Excel file processing failed")
                            log_exception(logger, "Excel processing error", excel_error)
                            raise
                        
                    else:
                        # CSV file processing - single DataFrame in list
                        logger.info("📄 Processing CSV file")
                        
                        try:
                            df = pd.read_csv(file_obj.file_path)
                            logger.info(f"📊 CSV loaded: {df.shape}")
                            log_data_info(logger, df, "csv_dataframe")
                            
                            # Minimal cleanup
                            original_shape = df.shape
                            df = df.dropna(how='all').dropna(axis=1, how='all')
                            logger.info(f"📊 After cleanup: {df.shape} (was {original_shape})")
                            
                            dfs_list = [df]
                            
                            # Create metadata for CSV DataFrame
                            df_metadata = {
                                "sheet_name": "main",
                                "sheet_index": 0,
                                "shape": df.shape,
                                "columns": df.columns.tolist(),
                                "data_types": {str(col): str(dtype) for col, dtype in df.dtypes.items()},
                                "numeric_columns": df.select_dtypes(include=['number']).columns.tolist(),
                                "categorical_columns": df.select_dtypes(include=['object']).columns.tolist(),
                                "null_counts": df.isnull().sum().to_dict(),
                                "memory_usage": int(df.memory_usage(deep=True).sum()),
                                "source_file": file_obj.original_filename,
                                "processing_method": "standard_csv"
                            }
                            dfs_metadata = [df_metadata]
                            
                            primary_df = df
                            primary_sheet_name = "main"
                            
                        except Exception as csv_error:
                            logger.error("❌ CSV file processing failed")
                            log_exception(logger, "CSV processing error", csv_error)
                            raise
                    
                    logger.info(f"✅ Data loaded successfully. Total DataFrames: {len(dfs_list)}, Primary DataFrame shape: {primary_df.shape}")
                    logger.debug(f"DataFrames metadata: {[meta['sheet_name'] for meta in dfs_metadata]}")
                    
                except Exception as file_load_error:
                    logger.error(f"❌ Failed to load file {file_obj.file_path}")
                    log_exception(logger, "File loading error", file_load_error)
                    raise HTTPException(status_code=400, detail=f"Failed to load file: {str(file_load_error)}")
                
                result_storage[task_id]["progress"] = 25
                
                # Run analysis with enhanced logging
                logger.info(f"🤖 Starting AI workflow analysis with primary DataFrame...")
                analysis_start_time = time.time()
                
                if not request.prompt or len(request.prompt.strip()) < 10:
                    logger.error(f"❌ Invalid prompt: '{request.prompt}' (length: {len(request.prompt) if request.prompt else 0})")
                    raise HTTPException(status_code=400, detail="Prompt is too short or empty")
                
                # Enhanced prompt with DataFrames information
                try:
                    enhanced_prompt = f"""
{request.prompt}

AVAILABLE DATAFRAMES INFORMATION:
- Total DataFrames: {len(dfs_list)}
- Primary DataFrame: '{primary_sheet_name}' (Shape: {primary_df.shape})
"""
                    if len(dfs_list) > 1:
                        enhanced_prompt += "\n- Additional DataFrames available:\n"
                        for i, meta in enumerate(dfs_metadata):
                            if meta['sheet_name'] != primary_sheet_name:
                                enhanced_prompt += f"  * '{meta['sheet_name']}' (Shape: {meta['shape']}, Columns: {len(meta['columns'])})\n"
                    
                    logger.info(f"📝 Enhanced prompt length: {len(enhanced_prompt)} characters")
                    logger.debug(f"Enhanced prompt preview: {enhanced_prompt[:200]}...")
                    
                    # Run analysis
                    analysis_result = await asyncio.get_event_loop().run_in_executor(
                        None, run_analysis, primary_df, enhanced_prompt, request.model
                    )
                    
                    analysis_duration = time.time() - analysis_start_time
                    logger.info(f"✅ AI workflow completed in {analysis_duration:.2f} seconds")
                    
                except Exception as workflow_error:
                    logger.error("❌ AI workflow execution failed")
                    log_exception(logger, "AI workflow error", workflow_error)
                    raise HTTPException(status_code=500, detail=f"AI workflow failed: {str(workflow_error)}")
                
                processing_time = time.time() - start_time
                logger.info(f"⏱️ Total analysis completed in {processing_time:.2f} seconds")
                
                result_storage[task_id]["progress"] = 75
                
                # Determine overall success with detailed logging
                overall_success = False
                if isinstance(analysis_result, dict):
                    main_success = analysis_result.get("success", False)
                    has_classification = bool(analysis_result.get("classification"))
                    has_code = bool(analysis_result.get("generated_code"))
                    has_execution = bool(analysis_result.get("execution"))
                    
                    overall_success = main_success or has_classification or has_code or has_execution
                    
                    logger.info(f"📊 Success Analysis:")
                    logger.info(f"  Main success: {main_success}")
                    logger.info(f"  Has classification: {has_classification}")
                    logger.info(f"  Has code: {has_code}")
                    logger.info(f"  Has execution: {has_execution}")
                    logger.info(f"  Overall success: {overall_success}")
                
                # Save to database with enhanced error handling
                try:
                    logger.info("💾 Saving analysis result to database...")
                    db_result = await DataAnalysisService.save_analysis_result(
                        db, user_id, file_obj.id, request.prompt, 
                        analysis_result, processing_time, request.model,
                        analysis_id  # Pass the analysis_id
                    )
                    logger.info(f"✅ Analysis saved with ID: {db_result.analysis_id}")
                    
                    result_storage[task_id] = {
                        "status": "completed",
                        "progress": 100,
                        "result": analysis_result,
                        "analysis_id": db_result.analysis_id,
                        "database_id": db_result.id,
                        "task_id": task_id,
                        "success": overall_success,
                        "file_info": {
                            "file_id": file_id,
                            "filename": file_obj.original_filename,
                            "file_path": file_obj.file_path,
                            "total_dataframes": len(dfs_list),
                            "dataframes_metadata": dfs_metadata,
                            "primary_dataframe": {
                                "sheet_name": primary_sheet_name,
                                "shape": primary_df.shape,
                                "columns": primary_df.columns.tolist()
                            },
                            "processing_method": "multi_dataframes_excel" if file_obj.file_type.lower() in ['.xlsx', '.xls'] else "single_dataframe_csv"
                        }
                    }
                    
                    total_duration = time.time() - start_time
                    log_function_exit(logger, "run_background_analysis", 
                                    result=f"success={overall_success}, analysis_id={db_result.analysis_id}", 
                                    duration=total_duration)
                    
                except Exception as save_error:
                    logger.error("❌ Failed to save to database")
                    log_exception(logger, "Database save error", save_error)
                    
                    result_storage[task_id] = {
                        "status": "completed",
                        "progress": 100,
                        "result": analysis_result,
                        "analysis_id": None,
                        "database_id": None,
                        "task_id": task_id,
                        "success": overall_success,
                        "save_error": str(save_error),
                        "file_info": {
                            "file_id": file_id,
                            "filename": file_obj.original_filename,
                            "file_path": file_obj.file_path,
                            "total_dataframes": len(dfs_list),
                            "dataframes_metadata": dfs_metadata
                        }
                    }
            
        except Exception as e:
            logger.error("❌ Background analysis failed")
            log_exception(logger, "Background analysis error", e)
            
            result_storage[task_id] = {
                "status": "failed",
                "progress": 0,
                "error": str(e),
                "task_id": task_id,
                "success": False
            }
        
        return task_id

    @staticmethod
    async def get_user_analysis_history(
        db: AsyncSession, 
        user_id: int, 
        limit: int = 50, 
        offset: int = 0
    ) -> list[AnalysisResult]:
        """Get user's analysis history"""
        result = await db.execute(
            select(AnalysisResult)
            .where(AnalysisResult.user_id == user_id)
            .order_by(AnalysisResult.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()
        
        return task_id

    @staticmethod
    async def get_user_analysis_history(
        db: AsyncSession, 
        user_id: int, 
        limit: int = 50, 
        offset: int = 0
    ) -> list[AnalysisResult]:
        """Get user's analysis history"""
        result = await db.execute(
            select(AnalysisResult)
            .where(AnalysisResult.user_id == user_id)
            .order_by(AnalysisResult.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()
