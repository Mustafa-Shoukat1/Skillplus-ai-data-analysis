import asyncio
import os
import uuid
import time
import pandas as pd
import json
from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from models.database import UploadedFile, User, AnalysisResult, AnalysisType
from models.data_analysis import DataAnalysisRequest, MinimalAnalysisResponse
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
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Start data analysis in the background and immediately return task identifiers"""
    
    log_function_entry(logger, "start_analysis", file_id=file_id, 
                      prompt_length=len(request.prompt) if request.prompt else 0,
                      graph_type=request.graph_type,
                      sheet=request.sheet,
                      echart_sample_code=request.echart_sample_code
                      )
    
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
        
        # Validate file exists with enhanced logging but avoid heavy IO here
        logger.debug(f"🔍 Validating file existence: {file_id}")
        result = await db.execute(
            select(UploadedFile).where(UploadedFile.file_id == file_id)
        )
        file_obj = result.scalar_one_or_none()
        if not file_obj:
            logger.warning(f"❌ File not found in database: {file_id}")
            raise HTTPException(status_code=404, detail="File not found")
        
        logger.info(f"✅ File validated: {file_obj.original_filename}")
        
        # Initialize task entry
        analysis_results[task_id] = {
            "status": "processing",
            "progress": 0,
            "task_id": task_id,
            "file_id": file_id,
            "user_id": default_user_id,
            "analysis_id": analysis_id
        }

        # Queue the background task
        background_tasks.add_task(
            DataAnalysisService.run_background_analysis,
            file_id,
            default_user_id,
            request,
            analysis_results,
            task_id,
            analysis_id,
        )
        
        # If analysis_type is provided, save it to the analysis_types table
        if hasattr(request, 'analysis_type') and request.analysis_type:
            try:
                analysis_type_record = AnalysisType(
                    analysis_id=analysis_id,
                    user_id=default_user_id,
                    analysis_type=request.analysis_type,
                    is_active=True
                )
                db.add(analysis_type_record)
                await db.commit()
                logger.info(f"✅ Saved analysis type: {request.analysis_type} for analysis: {analysis_id}")
            except Exception as e:
                logger.warning(f"⚠️ Failed to save analysis type: {e}")
                # Don't fail the entire request if this fails

        # Respond immediately so API does not block
        return JSONResponse(
            status_code=status.HTTP_202_ACCEPTED,
            content={
                "success": True,
                "message": "Analysis started",
                "task_id": task_id,
                "analysis_id": analysis_id
            }
        )
        
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

@router.get("/result/{task_id}", response_model=MinimalAnalysisResponse)
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

    # Extract summary - try multiple source
    
    # Determine success status
    analysis_success = False
    if isinstance(analysis_data, dict):
        final_results_success = final_results_dict.get("success", False) if final_results_dict else False
        execution_success = execution_dict.get("success", False) if execution_dict else False
       
        
        analysis_success = (
            analysis_data.get("success", False) or 
            final_results_success or
            execution_success 
     
        )
    
    logger.info(f"Analysis success determined: {analysis_success}")
    
    # Get visualization HTML with enhanced fallback

    # Prepare AgentState-like additions
    echart_code = analysis_data.get("echart_code")
    designed_echart_code = analysis_data.get("designed_echart_code")

    # Build minimal response as requested
    response_df = analysis_data.get("response_df")
    # Normalize response_df to always be a list of dicts
    if isinstance(response_df, dict):
        import pandas as pd
        response_df = pd.DataFrame(response_df).to_dict('records')
    elif hasattr(response_df, 'to_dict'):
        response_df = response_df.to_dict('records')
    elif not isinstance(response_df, list):
        response_df = []

    minimal_response = {
        "query": analysis_data.get("query")
                  or analysis_dict.get("query_understanding")
                  or "",
        "echart_code": echart_code,
        "designed_echart_code": designed_echart_code,
        "response_df": response_df
    }

    logger.info(f"Returning result for task {task_id}: success={analysis_success}")

    return minimal_response

@router.patch("/visibility/{analysis_id}")
async def toggle_analysis_visibility(
    analysis_id: str,
    visibility_data: dict,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Toggle analysis visibility for viewers using is_active field in both tables"""
    try:
        is_active = visibility_data.get("is_active", True)
        logger.info(f"Toggling analysis {analysis_id} is_active to: {is_active}")
        
        # Update AnalysisResult table
        result1 = await db.execute(
            update(AnalysisResult)
            .where(AnalysisResult.analysis_id == analysis_id)
            .values(is_active=is_active)
        )
        
        # Update AnalysisType table if it exists
        result2 = await db.execute(
            update(AnalysisType)
            .where(AnalysisType.analysis_id == analysis_id)
            .values(is_active=is_active)
        )
        
        if result1.rowcount == 0:
            logger.warning(f"Analysis not found: {analysis_id}")
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        await db.commit()
        logger.info(f"Analysis {analysis_id} is_active updated to: {is_active} (AnalysisResult: {result1.rowcount}, AnalysisType: {result2.rowcount})")
        
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
        raise HTTPException(status_code=500, detail="Failed to update visibility")

@router.get("/active")
async def get_active_analyses(
    analysis_type: str = None,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get all active analyses visible to viewers, optionally filtered by analysis type"""
    try:
        if analysis_type:
            # Join with analysis_types table to filter by analysis type
            query = select(AnalysisResult, AnalysisType).join(
                AnalysisType, AnalysisResult.analysis_id == AnalysisType.analysis_id
            ).where(
                AnalysisResult.is_active == True,
                AnalysisType.is_active == True,
                AnalysisType.analysis_type == analysis_type
            )
        else:
            # Get all active analyses
            query = select(AnalysisResult).where(AnalysisResult.is_active == True)
        
        query = query.order_by(AnalysisResult.created_at.desc())
        result = await db.execute(query)
        
        active_analyses = []
        if analysis_type:
            # Handle joined results
            for analysis_result, analysis_type_obj in result:
                analysis_dict = {
                    "analysis_id": analysis_result.analysis_id,
                    "query": analysis_result.query,
                    "echart_code": analysis_result.echart_code,
                    "designed_echart_code": analysis_result.designed_echart_code,
                    "response_df": analysis_result.response_df,
                    "created_at": analysis_result.created_at.isoformat() if analysis_result.created_at else None,
                    "is_active": analysis_result.is_active,
                    "analysis_type": analysis_type_obj.analysis_type
                }
                active_analyses.append(analysis_dict)
        else:
            # Handle single table results
            analyses = result.scalars().all()
            for analysis in analyses:
                # Try to get analysis type from analysis_types table
                type_query = select(AnalysisType).where(
                    AnalysisType.analysis_id == analysis.analysis_id,
                    AnalysisType.is_active == True
                )
                type_result = await db.execute(type_query)
                analysis_type_obj = type_result.scalar_one_or_none()
                
                detected_type = analysis_type_obj.analysis_type if analysis_type_obj else "general"
                
                analysis_dict = {
                    "analysis_id": analysis.analysis_id,
                    "query": analysis.query,
                    "echart_code": analysis.echart_code,
                    "designed_echart_code": analysis.designed_echart_code,
                    "response_df": analysis.response_df,
                    "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
                    "is_active": analysis.is_active,
                    "analysis_type": detected_type
                }
                active_analyses.append(analysis_dict)
        
        logger.info(f"Retrieved {len(active_analyses)} active analyses" + (f" for type '{analysis_type}'" if analysis_type else ""))
        
        return {
            "success": True,
            "data": active_analyses,
            "count": len(active_analyses),
            "analysis_type": analysis_type
        }
        
    except Exception as e:
        logger.error(f"Error fetching active analyses: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch active analyses")

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
        
        history = []
        for analysis in analyses:
            analysis_dict = {
                "analysis_id": analysis.analysis_id,
                "query": analysis.query,
                "echart_code": analysis.echart_code,
                "designed_echart_code": analysis.designed_echart_code,
                "response_df": analysis.response_df,
                "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
                "is_active": analysis.is_active
            }
            history.append(analysis_dict)
        
        return {
            "success": True,
            "data": history,
            "count": len(history)
        }
        
    except Exception as e:
        logger.error(f"Error fetching analysis history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch analysis history")

@router.get("/result/db/{analysis_id}")
async def get_saved_analysis_result(
    analysis_id: str,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get minimal analysis result from database by analysis_id"""
    
    result = await db.execute(
        select(AnalysisResult).where(AnalysisResult.analysis_id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return {
        "query": analysis.query or "",
        "echart_code": analysis.echart_code,
        "designed_echart_code": analysis.designed_echart_code,
        "response_df": analysis.response_df or [],
    }

@router.get("/visualization/{analysis_id}")
async def get_visualization_html(
    analysis_id: str,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get visualization HTML content for rendering by analysis_id"""
    
    result = await db.execute(
        select(AnalysisResult).where(AnalysisResult.analysis_id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    if not analysis.echart_code and not analysis.designed_echart_code:
        raise HTTPException(status_code=404, detail="No visualization available for this analysis")
    
    # Generate HTML from echart_code
    echart_code = analysis.designed_echart_code or analysis.echart_code
    if echart_code:
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
        </head>
        <body>
            <div id="chart" style="width: 100%; height: 400px;"></div>
            <script>
                var chartDom = document.getElementById('chart');
                var myChart = echarts.init(chartDom);
                {echart_code}
                myChart.setOption(option);
            </script>
        </body>
        </html>
        """
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=html_content)
    else:
        raise HTTPException(status_code=404, detail="No visualization code available")

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

@router.get("/graph-types")
async def get_available_graph_types():
    """Get available graph types for visualization"""
    try:
        graph_types = [
            {"value": "bar", "name": "Bar Chart", "description": "Compare values across categories"},
            {"value": "line", "name": "Line Chart", "description": "Show trends over time"},
            {"value": "pie", "name": "Pie Chart", "description": "Show proportions of a whole"},
            {"value": "scatter", "name": "Scatter Plot", "description": "Show correlation between variables"},
            {"value": "area", "name": "Area Chart", "description": "Show cumulative values over time"},
            {"value": "histogram", "name": "Histogram", "description": "Show distribution of values"},
            {"value": "box", "name": "Box Plot", "description": "Show statistical distribution"},
            {"value": "heatmap", "name": "Heat Map", "description": "Show data density or correlation"},
            {"value": "radar", "name": "Radar Chart", "description": "Compare multiple variables"},
            {"value": "bubble", "name": "Bubble Chart", "description": "Three-dimensional scatter plot"}
        ]
        
        return {
            "success": True,
            "data": {
                "graph_types": graph_types,
                "total_types": len(graph_types)
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting graph types: {e}")
        raise HTTPException(status_code=500, detail="Failed to get graph types")