from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from fastapi import HTTPException, status

from models.database import AITemplate
from models.templates import AITemplateCreate, AITemplateUpdate
from core.logger import logger

class TemplateService:
    
    @staticmethod
    async def create_template(
        db: AsyncSession, 
        template_data: AITemplateCreate, 
        user_id: int
    ) -> AITemplate:
        """Create a new AI template"""
        
        db_template = AITemplate(
            title=template_data.title,
            description=template_data.description,
            prompt=template_data.prompt,
            category=template_data.category,
            icon=template_data.icon,
            color_scheme=template_data.color_scheme,
            is_active=template_data.is_active,
            user_id=user_id
        )
        
        db.add(db_template)
        await db.commit()
        await db.refresh(db_template)
        
        logger.info(f"Created template: {template_data.title} for user {user_id}")
        return db_template
    
    @staticmethod
    async def get_user_templates(
        db: AsyncSession, 
        user_id: int, 
        include_defaults: bool = True,
        category: Optional[str] = None,
        is_active: Optional[bool] = True
    ) -> List[AITemplate]:
        """Get templates for a user (including default templates if requested)"""
        
        query = select(AITemplate)
        
        if include_defaults:
            # Include user's templates and default templates
            query = query.where(
                (AITemplate.user_id == user_id) | (AITemplate.is_default == True)
            )
        else:
            # Only user's templates
            query = query.where(AITemplate.user_id == user_id)
        
        if category:
            query = query.where(AITemplate.category == category)
        
        if is_active is not None:
            query = query.where(AITemplate.is_active == is_active)
        
        query = query.order_by(AITemplate.is_default.desc(), AITemplate.usage_count.desc(), AITemplate.created_at.desc())
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_template_by_id(
        db: AsyncSession, 
        template_id: int, 
        user_id: int
    ) -> Optional[AITemplate]:
        """Get template by ID (user can access their own templates or default templates)"""
        
        result = await db.execute(
            select(AITemplate).where(
                AITemplate.id == template_id,
                (AITemplate.user_id == user_id) | (AITemplate.is_default == True)
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_template(
        db: AsyncSession, 
        template_id: int, 
        template_data: AITemplateUpdate, 
        user_id: int
    ) -> Optional[AITemplate]:
        """Update a user's template"""
        
        # First check if user owns the template
        result = await db.execute(
            select(AITemplate).where(
                AITemplate.id == template_id,
                AITemplate.user_id == user_id,
                AITemplate.is_default == False  # Can't edit default templates
            )
        )
        template = result.scalar_one_or_none()
        
        if not template:
            return None
        
        # Update fields
        update_data = template_data.model_dump(exclude_unset=True)
        if update_data:
            await db.execute(
                update(AITemplate)
                .where(AITemplate.id == template_id)
                .values(**update_data)
            )
            await db.commit()
            await db.refresh(template)
            
            logger.info(f"Updated template {template_id} for user {user_id}")
        
        return template
    
    @staticmethod
    async def delete_template(db: AsyncSession, template_id: int) -> bool:
        """Delete a template (now allows deletion of default templates)"""
        try:
            result = await db.execute(
                select(AITemplate).where(AITemplate.id == template_id)
            )
            template = result.scalar_one_or_none()
            
            if not template:
                logger.warning(f"Template {template_id} not found for deletion")
                return False
            
            # Allow deletion of any template (removed is_default restriction)
            logger.info(f"Deleting template: {template.title} (ID: {template_id})")
            
            await db.delete(template)
            await db.commit()
            
            logger.info(f"✅ Template {template_id} deleted successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to delete template {template_id}: {e}")
            await db.rollback()
            return False
    
    @staticmethod
    async def increment_usage_count(
        db: AsyncSession, 
        template_id: int
    ):
        """Increment usage count for a template"""
        
        await db.execute(
            update(AITemplate)
            .where(AITemplate.id == template_id)
            .values(usage_count=AITemplate.usage_count + 1)
        )
        await db.commit()
    
    @staticmethod
    async def get_template_categories(
        db: AsyncSession, 
        user_id: int
    ) -> List[str]:
        """Get all unique categories for user's templates"""
        
        result = await db.execute(
            select(AITemplate.category)
            .where(
                (AITemplate.user_id == user_id) | (AITemplate.is_default == True),
                AITemplate.category.isnot(None),
                AITemplate.is_active == True
            )
            .distinct()
        )
        
        categories = [row[0] for row in result.fetchall() if row[0]]
        return sorted(categories)
    
    @staticmethod
    async def create_default_templates(db: AsyncSession):
        """Create default system templates"""
        
        default_templates = [
            {
                "title": "Performance Gap Analysis",
                "description": "Identify skill gaps and performance bottlenecks across teams",
                "prompt": "Analyze the employee performance data to identify critical skill gaps, underperforming areas, and provide actionable recommendations for improvement. Focus on departments with the lowest average scores and suggest targeted training programs.",
                "category": "performance",
                "icon": "AlertTriangle",
                "color_scheme": "from-red-500 to-orange-500",
                "user_id": 1,
                "is_default": True
            },
            {
                "title": "Top Performer Insights",
                "description": "Analyze characteristics and patterns of high-performing employees",
                "prompt": "Identify the top 20% performers in the dataset and analyze their common characteristics, skills, and patterns. Provide insights on what makes them successful and how to replicate these traits across the organization.",
                "category": "performance",
                "icon": "TrendingUp",
                "color_scheme": "from-green-500 to-emerald-500",
                "user_id": 1,
                "is_default": True
            },
            {
                "title": "Team Dynamics Analysis",
                "description": "Understand team composition and collaboration effectiveness",
                "prompt": "Analyze team dynamics by examining skill complementarity, performance distribution within teams, and identify optimal team compositions. Suggest team restructuring opportunities for better performance.",
                "category": "team",
                "icon": "Users",
                "color_scheme": "from-blue-500 to-cyan-500",
                "user_id": 1,
                "is_default": True
            },
            {
                "title": "Skill Trend Forecasting",
                "description": "Predict future skill requirements and development needs",
                "prompt": "Based on current skill distributions and performance data, forecast future skill requirements, identify emerging skill gaps, and recommend proactive development strategies for the next 6-12 months.",
                "category": "forecasting",
                "icon": "Brain",
                "color_scheme": "from-purple-500 to-pink-500",
                "user_id": 1,
                "is_default": True
            },
            {
                "title": "Training ROI Analysis",
                "description": "Calculate return on investment for training programs",
                "prompt": "Analyze the correlation between employee development areas and performance scores to calculate potential ROI of targeted training programs. Prioritize training investments based on impact potential.",
                "category": "roi",
                "icon": "Target",
                "color_scheme": "from-indigo-500 to-blue-500",
                "user_id": 1,
                "is_default": True
            },
            {
                "title": "Retention Risk Assessment",
                "description": "Identify employees at risk of leaving and retention strategies",
                "prompt": "Analyze performance patterns, skill utilization, and engagement indicators to identify employees at risk of leaving. Provide personalized retention strategies and career development recommendations.",
                "category": "retention",
                "icon": "Activity",
                "color_scheme": "from-yellow-500 to-orange-500",
                "user_id": 1,
                "is_default": True
            }
        ]
        
        for template_data in default_templates:
            # Check if template already exists
            result = await db.execute(
                select(AITemplate).where(
                    AITemplate.title == template_data["title"],
                    AITemplate.is_default == True
                )
            )
            existing = result.scalar_one_or_none()
            
            if not existing:
                db_template = AITemplate(**template_data)
                db.add(db_template)
        
        await db.commit()
        logger.info("Default templates created/verified")
