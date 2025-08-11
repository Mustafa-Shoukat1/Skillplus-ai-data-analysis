from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Request models
class GraphTemplateBase(BaseModel):
    graph_type: str = Field(..., min_length=1, max_length=50)
    graph_name: str = Field(..., min_length=1, max_length=100)
    echart_code: str = Field(..., min_length=1)
    description: Optional[str] = Field(None, max_length=500)
    category: Optional[str] = Field(None, max_length=50)

class GraphTemplateCreate(GraphTemplateBase):
    pass

class GraphTemplateUpdate(BaseModel):
    graph_type: Optional[str] = Field(None, min_length=1, max_length=50)
    graph_name: Optional[str] = Field(None, min_length=1, max_length=100)
    echart_code: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = Field(None, max_length=500)
    category: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None

# Response models
class GraphTemplateResponse(BaseModel):
    id: int
    graph_type: str
    graph_name: str
    echart_code: str
    description: Optional[str] = None
    category: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None

    class Config:
        from_attributes = True

class GraphTemplateListResponse(BaseModel):
    graph_templates: List[GraphTemplateResponse]
    total: int
    page: int
    page_size: int

# Simple response for frontend dropdowns
class GraphTypeOption(BaseModel):
    value: str  # graph_type
    label: str  # graph_name
    echart_code: str
    category: Optional[str] = None
