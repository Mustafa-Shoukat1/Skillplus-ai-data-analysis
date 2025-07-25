import asyncio
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from models.templates import (
    AITemplateCreate, AITemplateUpdate, AITemplateResponse, 
    TemplateUsageStats, BulkAnalysisRequest, BulkAnalysisResponse
)
from models.data_analysis import DataAnalysisRequest
from services.template_service import TemplateService
from services.data_analysis import DataAnalysisService
from core.database import get_async_db_dependency
from core.logger import logger

router = APIRouter(prefix="/templates", tags=["AI Templates"])

# For bulk analysis results - same storage as regular analysis
from routes.data_analysis import analysis_results

@router.post("/", response_model=AITemplateResponse)
async def create_template(
    template_data: AITemplateCreate,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Create a new AI template"""
    
    # Using default user_id = 1 for now (can be changed when auth is integrated)
    default_user_id = 1
    
    try:
        template = await TemplateService.create_template(db, template_data, default_user_id)
        return AITemplateResponse.from_orm(template)
    except Exception as e:
        logger.error(f"Failed to create template: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create template"
        )

@router.get("/", response_model=List[AITemplateResponse])
async def get_templates(
    include_defaults: bool = True,
    category: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get all templates for the user"""
    
    default_user_id = 1
    
    try:
        templates = await TemplateService.get_user_templates(
            db, default_user_id, include_defaults, category, is_active
        )
        return [AITemplateResponse.from_orm(template) for template in templates]
    except Exception as e:
        logger.error(f"Failed to get templates: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get templates"
        )

@router.get("/categories", response_model=List[str])
async def get_template_categories(
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get all unique template categories"""
    
    default_user_id = 1
    
    try:
        categories = await TemplateService.get_template_categories(db, default_user_id)
        return categories
    except Exception as e:
        logger.error(f"Failed to get categories: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get categories"
        )

@router.get("/{template_id}", response_model=AITemplateResponse)
async def get_template(
    template_id: int,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get a specific template by ID"""
    
    default_user_id = 1
    
    template = await TemplateService.get_template_by_id(db, template_id, default_user_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return AITemplateResponse.from_orm(template)

@router.put("/{template_id}", response_model=AITemplateResponse)
async def update_template(
    template_id: int,
    template_data: AITemplateUpdate,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Update a template"""
    
    default_user_id = 1
    
    template = await TemplateService.update_template(db, template_id, template_data, default_user_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found or you don't have permission to edit it"
        )
    
    return AITemplateResponse.from_orm(template)

@router.delete("/{template_id}")
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Delete a template"""
    
    default_user_id = 1
    
    success = await TemplateService.delete_template(db, template_id, default_user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found or you don't have permission to delete it"
        )
    
    return {"message": "Template deleted successfully"}

@router.post("/bulk-analyze", response_model=BulkAnalysisResponse)
async def bulk_analyze_with_templates(
    request: BulkAnalysisRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Run analysis with multiple templates"""
    
    default_user_id = 1
    
    try:
        # Validate templates exist
        task_ids = []
        valid_templates = []
        
        for template_id in request.template_ids:
            template = await TemplateService.get_template_by_id(db, template_id, default_user_id)
            if template:
                valid_templates.append(template)
            else:
                logger.warning(f"Template {template_id} not found, skipping")
        
        if not valid_templates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid templates found"
            )
        
        # Start analysis for each template
        for template in valid_templates:
            # Create analysis request
            analysis_request = DataAnalysisRequest(
                prompt=template.prompt,
                model=request.model,
                enable_code_review=request.enable_code_review
            )
            
            # Generate task ID
            task_id = str(uuid.uuid4())
            task_ids.append(task_id)
            
            # Initialize task storage
            analysis_results[task_id] = {
                "status": "processing",
                "progress": 0,
                "task_id": task_id,
                "template_id": template.id,
                "template_title": template.title,
                "file_id": request.file_id,
                "user_id": default_user_id
            }
            
            # Start background task
            background_tasks.add_task(
                DataAnalysisService.run_background_analysis,
                request.file_id,
                default_user_id,
                analysis_request,
                analysis_results,
                task_id
            )
            
            # Increment usage count
            await TemplateService.increment_usage_count(db, template.id)
        
        estimated_time = len(valid_templates) * 30  # 30 seconds per template
        
        logger.info(f"Started bulk analysis with {len(valid_templates)} templates")
        
        return BulkAnalysisResponse(
            success=True,
            total_templates=len(valid_templates),
            task_ids=task_ids,
            estimated_completion_time=estimated_time,
            message=f"Analysis started for {len(valid_templates)} templates"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bulk analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start bulk analysis"
        )

@router.get("/stats/usage", response_model=List[TemplateUsageStats])
async def get_template_usage_stats(
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get template usage statistics"""
    
    default_user_id = 1
    
    try:
        templates = await TemplateService.get_user_templates(db, default_user_id)
        
        stats = []
        for template in templates:
            stats.append(TemplateUsageStats(
                template_id=template.id,
                title=template.title,
                usage_count=template.usage_count,
                last_used=None,  # You can calculate this from analysis_results if needed
                success_rate=0.0  # You can calculate this from analysis_results if needed
            ))
        
        return stats
    except Exception as e:
        logger.error(f"Failed to get usage stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get usage statistics"
        )
