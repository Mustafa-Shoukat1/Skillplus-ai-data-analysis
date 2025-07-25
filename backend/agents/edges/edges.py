from typing import Literal
from models.data_analysis import AnalysisState, QueryType


def classify_query_edge(state: AnalysisState) -> Literal["general_path", "visualization_path"]:
    """Route based on query classification"""
    if state.classification and state.classification.query_type == QueryType.VISUALIZATION:
        return "visualization_path"
    return "general_path"

def code_review_edge(state: AnalysisState) -> Literal["execute_code", "rewrite_code"]:
    """Route based on code review results"""
    if state.code_review and state.code_review.review_status == "approved":
        return "execute_code"
    
    # Check retry limit
    if state.retry_count >= state.max_retries:
        return "execute_code"  # Execute anyway after max retries
    
    return "rewrite_code"
def execution_retry_edge(state: AnalysisState) -> Literal["final_results", "rewrite_code"]:

    """Route based on execution results - simplified without explanation"""
    if state.execution_result and state.execution_result.success:
        return "final_results"
    
    # Check retry limit
    if state.retry_count >= state.max_retries:
        return "final_results"  # Go to final results anyway
    
    return "rewrite_code"
