import logging
import json
import os
from langgraph.graph import StateGraph, END
from langchain_anthropic.chat_models import ChatAnthropic

from models.data_analysis import AnalysisState
from ..nodes.nodes import (
    QueryClassificationNode, GeneralCodeGenerationNode, VisualizationCodeGenerationNode,
    CodeReviewNode, CodeRewriteNode, CodeExecutionNode, FinalResultsNode
)
from ..edges.edges import classify_query_edge, code_review_edge, execution_retry_edge
from core.config import settings

class DataAnalysisWorkflow:
    """Optimized data analysis workflow with structured output and reliable error handling"""
    
    def __init__(self, model_name: str = 'claude-3-opus-20240229', temperature: float = 0):
        self.logger = logging.getLogger(__name__)
        
        # Set the API key for Anthropic
        if not os.getenv("ANTHROPIC_API_KEY") and settings.ANTHROPIC_API_KEY:
            os.environ["ANTHROPIC_API_KEY"] = settings.ANTHROPIC_API_KEY
        
        # Initialize LLM with optimized retry configuration
        try:
            self.llm = ChatAnthropic(
                model=model_name, 
                temperature=temperature,
                max_retries=5,  # Increased retries for better reliability
                timeout=120,    # Increased timeout
                max_tokens=4000  # Ensure enough tokens for structured output
            )
            self.logger.info(f"✅ LLM initialized successfully with model: {model_name}")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize LLM: {e}")
            raise
        
        # Build graph
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        """Build the optimized analysis graph with structured output nodes"""
        self.logger.info("🏗️ Building optimized analysis graph with structured output...")
        
        builder = StateGraph(state_schema=AnalysisState)
        
        # Add nodes with structured output
        self.logger.debug("Adding structured output nodes...")
        try:
            builder.add_node("classify_query", QueryClassificationNode(self.llm))
            builder.add_node("general_code_gen", GeneralCodeGenerationNode(self.llm))
            builder.add_node("viz_code_gen", VisualizationCodeGenerationNode(self.llm))
            builder.add_node("review_code", CodeReviewNode(self.llm))
            builder.add_node("rewrite_code", CodeRewriteNode(self.llm))
            builder.add_node("execute_code", CodeExecutionNode())
            builder.add_node("final_results", FinalResultsNode(self.llm))
            self.logger.debug("✅ All nodes added successfully")
        except Exception as e:
            self.logger.error(f"❌ Failed to add nodes: {e}")
            raise
        
        # Set entry point
        builder.set_entry_point("classify_query")
        
        # Add edges with improved flow control
        self.logger.debug("Setting up graph edges...")
        
        # Node 1 → Node 2A/2B (conditional routing based on query type)
        builder.add_conditional_edges(
            "classify_query",
            classify_query_edge,
            {
                "general_path": "general_code_gen",
                "visualization_path": "viz_code_gen"
            }
        )
        
        # Node 2A/2B → Node 3 (both paths converge at review)
        builder.add_edge("general_code_gen", "review_code")
        builder.add_edge("viz_code_gen", "review_code")
        
        # Node 3 → Node 4/5 (conditional routing based on review)
        builder.add_conditional_edges(
            "review_code",
            code_review_edge,
            {
                "execute_code": "execute_code",
                "rewrite_code": "rewrite_code"
            }
        )
        
        # Node 4 → Node 3 (rewrite loops back to review)
        builder.add_edge("rewrite_code", "review_code")
        
        # Node 5 → Node 6/4 (conditional routing based on execution result)
        builder.add_conditional_edges(
            "execute_code",
            execution_retry_edge,
            {
                "final_results": "final_results",
                "rewrite_code": "rewrite_code"
            }
        )
        
        # Node 6 → END (final results to end)
        builder.add_edge("final_results", END)
        
        self.logger.info("✅ Optimized analysis graph built successfully with structured output")
        return builder.compile()
    
    def run_analysis(self, df, user_query: str) -> dict:
        """Run the complete analysis workflow with enhanced error handling"""
        self.logger.info(f"🎯 Starting optimized analysis for query: '{user_query}'")
        self.logger.info(f"📊 Dataset shape: {df.shape}")
        
        # Create initial state with validation
        try:
            initial_state = AnalysisState(
                user_query=user_query,
                df=df,
                max_retries=3  # Allow more retries for reliability
            )
            
            self.logger.debug("Initial state created successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to create initial state: {e}")
            return self._create_error_json_output(f"State creation failed: {str(e)}", user_query)
        
        try:
            # Execute the workflow
            self.logger.debug("Starting workflow execution...")
            result = self.graph.invoke(initial_state)
            
            # Validate and process result
            processed_result = self._process_workflow_result(result, user_query)
            
            self.logger.info("🎉 Analysis workflow completed successfully")
            return processed_result
            
        except Exception as e:
            self.logger.error(f"Workflow execution failed: {e}")
            return self._create_error_json_output(str(e), user_query)
    
    def _process_workflow_result(self, result, user_query: str) -> dict:
        """Process and structure the workflow result with enhanced data preservation"""
        try:
            # Handle both dict and AnalysisState objects
            if isinstance(result, dict):
                # Result is already a dict (error case)
                self.logger.warning("Received dict result instead of AnalysisState object")
                return result
            
            # Log the actual result type and query type for debugging
            query_type = result.classification.query_type.value if result.classification else "unknown"
            self.logger.info(f"Processing workflow result for query type: {query_type}")
            
            # Helper function to safely convert Pydantic to dict while preserving all data
            def safe_model_dump(obj):
                if obj and hasattr(obj, 'model_dump'):
                    dumped = obj.model_dump()
                    self.logger.debug(f"Dumped {type(obj).__name__}: {list(dumped.keys()) if dumped else 'None'}")
                    return dumped
                return None
            
            # Extract structured data from the actual AnalysisState object
            classification_dict = safe_model_dump(result.classification)
            analysis_dict = safe_model_dump(result.code_analysis)
            review_dict = safe_model_dump(result.code_review)
            execution_dict = safe_model_dump(result.execution_result)
            final_results_dict = safe_model_dump(result.final_results)
            
            # Log execution result for debugging
            if execution_dict:
                self.logger.info(f"Execution result - success: {execution_dict.get('success')}, visualization_created: {execution_dict.get('visualization_created')}")
            
            output = {
                "success": True,
                "user_query": user_query,
                "classification": classification_dict,
                "analysis": analysis_dict,
                "review": review_dict,
                "execution": execution_dict,
                "final_results": final_results_dict,
                "generated_code": result.current_code,
                "retry_count": result.retry_count,
                "workflow_completed": True
            }
            
            # Determine overall success - simplified logic
            execution_success = result.execution_result and result.execution_result.success
            final_success = result.final_results and result.final_results.success
            has_code = bool(result.current_code)
            
            # Simple success determination: if any major component succeeded
            overall_success = execution_success or final_success or has_code
            output["success"] = overall_success
            
            self.logger.info(f"Workflow result processed: success={overall_success}, query_type={query_type}")
            self.logger.debug(f"Output contains - classification: {bool(classification_dict)}, analysis: {bool(analysis_dict)}, execution: {bool(execution_dict)}, final_results: {bool(final_results_dict)}")
            
            return output
            
        except Exception as e:
            self.logger.error(f"Failed to process workflow result: {e}")
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
                self.logger.error(f"Failed to extract data from result: {extraction_error}")
            
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
    try:
        workflow = DataAnalysisWorkflow(model_name=model_name)
        return workflow.run_analysis(df, user_query)
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.error(f"Analysis execution failed: {e}")
        return {
            "success": False,
            "user_query": user_query,
            "error": f"Workflow initialization failed: {str(e)}",
            "classification": None,
            "analysis": None,
            "review": None,
            "execution": None,
            "final_results": None,
            "generated_code": None,
            "retry_count": 0,
            "workflow_completed": False
        }

