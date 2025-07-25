from datetime import datetime
from enum import Enum
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field
import pandas as pd

# ===== PYDANTIC MODELS FOR SIMPLE FLOW =====

class QueryType(str, Enum):
    GENERAL = "general"
    VISUALIZATION = "visualization"

class QueryClassification(BaseModel):
    """Output from Understanding & Classify Node"""
    query_type: QueryType = Field(description="Whether query needs general analysis or visualization")
    reasoning: str = Field(description="Why this classification was chosen")
    user_intent: str = Field(description="What the user wants to achieve")
    requires_data_filtering: bool = Field(description="Whether data filtering is needed")
    confidence: float = Field(ge=0, le=1, description="Confidence in classification")

class CodeAnalysis(BaseModel):
    """Output from Query Analysis & Code Generation"""
    query_understanding: str = Field(description="Understanding of what user wants")
    approach: str = Field(description="Approach to solve the query")
    required_columns: List[str] = Field(description="Columns needed from dataset")
    generated_code: str = Field(description="Python code to execute")
    expected_output: str = Field(description="What the code should produce")

class CodeReview(BaseModel):
    """Output from Code Review Node"""
    is_correct: bool = Field(description="Whether code correctly fulfills user query")
    review_status: Literal["approved", "needs_rewrite"] = Field(description="Review decision")
    issues: List[str] = Field(default_factory=list, description="Issues found in code")
    suggestions: List[str] = Field(default_factory=list, description="Improvement suggestions")
    confidence: float = Field(ge=0, le=1, description="Confidence in review")

class ExecutionResult(BaseModel):
    """Output from Code Execution"""
    success: bool = Field(description="Whether execution was successful")
    output: str = Field(description="Execution output or error message")
    result_data: Optional[str] = Field(default=None, description="Formatted result data")
    visualization_created: bool = Field(default=False, description="Whether visualization was created")
    file_paths: List[str] = Field(default_factory=list, description="Created file paths")

class FinalResults(BaseModel):
    """Final processed results"""
    answer: str = Field(description="Final answer to user query")
    summary: str = Field(description="Summary of analysis performed")
    visualization_info: Optional[Dict[str, Any]] = Field(default=None, description="Visualization details")
    success: bool = Field(description="Overall success status")

# ===== SIMPLE STATE MODEL =====

class AnalysisState(BaseModel):
    # Input
    user_query: str
    df: pd.DataFrame
    
    # Flow outputs
    classification: Optional[QueryClassification] = None
    code_analysis: Optional[CodeAnalysis] = None
    code_review: Optional[CodeReview] = None
    execution_result: Optional[ExecutionResult] = None
    final_results: Optional[FinalResults] = None
    
    # Control flow
    current_code: str = ""
    retry_count: int = 0
    max_retries: int = 2
    
    model_config = {
        "arbitrary_types_allowed": True
    }


from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from enum import Enum

class ChartType(str, Enum):
    BAR = "bar"
    LINE = "line"
    SCATTER = "scatter"
    PIE = "pie"
    HEATMAP = "heatmap"
    HISTOGRAM = "histogram"
    BOX = "box"
    VIOLIN = "violin"
    AREA = "area"
    BUBBLE = "bubble"

class DataAnalysisRequest(BaseModel):
    prompt: str
    model: Optional[str] = "claude-3-opus-20240229"  # Add default model
    enable_code_review: Optional[bool] = True

class ChartGenerationResponse(BaseModel):
    success: bool
    chart_base64: Optional[str] = None
    chart_html: Optional[str] = None
    insights: List[str] = []
    generated_code: Optional[str] = None
    analysis_summary: Optional[str] = None
    query_analysis: Optional[Dict[str, Any]] = None
    data_analysis: Optional[Dict[str, Any]] = None
    execution_result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    analysis_id: Optional[str] = None
    is_visible: Optional[bool] = True  # NEW: Visibility toggle

class AnalysisVisibilityUpdate(BaseModel):
    """Model for updating analysis visibility"""
    is_visible: bool

class AnalysisListResponse(BaseModel):
    """Enhanced analysis list response with visibility info"""
    analysis_id: str
    database_id: int
    user_query: str
    success: bool
    query_type: str
    processing_time: Optional[float]
    model_used: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]
    visualization_created: bool
    final_answer: Optional[str]
    summary: Optional[str]
    is_visible: bool  # NEW: Visibility status
    template_name: Optional[str] = None
    combine_sheets: bool = False  # Whether to combine multiple sheets
    model: Optional[str] = "claude-3-opus-20240229"

class AnalysisCapabilitiesResponse(BaseModel):
    success: bool
    capabilities: Dict[str, Any]
    suggested_analyses: List[str] = []
    available_visualizations: List[str] = []
    data_quality_score: float = 0.0
    data_quality_score: float = 0.0

class FileUploadResponse(BaseModel):
    """Response model for file upload"""
    success: bool
    filename: str
    file_id: str
    file_type: str
    message: str
    sheets: List[str] = []
    total_sheets: int = 1
    summary: Dict[str, Any] = {}

class DataPreviewResponse(BaseModel):
    """Response model for file preview"""
    success: bool
    data_preview: Optional[Dict[str, Any]] = None
    columns: List[str] = []
    shape: Optional[tuple] = None
    data_types: Dict[str, str] = {}
    error_message: Optional[str] = None
