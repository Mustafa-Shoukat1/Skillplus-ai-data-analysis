from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
import json

from core.database import get_async_db_dependency
from core.logger import logger
from models.database import GraphTemplate, User
from models.graph_templates import (
    GraphTemplateCreate, 
    GraphTemplateUpdate, 
    GraphTemplateResponse, 
    GraphTemplateListResponse,
    GraphTypeOption
)

router = APIRouter(prefix="/graph-templates", tags=["graph-templates"])

# Return simple list format that frontend expects
@router.get("/")
async def get_graph_templates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(True),
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get all graph templates with pagination and filtering"""
    try:
        # Build query with filters
        query = select(GraphTemplate)
        
        if category:
            query = query.where(GraphTemplate.category == category)
        if is_active is not None:
            query = query.where(GraphTemplate.is_active == is_active)
        
        # Add ordering
        query = query.order_by(GraphTemplate.graph_name)
        
        # Count total
        count_query = select(GraphTemplate.id)
        if category:
            count_query = count_query.where(GraphTemplate.category == category)
        if is_active is not None:
            count_query = count_query.where(GraphTemplate.is_active == is_active)
        
        total_result = await db.execute(count_query)
        total = len(total_result.scalars().all())
        
        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        
        result = await db.execute(query)
        templates = result.scalars().all()
        
        # Convert to response format
        graph_templates = []
        for template in templates:
            graph_templates.append({
                "id": template.id,
                "graph_type": template.graph_type,
                "graph_name": template.graph_name,
                "echart_code": template.echart_code,
                "description": template.description,
                "category": template.category,
                "is_active": template.is_active,
                "created_at": template.created_at.isoformat() if template.created_at else None,
                "updated_at": template.updated_at.isoformat() if template.updated_at else None,
                "created_by": template.created_by
            })
        
        return {
            "graph_templates": graph_templates,
            "total": total,
            "page": page,
            "page_size": page_size
        }
        
    except Exception as e:
        logger.error(f"Error fetching graph templates: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch graph templates")

@router.get("/options", response_model=List[GraphTypeOption])
async def get_graph_type_options(
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get simplified graph type options for frontend dropdowns"""
    try:
        query = select(GraphTemplate).where(GraphTemplate.is_active == True)
        
        if category:
            query = query.where(GraphTemplate.category == category)
        
        query = query.order_by(GraphTemplate.graph_name)
        
        result = await db.execute(query)
        templates = result.scalars().all()
        
        return [
            GraphTypeOption(
                value=template.graph_type,
                label=template.graph_name,
                echart_code=template.echart_code,
                category=template.category
            )
            for template in templates
        ]
        
    except Exception as e:
        logger.error(f"Error fetching graph type options: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch graph type options")

@router.get("/{template_id}", response_model=GraphTemplateResponse)
async def get_graph_template(
    template_id: int,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get a specific graph template by ID"""
    try:
        result = await db.execute(
            select(GraphTemplate).where(GraphTemplate.id == template_id)
        )
        template = result.scalar_one_or_none()
        
        if not template:
            raise HTTPException(status_code=404, detail="Graph template not found")
        
        return GraphTemplateResponse.model_validate(template)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching graph template {template_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch graph template")

@router.post("/", response_model=GraphTemplateResponse)
async def create_graph_template(
    template_data: GraphTemplateCreate,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Create a new graph template"""
    try:
        # Check if graph_type already exists
        existing = await db.execute(
            select(GraphTemplate).where(
                and_(
                    GraphTemplate.graph_type == template_data.graph_type,
                    GraphTemplate.is_active == True
                )
            )
        )
        
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=400, 
                detail=f"Graph template with type '{template_data.graph_type}' already exists"
            )
        
        # Validate ECharts code is valid JSON
        try:
            json.loads(template_data.echart_code)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid ECharts code: must be valid JSON")
        
        # Create new template
        new_template = GraphTemplate(
            graph_type=template_data.graph_type,
            graph_name=template_data.graph_name,
            echart_code=template_data.echart_code,
            description=template_data.description,
            category=template_data.category,
            
        )
        
        db.add(new_template)
        await db.commit()
        await db.refresh(new_template)
        
        logger.info(f"Created graph template: {new_template.graph_type} by user admin")
        
        return GraphTemplateResponse.model_validate(new_template)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating graph template: {e}")
        raise HTTPException(status_code=500, detail="Failed to create graph template")

@router.put("/{template_id}", response_model=GraphTemplateResponse)
async def update_graph_template(
    template_id: int,
    template_data: GraphTemplateUpdate,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Update an existing graph template"""
    try:
        # Get existing template
        result = await db.execute(
            select(GraphTemplate).where(GraphTemplate.id == template_id)
        )
        template = result.scalar_one_or_none()
        
        if not template:
            raise HTTPException(status_code=404, detail="Graph template not found")
        
    
        # Validate ECharts code if provided
        if template_data.echart_code:
            try:
                json.loads(template_data.echart_code)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid ECharts code: must be valid JSON")
        
        # Update fields
        update_data = template_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(template, field, value)
        
        await db.commit()
        await db.refresh(template)
        
        logger.info(f"Updated graph template {template_id} by user admin")
        
        return GraphTemplateResponse.model_validate(template)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating graph template {template_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update graph template")

@router.delete("/{template_id}")
async def delete_graph_template(
    template_id: int,
    
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Delete (soft delete) a graph template"""
    try:
        # Get existing template
        result = await db.execute(
            select(GraphTemplate).where(GraphTemplate.id == template_id)
        )
        template = result.scalar_one_or_none()
        
        if not template:
            raise HTTPException(status_code=404, detail="Graph template not found")
        
       
        
        # Soft delete (set is_active to False)
        template.is_active = False
        
        await db.commit()
        
        logger.info(f"Deleted graph template {template_id} by user admin")
        
        return {"message": "Graph template deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting graph template {template_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete graph template")

@router.get("/by-type/{graph_type}", response_model=GraphTemplateResponse)
async def get_graph_template_by_type(
    graph_type: str,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get a graph template by its type"""
    try:
        result = await db.execute(
            select(GraphTemplate).where(
                and_(
                    GraphTemplate.graph_type == graph_type,
                    GraphTemplate.is_active == True
                )
            )
        )
        template = result.scalar_one_or_none()
        
        if not template:
            raise HTTPException(status_code=404, detail=f"Graph template with type '{graph_type}' not found")
        
        return GraphTemplateResponse.model_validate(template)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching graph template by type {graph_type}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch graph template")

@router.post("/seed")
async def seed_graph_templates(db: AsyncSession = Depends(get_async_db_dependency)):
    """Seed the database with default graph templates"""
    try:
        # Check if templates already exist
        result = await db.execute(select(GraphTemplate))
        existing_templates = result.scalars().all()
        
        if existing_templates:
            return {
                "success": True,
                "message": "Templates already exist",
                "count": len(existing_templates)
            }
        
        # Default templates with echart codes
        default_templates = [
            {
                "graph_type": "bar",
                "graph_name": "Bar Chart",
                "description": "Compare values across categories",
                "category": "comparison",
                "echart_code": """{
  title: { text: 'Bar Chart', left: 'center' },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: [] },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: [] }]
}"""
            },
            {
                "graph_type": "line",
                "graph_name": "Line Chart", 
                "description": "Show trends over time",
                "category": "trend",
                "echart_code": """{
  title: { text: 'Line Chart', left: 'center' },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: [] },
  yAxis: { type: 'value' },
  series: [{ type: 'line', data: [] }]
}"""
            },
            {
                "graph_type": "pie",
                "graph_name": "Pie Chart",
                "description": "Show proportions of a whole", 
                "category": "proportion",
                "echart_code": """{
  title: { text: 'Pie Chart', left: 'center' },
  tooltip: { trigger: 'item' },
  legend: { orient: 'vertical', left: 'left' },
  series: [{ type: 'pie', radius: '50%', data: [] }]
}"""
            },
            {
                "graph_type": "scatter",
                "graph_name": "Scatter Plot",
                "description": "Show correlation between variables",
                "category": "correlation", 
                "echart_code": """{
  title: { text: 'Scatter Plot', left: 'center' },
  tooltip: { trigger: 'item' },
  xAxis: { type: 'value' },
  yAxis: { type: 'value' },
  series: [{ type: 'scatter', data: [] }]
}"""
            },
            {
                "graph_type": "heatmap",
                "graph_name": "Heat Map",
                "description": "Show data density or correlation matrix",
                "category": "density",
                "echart_code": """{
  title: { text: 'Heat Map', left: 'center' },
  tooltip: { position: 'top' },
  grid: { height: '50%', top: '10%' },
  xAxis: { type: 'category', data: [] },
  yAxis: { type: 'category', data: [] },
  visualMap: { min: 0, max: 10, calculable: true },
  series: [{ type: 'heatmap', data: [] }]
}"""
            },
            {
                "graph_type": "radar",
                "graph_name": "Radar Chart",
                "description": "Compare multiple variables",
                "category": "comparison",
                "echart_code": """{
  title: { text: 'Radar Chart', left: 'center' },
  tooltip: {},
  radar: { indicator: [] },
  series: [{ type: 'radar', data: [] }]
}"""
            }
        ]
        
        # Create template records
        for template_data in default_templates:
            db_template = GraphTemplate(**template_data)
            db.add(db_template)
        
        await db.commit()
        
        logger.info(f"Seeded {len(default_templates)} graph templates")
        
        return {
            "success": True,
            "message": "Graph templates seeded successfully",
            "count": len(default_templates)
        }
        
    except Exception as e:
        logger.error(f"Error seeding graph templates: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to seed graph templates")
