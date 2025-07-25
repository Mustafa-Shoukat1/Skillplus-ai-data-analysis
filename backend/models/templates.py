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

class AITemplateResponse(AITemplateBase):
    id: int
    is_default: bool
    usage_count: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
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
    model: Optional[str] = "claude-3-opus-20240229"
    enable_code_review: Optional[bool] = True

class BulkAnalysisResponse(BaseModel):
    success: bool
    total_templates: int
    task_ids: List[str]
    estimated_completion_time: int  # in seconds
    message: str
