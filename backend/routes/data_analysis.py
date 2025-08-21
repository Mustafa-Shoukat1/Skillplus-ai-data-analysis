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
from models.data_analysis import AnalysisResponse
from services.auth import get_current_active_user
from services.data_analysis import DataAnalysisService
from core.database import get_async_db, get_async_db_dependency
from core.logger import logger, log_exception, log_function_entry, log_function_exit
from pydantic import BaseModel
from typing import Optional

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
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Start data analysis in the background and immediately return task identifiers"""
    
    try:
        logger.info(f"🎯 Received analysis request for file_id: {file_id}")
        
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
        
        # Validate file exists with enhanced logging and debugging
        logger.debug(f"🔍 Validating file existence: {file_id}")
        result = await db.execute(
            select(UploadedFile).where(UploadedFile.file_id == file_id)
        )
        file_obj = result.scalar_one_or_none()
        
        if not file_obj:
            # Enhanced debugging - list all available files
            logger.error(f"❌ File not found in database: {file_id}")
            debug_result = await db.execute(select(UploadedFile))
            all_files = debug_result.scalars().all()
            available_files = [f.file_id for f in all_files]
            logger.error(f"Available file_ids in database: {available_files}")
            
            raise HTTPException(
                status_code=404, 
                detail=f"File not found: {file_id}. Available files: {available_files[:5]}"
            )
        
        logger.info(f"✅ File validated: {file_obj.original_filename}")
        
        # Initialize task entry
        analysis_results[task_id] = {
            "status": "processing",
            "progress": 0,
            "task_id": task_id,
            "file_id": file_id,
            "user_id": default_user_id,
            "analysis_id": analysis_id,

        }

        # Queue the background task with the request prompt
        background_tasks.add_task(
            DataAnalysisService.run_background_analysis,
            file_id,
            default_user_id,
            analysis_results,
            task_id,
            analysis_id,
        )
        
        # Log the successful task creation
        logger.info(f"🚀 Background task queued successfully - task_id: {task_id}, analysis_id: {analysis_id}")
        
        # Respond immediately so API does not block
        response_data = {
            "success": True,
            "message": "Analysis started",
            "task_id": task_id,
            "analysis_id": analysis_id,

        }
        
        logger.info(f"📤 Returning response: {response_data}")
        
        return JSONResponse(
            status_code=status.HTTP_202_ACCEPTED,
            content=response_data
        )
        
    except HTTPException as http_error:
        logger.error(f"❌ HTTP Exception in start_analysis: {http_error.detail}")
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error in start_analysis: {str(e)}")
        
        # Update task status on error if task_id was created
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
            detail=f"Failed to start analysis: {str(e)}"
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

@router.get("/result/{task_id}", response_model=AnalysisResponse)
async def get_analysis_result(task_id: str):
    """Get completed analysis result from custom workflow"""
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
    
    # Extract analysis data from custom workflow
    analysis_data = result.get("result")
    dashboard_results = result.get("dashboard_results", {})
    
    if not analysis_data:
        logger.error(f"No analysis data found for task {task_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Analysis data missing"
        )
    
    logger.info(f"Processing custom workflow result for task {task_id}")
    
    # Convert dashboard results to compatible format
    response_df = []
    if dashboard_results.get("executive_overview"):
        exec_data = dashboard_results["executive_overview"]
        response_df.append({
            "analysis_type": "executive",
            "total_employees": exec_data.get("total_employees", 0),
            "average_performance": exec_data.get("average_performance", 0),
            "top_department": exec_data.get("top_performing_department", "N/A")
        })
    
    return AnalysisResponse(
        success=True,
        task_id=task_id,
        analysis_id=result.get("analysis_id"),
        dashboard_data=dashboard_results
    )

# Add new endpoint for getting full dashboard results
@router.get("/dashboard/{task_id}")
async def get_dashboard_result(task_id: str):
    """Get full dashboard analysis results"""
    if task_id not in analysis_results:
        raise HTTPException(status_code=404, detail="Task not found")
    
    result = analysis_results[task_id]
    
    if result["status"] != "completed":
        raise HTTPException(status_code=202, detail="Analysis still in progress")
    
    dashboard_results = result.get("dashboard_results", {})
    
    return {
        "success": True,
        "task_id": task_id,
        "analysis_id": result.get("analysis_id"),
        "dashboard_data": dashboard_results
    }


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


@router.get("/dashboard/active")
async def get_active_dashboard_analysis(db: AsyncSession = Depends(get_async_db_dependency)):
    """
    Return the most recent active dashboard analysis metadata (analysis_id, created_at).
    Frontend (viewer) can use the returned analysis_id to fetch full result from:
      GET /api/analysis/result/db/{analysis_id}
    """
    try:
        result = await db.execute(
            select(AnalysisResult)
            .where(AnalysisResult.analysis_type == "dashboard", AnalysisResult.is_active == True)
            .order_by(AnalysisResult.created_at.desc())
            .limit(1)
        )
        analysis = result.scalar_one_or_none()
        if not analysis:
            return {"success": True, "data": None, "message": "No active dashboard analysis found"}
        return {
            "success": True,
            "data": {
                "analysis_id": analysis.analysis_id,
                "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
                "is_active": bool(analysis.is_active),
                "database_id": analysis.id
            }
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/result/db/{analysis_id}")
async def get_analysis_result_db(analysis_id: str, db: AsyncSession = Depends(get_async_db_dependency)):
    """
    Fetch full analysis result stored in analysis_results.dashboard_results by analysis_id.
    Returns success:false when not found.
    """
    try:
        analysis = await DataAnalysisService.get_analysis_by_analysis_id(db, analysis_id)
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        # Return stored dashboard_results and some metadata
        return {
            "success": True,
            "data": {
                "analysis_id": analysis.analysis_id,
                "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
                "is_active": bool(analysis.is_active),
                "database_id": analysis.id,
                "dashboard_results": analysis.dashboard_results or {}
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))