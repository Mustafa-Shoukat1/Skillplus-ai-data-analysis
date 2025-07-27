from typing import Literal
from models.data_analysis import AnalysisState, QueryType


def classify_query_edge(state: AnalysisState) -> Literal["data_extraction", "final_results"]:
    """Enhanced routing based on query classification"""
    if not state.classification:
        return "final_results"
    
    query_type = state.classification.query_type
    
    # Route to data extraction for both visualization and complex analysis
    if query_type == QueryType.VISUALIZATION:
        return "data_extraction"
    elif query_type == QueryType.GENERAL and state.classification.requires_data_filtering:
        return "data_extraction"
    else:
        return "final_results"

def data_ready_edge(state: AnalysisState) -> Literal["generate_visualization", "final_results"]:
    """Route after data extraction based on query type"""
    if not state.classification:
        return "final_results"
    
    # If visualization is needed and data is extracted, generate charts
    if (state.classification.query_type == QueryType.VISUALIZATION and 
        hasattr(state, 'extracted_data') and state.extracted_data):
        return "generate_visualization"
    
    return "final_results"

def code_review_edge(state: AnalysisState) -> Literal["execute_code", "rewrite_code"]:
    """Route based on code review results"""
    if state.code_review and state.code_review.review_status == "approved":
        return "execute_code"
    
    # Check retry limit
    if state.retry_count >= state.max_retries:
        return "execute_code"  # Execute anyway after max retries
    
    return "rewrite_code"

def execution_retry_edge(state: AnalysisState) -> Literal["final_results", "rewrite_code"]:
    """Route based on execution results"""
    if state.execution_result and state.execution_result.success:
        return "final_results"
    
    # Check retry limit
    if state.retry_count >= state.max_retries:
        return "final_results"  # Go to final results anyway
    
    return "rewrite_code"
