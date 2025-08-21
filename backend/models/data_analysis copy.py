# =============================================================================
# STRUCTURED OUTPUT MODELS
# =============================================================================
from enum import Enum
import pandas as pd
from pydantic import BaseModel
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional, TypedDict, Annotated
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
class MetricTrend(str, Enum):
    IMPROVING = "improving"
    DECLINING = "declining"
    STABLE = "stable"
    VOLATILE = "volatile"

class RiskLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class ExecutiveInsight(BaseModel):
    """Executive overview insights"""
    total_employees: int = Field(description="Total number of employees assessed")
    average_performance: float = Field(description="Overall average performance percentage")
    top_performing_department: str = Field(description="Best performing department")
    areas_of_concern: List[str] = Field(description="Key areas needing attention")
    trend_analysis: MetricTrend = Field(description="Overall performance trend")
    key_recommendations: List[str] = Field(description="Top 3 strategic recommendations")
    performance_distribution: Dict[str, int] = Field(description="Distribution of performance levels")

class HRInsight(BaseModel):
    """HR analysis insights"""
    workforce_analytics: Dict[str, Any] = Field(description="Workforce composition and metrics")
    performance_gaps: List[Dict[str, Any]] = Field(description="Identified skill gaps")
    training_priorities: List[str] = Field(description="Priority training areas")
    retention_risk: Dict[str, Any] = Field(description="Employee retention risk analysis")
    diversity_metrics: Dict[str, Any] = Field(description="Diversity and inclusion metrics")
    recommended_actions: List[str] = Field(description="HR action items")

class TeamInsight(BaseModel):
    """Team management insights"""
    team_performance_ranking: List[Dict[str, Any]] = Field(description="Teams ranked by performance")
    collaboration_metrics: Dict[str, float] = Field(description="Team collaboration scores")
    leadership_effectiveness: Dict[str, float] = Field(description="Leadership assessment scores")
    team_dynamics: List[str] = Field(description="Key team dynamic observations")
    management_recommendations: List[str] = Field(description="Team management action items")

class SkillInsight(BaseModel):
    """Skill analysis insights"""
    competency_analysis: Dict[str, float] = Field(description="Competency scores by skill area")
    skill_gaps: List[Dict[str, Any]] = Field(description="Critical skill gaps identified")
    development_pathways: Dict[str, List[str]] = Field(description="Recommended skill development paths")
    benchmark_comparison: Dict[str, float] = Field(description="Performance vs industry benchmarks")
    upskilling_priorities: List[str] = Field(description="Priority skills for development")

# =============================================================================
# GRAPH STATE
# =============================================================================
class AnalysisResponse(BaseModel):
    executive_insights: Optional[ExecutiveInsight] = None
    hr_insights: Optional[HRInsight] = None
    team_insights: Optional[TeamInsight] = None
    skill_insights: Optional[SkillInsight] = None
class DashboardState(TypedDict):
    """State for the dashboard analysis workflow"""
    raw_data: Dict[str, Any]
    processed_data: Dict[str, pd.DataFrame]
    executive_insights: Optional[ExecutiveInsight]
    hr_insights: Optional[HRInsight]
    team_insights: Optional[TeamInsight]
    skill_insights: Optional[SkillInsight]
    messages: Annotated[List[BaseMessage], add_messages]
    current_analysis: Annotated[str, lambda x, y: y]  # Always take the latest value
    error_log: Annotated[List[str], lambda x, y: x + y]  # Accumulate errors
    error_log: List[str]
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


