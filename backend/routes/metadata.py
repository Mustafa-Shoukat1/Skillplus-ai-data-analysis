from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

router = APIRouter(prefix="/metadata", tags=["Metadata"])

@router.get("/analysis-types")
async def get_analysis_types():
    """Get available analysis types"""
    try:
        analysis_types = [
            {
                "value": "skill",
                "name": "Skill Analysis",
                "description": "Analyze skills, competencies, and capabilities",
                "icon": "Brain",
                "color": "blue"
            },
            {
                "value": "gap",
                "name": "Gap Analysis", 
                "description": "Identify gaps, deficiencies, and missing elements",
                "icon": "AlertTriangle",
                "color": "red"
            },
            {
                "value": "count",
                "name": "Count Analysis",
                "description": "Count and tally records, employees, or items",
                "icon": "Hash",
                "color": "green"
            },
            {
                "value": "summary",
                "name": "Summary Analysis",
                "description": "General overview and statistical summary",
                "icon": "FileText",
                "color": "purple"
            },
            {
                "value": "comparison",
                "name": "Comparison Analysis",
                "description": "Compare between groups, departments, or time periods",
                "icon": "BarChart3",
                "color": "orange"
            }
        ]
        
        return {
            "success": True,
            "data": {
                "analysis_types": analysis_types,
                "total_types": len(analysis_types)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get analysis types: {str(e)}")

@router.get("/models")
async def get_available_models():
    """Get available AI models"""
    try:
        models = [
            {
                "value": "claude-3-7-sonnet-20250219",
                "name": "Claude 3.7 Sonnet",
                "description": "High-performance model for complex analysis",
                "provider": "Anthropic",
                "recommended": True
            },
            {
                "value": "claude-3-5-sonnet-20240620",
                "name": "Claude 3.5 Sonnet",
                "description": "Balanced performance and speed",
                "provider": "Anthropic",
                "recommended": False
            }
        ]
        
        return {
            "success": True,
            "data": {
                "models": models,
                "total_models": len(models)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get models: {str(e)}")
