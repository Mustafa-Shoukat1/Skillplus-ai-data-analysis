"""
API response models and schemas
"""

from typing import Any, Dict, Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field
from datetime import datetime


T = TypeVar('T')


class APIResponse(BaseModel, Generic[T]):
    """Standard API response wrapper."""
    success: bool = True
    message: str = "Success"
    data: Optional[T] = None
    errors: Optional[List[str]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response for list endpoints."""
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool


class ErrorResponse(BaseModel):
    """Error response model."""
    success: bool = False
    error: str
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str
    uptime: Optional[float] = None
    dependencies: Optional[Dict[str, str]] = None


class FileMetadata(BaseModel):
    """File metadata response."""
    file_id: str
    filename: str
    file_type: str
    file_size: int
    file_size_formatted: str
    columns: List[str]
    row_count: int
    upload_timestamp: datetime


class AnalysisSummary(BaseModel):
    """Analysis summary for listing."""
    analysis_id: str
    title: str
    query_type: str
    status: str
    is_visible: bool
    created_at: datetime
    processing_time: Optional[float] = None
