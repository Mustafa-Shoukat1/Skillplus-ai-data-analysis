from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class AITemplateBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    prompt: str = Field(..., min_length=10)
    category: Optional[str] = Field(None, max_length=50)
    icon: Optional[str] = Field(None, max_length=50)
    color_scheme: Optional[str] = Field(None, max_length=100)
    is_active: bool = Field(default=True)

class AITemplateCreate(AITemplateBase):
    pass

class AITemplateUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    prompt: Optional[str] = Field(None, min_length=10)
    category: Optional[str] = Field(None, max_length=50)
    icon: Optional[str] = Field(None, max_length=50)
    color_scheme: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None

class AITemplateResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    prompt: str
    category: Optional[str] = None
    icon: str = "Brain"
    color_scheme: str = "from-blue-500 to-cyan-500"
    is_default: bool = False
    is_active: bool = True
    usage_count: int = 0
    created_at: datetime
    user_id: Optional[int] = None  # Add this field
    
    class Config:
        from_attributes = True

class TemplateUsageStats(BaseModel):
    template_id: int
    title: str
    usage_count: int
    last_used: Optional[datetime] = None
    success_rate: float = 0.0

class BulkAnalysisRequest(BaseModel):
    file_id: str
    template_ids: List[int] = Field(..., min_items=1, max_items=10)
    model: Optional[str] = "claude-opus-4-20250514"
    enable_code_review: Optional[bool] = True

class BulkAnalysisResponse(BaseModel):
    success: bool
    total_templates: int
    task_ids: List[str]
    estimated_completion_time: int  # in seconds
    message: str
