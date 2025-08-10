from datetime import datetime
from enum import Enum
import operator
from typing import Annotated, List, Dict, Any, Optional, Literal, Sequence, TypedDict
from pydantic import BaseModel, Field, field_validator
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
    RADAR = "radar"
class DataAnalysisRequest(BaseModel):
    prompt: str

    # Model selection used by backend services when saving/executing
    model: Optional[str] = "claude-3-7-sonnet-20250219"

    # New inputs coming from Next.js frontend
    graph_type: Optional[str] = None
    sheet: Optional[str] = None
    echart_sample_code: Optional[str] = None
    enable_code_review: Optional[bool] = True

class ChartGenerationResponse(BaseModel):
    success: bool

    execution_result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    analysis_id: Optional[str] = None
    is_visible: Optional[bool] = True  # NEW: Visibility toggle
    # Agent/LCEL additions
    echart_code: Optional[str] = None
    designed_echart_code: Optional[str] = None
    response_df_records: List[Dict[str, Any]] = []
    response_df_columns: List[str] = []
    response_df_shape: Optional[tuple] = None
    agent_state: Optional[Dict[str, Any]] = None

class MinimalAnalysisResponse(BaseModel):
    """Minimal API response for analysis results"""
    query: str
    echart_code: Optional[str] = None
    designed_echart_code: Optional[str] = None
    response_df: List[Dict[str, Any]] = []

    @field_validator("response_df", mode="before")
    @classmethod
    def ensure_list_of_dicts(cls, v):
        if isinstance(v, dict):
            import pandas as pd
            return pd.DataFrame(v).to_dict('records')
        elif hasattr(v, 'to_dict'):
            return v.to_dict('records')
        elif not isinstance(v, list):
            return []
        return v

    model_config = {
        "arbitrary_types_allowed": True
    }

class AnalysisVisibilityUpdate(BaseModel):
    """Model for updating analysis visibility"""
    is_visible: bool

class AnalysisListResponse(BaseModel):
    """Simplified analysis list response"""
    analysis_id: str
    database_id: int
    query: str
    echart_code: Optional[str] = None
    designed_echart_code: Optional[str] = None
    response_df: List[Dict[str, Any]] = []
    created_at: datetime
    is_active: bool = True
    
    class Config:
        from_attributes = True

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


# ---------------------------------------------------------------------
# Structured Output Models
# ---------------------------------------------------------------------
class AnalysisClassification(BaseModel):
    """Classification of user query analysis type"""
    analysis_type: Literal["skill", "gap", "count", "summary", "comparison", "unknown"] = Field(
        description="Type of analysis requested"
    )
    confidence: float = Field(
        description="Confidence score between 0 and 1",
        ge=0.0, le=1.0
    )
    reasoning: str = Field(description="Brief explanation of classification")
    suggested_sheet: Optional[str] = Field(
        description="Suggested sheet for analysis based on query",
        default=None
    )

class CodeGenerationResult(BaseModel):
    """Result of code generation"""
    code: str = Field(description="Generated Python code")
    description: str = Field(description="What the code does")
    expected_output: str = Field(description="Expected type of output")
    imports_needed: List[str] = Field(description="Required imports", default_factory=list)

class CodeReviewResult(BaseModel):
    """Result of code review"""
    approved: bool = Field(description="Whether code is approved")
    feedback: str = Field(description="Review feedback")
    issues: List[str] = Field(description="List of specific issues found", default_factory=list)
    suggestions: List[str] = Field(description="Improvement suggestions", default_factory=list)
    severity: Literal["low", "medium", "high", "critical"] = Field(
        description="Severity of issues found",
        default="low"
    )

class AnalysisResult(BaseModel):
    """Final analysis result"""
    summary: str = Field(description="Executive summary of findings")
    key_insights: List[str] = Field(description="Key insights discovered")
    metrics: Dict[str, Any] = Field(description="Quantitative metrics", default_factory=dict)
    recommendations: List[str] = Field(description="Actionable recommendations")
    data_quality_notes: List[str] = Field(description="Data quality observations", default_factory=list)
    methodology: str = Field(description="Analysis methodology used")

# ---------------------------------------------------------------------
# Improved State with Better Typing
# ---------------------------------------------------------------------
class AgentState(TypedDict):
    messages: Annotated[Sequence[str], operator.add]
    analysis_classification: Optional[AnalysisClassification]
    analysis_type: str
    sheet: Optional[str]
    df: Optional[pd.DataFrame]
    # Unified tabular response for downstream processing
    response_df: Optional[pd.DataFrame]
    code_generation_result: Optional[CodeGenerationResult]
    code_review_result: Optional[CodeReviewResult]
    analysis_result: Optional[AnalysisResult]
    execution_result: Optional[Dict[str, Any]]
    response: Dict[str, Any]
    # Global sheet data
    sheets: Dict[str, pd.DataFrame]
    selected_sheets: Dict[str, pd.DataFrame]
    dfs_list: List[pd.DataFrame]
    sheets_metadata: List[Dict[str, Any]]
    total_sheets: int
    columns: List[str]
    shapes: List[tuple]
    data_types: Dict[str, str]
    # Enhanced retry tracking
    review_attempts: int
    max_review_attempts: int
    error_log: List[str]
    # ECharts integration
    graph_type: Optional[str]
    echart_code: Optional[str]
    # ECharts sample/template merging
    echart_sample_code: Optional[str]
    designed_echart_code: Optional[str]
    enhanced_echart_options: Optional[str]
    #