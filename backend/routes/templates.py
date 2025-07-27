import asyncio
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from services.data_analysis import DataAnalysisService
from services.template_service import TemplateService
from models.database import AITemplate
from models.templates import (
    AITemplateCreate, AITemplateUpdate, AITemplateResponse, 
    TemplateUsageStats, BulkAnalysisRequest, BulkAnalysisResponse
)
from models.data_analysis import DataAnalysisRequest
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
    """Create new AI template"""
    try:
        logger.info(f"Creating new template: {template_data.title}")
        
        # Use default user_id = 1 for now
        default_user_id = 1
        
        # Create template with correct field name
        db_template = AITemplate(
            title=template_data.title,
            description=template_data.description,
            prompt=template_data.prompt,
            category=template_data.category,
            icon=template_data.icon,
            color_scheme=template_data.color_scheme,
            created_by=default_user_id  # Use created_by in database
        )
        
        db.add(db_template)
        await db.commit()
        await db.refresh(db_template)
        
        logger.info(f"Template created successfully: {db_template.id}")
        
        return AITemplateResponse(
            id=db_template.id,
            title=db_template.title,
            description=db_template.description,
            prompt=db_template.prompt,
            category=db_template.category,
            icon=db_template.icon,
            color_scheme=db_template.color_scheme,
            is_default=db_template.is_default,
            is_active=db_template.is_active,
            usage_count=db_template.usage_count,
            created_at=db_template.created_at,
            user_id=db_template.created_by  # Map created_by to user_id in response
        )
        
    except Exception as e:
        logger.error(f"Failed to create template: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create template: {str(e)}"
        )

@router.get("/", response_model=List[AITemplateResponse])
async def get_templates(
    include_defaults: bool = True,
    is_active: bool = True,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get all AI templates with fixed field access"""
    try:
        logger.info(f"Getting templates: include_defaults={include_defaults}, is_active={is_active}")
        
        # Build query with correct field names
        query = select(AITemplate)
        
        if is_active:
            query = query.where(AITemplate.is_active == True)
        
        # Execute query
        result = await db.execute(query)
        templates = result.scalars().all()
        
        logger.info(f"Found {len(templates)} templates")
        
        # Convert to response format with correct field mapping
        template_responses = []
        for template in templates:
            template_response = AITemplateResponse(
                id=template.id,
                title=template.title,
                description=template.description,
                prompt=template.prompt,
                category=template.category,
                icon=template.icon,
                color_scheme=template.color_scheme,
                is_default=template.is_default,
                is_active=template.is_active,
                usage_count=template.usage_count,
                created_at=template.created_at,
                user_id=template.created_by  # Map created_by to user_id in response
            )
            template_responses.append(template_response)
        
        return template_responses
        
    except Exception as e:
        logger.error(f"Failed to get templates: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get templates: {str(e)}"
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
    """Get specific template by ID"""
    try:
        result = await db.execute(
            select(AITemplate).where(AITemplate.id == template_id)
        )
        template = result.scalar_one_or_none()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return AITemplateResponse(
            id=template.id,
            title=template.title,
            description=template.description,
            prompt=template.prompt,
            category=template.category,
            icon=template.icon,
            color_scheme=template.color_scheme,
            is_default=template.is_default,
            is_active=template.is_active,
            usage_count=template.usage_count,
            created_at=template.created_at,
            user_id=template.created_by  # Map created_by to user_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get template {template_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get template"
        )

@router.put("/{template_id}", response_model=AITemplateResponse)
async def update_template(
    template_id: int,
    template_data: AITemplateUpdate,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Update existing template"""
    try:
        result = await db.execute(
            select(AITemplate).where(AITemplate.id == template_id)
        )
        template = result.scalar_one_or_none()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Update fields if provided
        if template_data.title is not None:
            template.title = template_data.title
        if template_data.description is not None:
            template.description = template_data.description
        if template_data.prompt is not None:
            template.prompt = template_data.prompt
        if template_data.category is not None:
            template.category = template_data.category
        if template_data.icon is not None:
            template.icon = template_data.icon
        if template_data.color_scheme is not None:
            template.color_scheme = template_data.color_scheme
        if template_data.is_active is not None:
            template.is_active = template_data.is_active
        
        await db.commit()
        await db.refresh(template)
        
        return AITemplateResponse(
            id=template.id,
            title=template.title,
            description=template.description,
            prompt=template.prompt,
            category=template.category,
            icon=template.icon,
            color_scheme=template.color_scheme,
            is_default=template.is_default,
            is_active=template.is_active,
            usage_count=template.usage_count,
            created_at=template.created_at,
            user_id=template.created_by  # Map created_by to user_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update template {template_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update template"
        )

@router.delete("/{template_id}")
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Delete template"""
    try:
        result = await db.execute(
            select(AITemplate).where(AITemplate.id == template_id)
        )
        template = result.scalar_one_or_none()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        await db.delete(template)
        await db.commit()
        
        return {"message": "Template deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete template {template_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete template"
        )

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
