import asyncio
import os
import uuid
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.database import UploadedFile, User, AnalysisResult
from models.data_analysis import DataAnalysisRequest, ChartGenerationResponse
from services.auth import get_current_active_user
from services.data_analysis import DataAnalysisService
from core.database import get_async_db, get_async_db_dependency
from core.logger import logger, log_exception

router = APIRouter(prefix="/analysis", tags=["Data Analysis"])

# In-memory storage for background task results
# In production, use Redis or similar
analysis_results: Dict[str, Any] = {}

@router.post("/analyze/{file_id}", response_model=Dict[str, str])
async def start_analysis(
    file_id: str,
    request: DataAnalysisRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Start background data analysis task"""
    
    try:
        logger.info(f"Received analysis request for file_id: {file_id}")
        logger.debug(f"Request details: {request.model_dump()}")
        
        # Use default user_id = 1 for now
        default_user_id = 1
        
        # Validate file exists (removed user restriction)
        logger.debug(f"Validating file existence: {file_id}")
        result = await db.execute(
            select(UploadedFile).where(UploadedFile.file_id == file_id)
        )
        file_obj = result.scalar_one_or_none()
        
        if not file_obj:
            logger.warning(f"File not found: {file_id}")
            raise HTTPException(status_code=404, detail="File not found")
        
        logger.info(f"File validated: {file_obj.original_filename}")
        
        # Generate a task_id upfront
        task_id = str(uuid.uuid4())
        logger.info(f"Generated task_id: {task_id}")
        
        # Initialize the task in storage immediately
        analysis_results[task_id] = {
            "status": "processing", 
            "progress": 0,
            "task_id": task_id,
            "file_id": file_id,
            "user_id": default_user_id
        }
        
        # Start the background task with the specific task_id
        background_tasks.add_task(
            DataAnalysisService.run_background_analysis,
            file_id,
            default_user_id,
            request,
            analysis_results,
            task_id  # Pass the task_id to use
        )
        
        logger.info(f"Analysis task {task_id} started successfully")
        
        return {
            "task_id": task_id,
            "status": "started",
            "message": "Analysis started in background"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        log_exception(logger, "Failed to start analysis")
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
        
        return status_info
        
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
    
    logger.debug(f"Fetching result for task_id: {task_id}")
    
    if task_id not in analysis_results:
        logger.warning(f"Task not found in analysis_results: {task_id}")
        logger.debug(f"Available task_ids: {list(analysis_results.keys())}")
        raise HTTPException(status_code=404, detail="Task not found")
    
    result = analysis_results[task_id]
    logger.debug(f"Task result status: {result.get('status')}")
    
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
    
    logger.debug(f"Analysis data type: {type(analysis_data)}")
    logger.debug(f"Analysis data keys: {analysis_data.keys() if isinstance(analysis_data, dict) else 'Not a dict'}")
    
    # Convert Pydantic objects to dictionaries for safe access
    def safe_extract(obj):
        """Safely extract data from Pydantic objects or dicts"""
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
    
    logger.debug(f"Extracted dicts - classification: {bool(classification_dict)}, analysis: {bool(analysis_dict)}, execution: {bool(execution_dict)}, final_results: {bool(final_results_dict)}")
    
    # Extract summary from final results
    summary = final_results_dict.get("summary") if final_results_dict else None
    
    # Determine success status from multiple sources
    analysis_success = False
    if isinstance(analysis_data, dict):
        # Check various success indicators
        final_results_success = final_results_dict.get("success", False) if final_results_dict else False
        execution_success = execution_dict.get("success", False) if execution_dict else False
        has_code = bool(analysis_data.get("generated_code"))
        
        analysis_success = (
            analysis_data.get("success", False) or 
            final_results_success or
            execution_success or
            has_code  # Consider successful if we have generated code
        )
    
    logger.info(f"Returning analysis result for task {task_id}, success: {analysis_success}")
    logger.debug(f"Success determination: main={analysis_data.get('success')}, final={final_results_success}, execution={execution_success}, has_code={bool(analysis_data.get('generated_code'))}")
    
    # ENHANCED: Extract visualization HTML content with multiple fallback methods
    chart_html = None
    
    # Method 1: Check if HTML is directly stored in analysis data
    chart_html = analysis_data.get("visualization_html")
    
    # Method 2: Check database for saved visualization HTML
    if not chart_html and result.get("analysis_id"):
        try:
            async with get_async_db() as db:
                db_result = await db.execute(
                    select(AnalysisResult).where(AnalysisResult.id == result["analysis_id"])
                )
                analysis_record = db_result.scalar_one_or_none()
                if analysis_record and analysis_record.visualization_html:
                    chart_html = analysis_record.visualization_html
                    logger.info(f"Loaded HTML from database for analysis {result['analysis_id']}")
        except Exception as e:
            logger.warning(f"Could not load HTML from database: {e}")
    
    # Method 3: Check if there are HTML files created
    if not chart_html and execution_dict:
        file_paths = execution_dict.get("file_paths", [])
        for file_path in file_paths:
            if file_path.endswith('.html'):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        chart_html = f.read()
                    logger.info(f"Loaded HTML content from {file_path}")
                    break
                except Exception as e:
                    logger.warning(f"Could not read HTML file {file_path}: {e}")
    
    # Method 4: Check standard plots directory
    if not chart_html:
        plots_dir = os.path.abspath('plots')
        html_file = os.path.join(plots_dir, 'visualization.html')
        if os.path.exists(html_file):
            try:
                with open(html_file, 'r', encoding='utf-8') as f:
                    chart_html = f.read()
                logger.info(f"Loaded HTML from standard location: {html_file}")
            except Exception as e:
                logger.warning(f"Could not read HTML from standard location: {e}")
    
    # Log visualization status
    logger.info(f"Visualization HTML found: {bool(chart_html)}")
    if chart_html:
        logger.debug(f"HTML content length: {len(chart_html)}")
    
    # Build comprehensive response
    response = ChartGenerationResponse(
        success=analysis_success,
        chart_base64=None,  # You can add base64 encoding for charts
        chart_html=chart_html,
        insights=[],  # Empty list since we removed key_insights
        generated_code=analysis_data.get("generated_code"),
        analysis_summary=summary,
        query_analysis=classification_dict if classification_dict else None,
        data_analysis=analysis_dict if analysis_dict else None,
        execution_result=execution_dict if execution_dict else None,
        error_message=None if analysis_success else analysis_data.get("error", "Analysis completed but with issues")
    )
    
    # Log the response for debugging
    logger.debug(f"Response for task {task_id}: success={response.success}, has_code={bool(response.generated_code)}, has_html={bool(response.chart_html)}")
    
    return response

@router.get("/history", response_model=List[Dict[str, Any]])
async def get_analysis_history(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get analysis history"""
    
    # Get all analysis results (removed user restriction)
    result = await db.execute(
        select(AnalysisResult)
        .order_by(AnalysisResult.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    results = result.scalars().all()
    
    return [
        {
            "id": result.id,
            "user_query": result.user_query,
            "success": result.success,
            "query_type": result.query_type,
            "processing_time": result.processing_time,
            "model_used": result.model_used,
            "created_at": result.created_at,
            "visualization_created": result.visualization_created,
            "final_answer": result.final_answer,
            "summary": result.summary
        }
        for result in results
    ]

@router.get("/result/db/{analysis_id}")
async def get_saved_analysis_result(
    analysis_id: int,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get analysis result from database"""
    
    result = await db.execute(
        select(AnalysisResult).where(AnalysisResult.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return {
        "id": analysis.id,
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
        "visualization_html": analysis.visualization_html,  # Include HTML content
        "retry_count": analysis.retry_count,
        "processing_time": analysis.processing_time,
        "model_used": analysis.model_used,
        "created_at": analysis.created_at
    }

@router.get("/visualization/{analysis_id}")
async def get_visualization_html(
    analysis_id: int,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get visualization HTML content for rendering"""
    
    result = await db.execute(
        select(AnalysisResult).where(AnalysisResult.id == analysis_id)
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
    """Debug endpoint to see all tasks (remove in production)"""
    return {
        "total_tasks": len(analysis_results),
        "tasks": {
            task_id: {
                "status": task_data.get("status"),
                "progress": task_data.get("progress"),
                "has_result": "result" in task_data,
                "result_type": type(task_data.get("result")).__name__ if "result" in task_data else None,
                "success": task_data.get("success"),
                "keys": list(task_data.keys())
            }
            for task_id, task_data in analysis_results.items()
        }
    }
