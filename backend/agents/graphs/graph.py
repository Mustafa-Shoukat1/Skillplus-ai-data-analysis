import logging
import json
import os
import time
from langgraph.graph import StateGraph, END
from langchain_anthropic.chat_models import ChatAnthropic

from models.data_analysis import AnalysisState
from ..nodes.nodes import (
    QueryClassificationNode, DataExtractionNode, EchartsVisualizationNode,
    CodeReviewNode, CodeRewriteNode, CodeExecutionNode, FinalResultsNode
)
from ..edges.edges import classify_query_edge, data_ready_edge, code_review_edge, execution_retry_edge
from core.config import settings
from core.logger import logger, log_exception

class DataAnalysisWorkflow:
    """Enhanced data analysis workflow with ECharts visualization"""

    def __init__(self, model_name: str = 'claude-3-opus-20240229'):
        """Initialize the workflow with specified model"""
        try:
            self.llm = ChatAnthropic(
                model=model_name,
                api_key=settings.ANTHROPIC_API_KEY,
                temperature=0.1,
                max_tokens=4000
            )
            
            # Initialize nodes
            self.query_classification = QueryClassificationNode(self.llm)
            self.data_extraction = DataExtractionNode(self.llm)
            self.echarts_visualization = EchartsVisualizationNode(self.llm)
            self.code_review = CodeReviewNode(self.llm)
            self.code_rewrite = CodeRewriteNode(self.llm)
            self.code_execution = CodeExecutionNode()
            self.final_results = FinalResultsNode(self.llm)
            
            # Build the graph
            self.graph = self._build_graph()
            
        except Exception as e:
            logger.error(f"Failed to initialize DataAnalysisWorkflow: {e}")
            log_exception(logger, "Workflow initialization error", e)
            raise

    def _build_graph(self) -> StateGraph:
        """Build the enhanced workflow graph"""
        
        workflow = StateGraph(AnalysisState)
        
        # Add nodes
        workflow.add_node("classify_query", self.query_classification.execute)
        workflow.add_node("extract_data", self.data_extraction.execute)
        workflow.add_node("generate_echarts", self.echarts_visualization.execute)
        workflow.add_node("review_code", self.code_review.execute)
        workflow.add_node("rewrite_code", self.code_rewrite.execute)
        workflow.add_node("execute_code", self.code_execution.execute)
        workflow.add_node("final_results", self.final_results.execute)
        
        # Set entry point
        workflow.set_entry_point("classify_query")
        
        # Add conditional edges
        workflow.add_conditional_edges(
            "classify_query",
            classify_query_edge,
            {
                "data_extraction": "extract_data",
                "final_results": "final_results"  # For simple queries
            }
        )
        
        workflow.add_conditional_edges(
            "extract_data",
            data_ready_edge,
            {
                "generate_visualization": "generate_echarts",
                "final_results": "final_results"
            }
        )
        
        workflow.add_conditional_edges(
            "generate_echarts",
            code_review_edge,
            {
                "execute_code": "execute_code",
                "rewrite_code": "rewrite_code"
            }
        )
        
        workflow.add_conditional_edges(
            "review_code",
            code_review_edge,
            {
                "execute_code": "execute_code",
                "rewrite_code": "rewrite_code"
            }
        )
        
        workflow.add_conditional_edges(
            "rewrite_code",
            code_review_edge,
            {
                "execute_code": "execute_code",
                "review_code": "review_code"
            }
        )
        
        workflow.add_conditional_edges(
            "execute_code",
            execution_retry_edge,
            {
                "final_results": "final_results",
                "rewrite_code": "rewrite_code"
            }
        )
        
        # End nodes
        workflow.add_edge("final_results", END)
        
        return workflow.compile()
    
    async def run(self, df, user_query: str) -> dict:
        """Run the enhanced analysis workflow"""
        try:
            logger.info(f"Starting enhanced workflow for query: {user_query[:100]}...")
            
            initial_state = AnalysisState(
                user_query=user_query,
                df=df
            )
            
            result = await self.graph.ainvoke(initial_state)
            
            logger.info("Enhanced workflow completed successfully")
            return {
                "success": True,
                "classification": result.classification,
                "data_extraction": result.data_extraction if hasattr(result, 'data_extraction') else None,
                "generated_code": result.current_code,
                "execution": result.execution_result,
                "final_results": result.final_results,
                "visualization_html": result.visualization_html if hasattr(result, 'visualization_html') else None
            }
            
        except Exception as e:
            logger.error(f"Enhanced workflow failed: {e}")
            log_exception(logger, "Enhanced workflow error", e)
            return {
                "success": False,
                "error": str(e),
                "classification": None,
                "execution": None,
                "final_results": None
            }

    def run_analysis(self, df, user_query: str) -> dict:
        """Process workflow result and return structured output"""
        try:
            logger.info(f"Processing workflow result for query: {user_query[:100]}...")
            
            # Run the async workflow
            import asyncio
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            if loop.is_running():
                # If loop is already running, create a task
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(asyncio.run, self.run(df, user_query))
                    result = future.result()
            else:
                result = loop.run_until_complete(self.run(df, user_query))
            
            # Helper function to safely extract dict from result objects
            def safe_model_dump(obj):
                if obj is None:
                    return None
                if hasattr(obj, 'model_dump'):
                    return obj.model_dump()
                elif hasattr(obj, 'dict'):
                    return obj.dict()
                elif isinstance(obj, dict):
                    return obj
                else:
                    return str(obj)
            
            # Process result based on type
            if isinstance(result, dict):
                # If already a dict, use it directly
                processed_result = result
            else:
                # Extract data from result object
                classification_dict = safe_model_dump(getattr(result, 'classification', None))
                analysis_dict = safe_model_dump(getattr(result, 'code_analysis', None))
                review_dict = safe_model_dump(getattr(result, 'code_review', None))
                execution_dict = safe_model_dump(getattr(result, 'execution_result', None))
                final_results_dict = safe_model_dump(getattr(result, 'final_results', None))
                
                # Log execution result for debugging
                if execution_dict:
                    logger.info(f"Execution result - success: {execution_dict.get('success')}, visualization_created: {execution_dict.get('visualization_created')}")
                
                processed_result = {
                    "success": True,
                    "user_query": user_query,
                    "classification": classification_dict,
                    "analysis": analysis_dict,
                    "review": review_dict,
                    "execution": execution_dict,
                    "final_results": final_results_dict,
                    "generated_code": getattr(result, 'current_code', None),
                    "retry_count": getattr(result, 'retry_count', 0),
                    "workflow_completed": True
                }
                
                # Determine overall success - simplified logic
                execution_success = execution_dict and execution_dict.get('success', False) if execution_dict else False
                final_success = final_results_dict and final_results_dict.get('success', False) if final_results_dict else False
                has_code = bool(getattr(result, 'current_code', None))
                
                # Simple success determination: if any major component succeeded
                overall_success = execution_success or final_success or has_code
                processed_result["success"] = overall_success
            
            query_type = processed_result.get('classification', {}).get('query_type', 'unknown') if processed_result.get('classification') else 'unknown'
            logger.info(f"Workflow result processed: success={processed_result.get('success')}, query_type={query_type}")
            logger.debug(f"Output contains - classification: {bool(processed_result.get('classification'))}, analysis: {bool(processed_result.get('analysis'))}, execution: {bool(processed_result.get('execution'))}, final_results: {bool(processed_result.get('final_results'))}")
            
            return processed_result
            
        except Exception as e:
            logger.error(f"Failed to process workflow result: {e}")
            log_exception(logger, "Result processing error", e)
            
            # Create a simple fallback result
            fallback_result = {
                "success": False,
                "user_query": user_query,
                "error": f"Result processing failed: {str(e)}",
                "classification": None,
                "analysis": None,
                "review": None,
                "execution": None,
                "final_results": None,
                "generated_code": None,
                "retry_count": 0,
                "workflow_completed": False
            }
            
            # Try to extract any available data from the result
            try:
                if hasattr(result, 'current_code'):
                    fallback_result["generated_code"] = result.current_code
                if hasattr(result, 'retry_count'):
                    fallback_result["retry_count"] = result.retry_count
                # If it's a dict, merge what we can
                elif isinstance(result, dict):
                    fallback_result.update({
                        "generated_code": result.get("generated_code"),
                        "retry_count": result.get("retry_count", 0),
                        "classification": result.get("classification"),
                        "analysis": result.get("analysis"),
                        "review": result.get("review"),
                        "execution": result.get("execution"),
                        "final_results": result.get("final_results")
                    })
                    # Update success if the original dict indicates success
                    if result.get("success") or result.get("generated_code"):
                        fallback_result["success"] = True
                        fallback_result["error"] = None
            except Exception as extraction_error:
                logger.error(f"Failed to extract data from result: {extraction_error}")
            
            return fallback_result
    
    def _create_error_json_output(self, error_message: str, user_query: str) -> dict:
        """Create standardized error output"""
        return {
            "success": False,
            "user_query": user_query,
            "error": error_message,
            "classification": None,
            "analysis": None,
            "review": None,
            "execution": None,
            "final_results": None,
            "generated_code": None,
            "retry_count": 0,
            "workflow_completed": False
        }


# Convenience function with enhanced error handling
def run_analysis(df, user_query: str, model_name: str = 'claude-3-opus-20240229') -> dict:
    """Run optimized analysis with structured output and enhanced reliability"""
    logger_instance = logging.getLogger(__name__)
    
    try:
        # Validate inputs before creating workflow
        if not user_query or len(user_query.strip()) < 5:
            logger_instance.error(f"Invalid query provided: '{user_query}'")
            return {
                "success": False,
                "user_query": user_query,
                "error": "Query is too short or empty",
                "classification": None,
                "analysis": None,
                "review": None,
                "execution": None,
                "final_results": None,
                "generated_code": None,
                "retry_count": 0,
                "workflow_completed": False
            }
        
        if df is None or df.empty:
            logger_instance.error("Empty or None dataframe provided")
            return {
                "success": False,
                "user_query": user_query,
                "error": "No data provided for analysis",
                "classification": None,
                "analysis": None,
                "review": None,
                "execution": None,
                "final_results": None,
                "generated_code": None,
                "retry_count": 0,
                "workflow_completed": False
            }
        
        # Log input details
        logger_instance.info(f"Creating workflow with model: {model_name}")
        logger_instance.info(f"Query to analyze: '{user_query}'")
        logger_instance.info(f"Dataframe shape: {df.shape}")
        logger_instance.debug(f"Dataframe columns: {df.columns.tolist()}")
        logger_instance.debug(f"Sample data:\n{df.head(2)}")
        
        # Create workflow
        workflow = DataAnalysisWorkflow(model_name=model_name)
        logger_instance.info("✅ Workflow created successfully")
        
        # Run analysis
        result = workflow.run_analysis(df, user_query)
        logger_instance.info("✅ Analysis execution completed")
        
        return result
        
    except Exception as e:
        logger_instance.error(f"Analysis execution failed: {e}")
        log_exception(logger_instance, "run_analysis function failed")
        return {
            "success": False,
            "user_query": user_query,
            "error": f"Workflow initialization or execution failed: {str(e)}",
            "classification": None,
            "analysis": None,
            "review": None,
            "execution": None,
            "final_results": None,
            "generated_code": None,
            "retry_count": 0,
            "workflow_completed": False
        }