from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Type, TypeVar
import time
import random
from pydantic import BaseModel
from models.data_analysis import AnalysisState
from core.logger import logger, log_exception

T = TypeVar('T', bound=BaseModel)

class BaseNode(ABC):
    """Abstract base class for all nodes in the analysis graph"""
    
    def __init__(self, node_name: str, custom_logger: Optional[Any] = None):
        self.node_name = node_name
        self.logger = custom_logger or logger
        
    @abstractmethod
    def execute(self, state: AnalysisState) -> AnalysisState:
        """Execute the node's main functionality"""
        pass
    
    def __call__(self, state: AnalysisState) -> AnalysisState:
        """Make the node callable with proper error handling and logging"""
        try:
            self.logger.info(f"🔄 Executing node: {self.node_name}")
            result = self.execute(state)
            self.logger.info(f"✅ Node {self.node_name} completed successfully")
            return result
        except Exception as e:
            log_exception(self.logger, f"❌ Error in node {self.node_name}")
            raise
    
    def validate_state(self, state: AnalysisState, required_attrs: list) -> bool:
        """Validate that the state has required attributes"""
        for attr in required_attrs:
            if not hasattr(state, attr) or getattr(state, attr) is None:
                raise ValueError(f"Required attribute '{attr}' is missing from state")
        return True

class StructuredChainNode(BaseNode):
    """Base class for nodes that use LangChain with structured output"""
    
    def __init__(self, node_name: str, llm: Any, output_model: Type[T], custom_logger: Optional[Any] = None):
        super().__init__(node_name, custom_logger)
        self.llm = llm
        self.output_model = output_model
        self._chain = None
    
    @abstractmethod
    def create_chain_with_structured_llm(self, structured_llm):
        """Create chain using the structured LLM - this is the method nodes must implement"""
        pass
    
    @property
    def chain(self):
        """Lazy loading of the chain with structured output"""
        if self._chain is None:
            structured_llm = self.llm.with_structured_output(self.output_model)
            self._chain = self.create_chain_with_structured_llm(structured_llm)
        return self._chain
    
    def invoke_chain_with_fallback(self, inputs: Dict[str, Any], max_retries: int = 3) -> T:
        """Invoke chain with retry logic and fallback mechanism"""
        last_error = None
        
        for attempt in range(max_retries):
            try:
                self.logger.debug(f"Invoking structured chain for {self.node_name}, attempt {attempt + 1}")
                result = self.chain.invoke(inputs)
                
                # Validate and fix the result
                if not isinstance(result, self.output_model):
                    self.logger.warning(f"Result type mismatch in {self.node_name}. Expected {self.output_model}, got {type(result)}")
                    # Try to convert if possible
                    if isinstance(result, dict):
                        # Fix common validation issues
                        result = self._fix_validation_issues(result)
                        result = self.output_model(**result)
                    else:
                        raise ValueError(f"Cannot convert {type(result)} to {self.output_model}")
                
                self.logger.debug(f"Structured chain invocation successful for {self.node_name}")
                return result
                
            except Exception as e:
                error_str = str(e).lower()
                last_error = e
                
                # Check for API overload errors
                if any(keyword in error_str for keyword in ['529', 'overloaded', 'rate limit', 'too many requests']):
                    if attempt < max_retries - 1:
                        wait_time = (2 ** attempt) + random.uniform(0, 1)
                        self.logger.warning(f"API overloaded (attempt {attempt + 1}/{max_retries}), retrying in {wait_time:.2f}s...")
                        time.sleep(wait_time)
                        continue
                
                # For parsing errors, try once more with different approach
                if "parsing" in error_str or "json" in error_str or "schema" in error_str or "validation error" in error_str:
                    if attempt < max_retries - 1:
                        self.logger.warning(f"Parsing/validation error in {self.node_name} (attempt {attempt + 1}/{max_retries}), retrying...")
                        time.sleep(1)
                        continue
                
                # For other errors, raise immediately if it's the last attempt
                if attempt == max_retries - 1:
                    log_exception(self.logger, f"All {max_retries} attempts failed for {self.node_name}")
                    break
        
        # If all retries failed, return fallback
        self.logger.error(f"All attempts failed for {self.node_name}, creating fallback response")
        return self.create_fallback_response(inputs, last_error)
    
    def _fix_validation_issues(self, result_dict: dict) -> dict:
        """Fix common validation issues in the result"""
        import ast
        
        # Fix string lists (common issue with LLM responses)
        for key, value in result_dict.items():
            if isinstance(value, str):
                # Try to parse string representations of lists
                if value.startswith('[') and value.endswith(']'):
                    try:
                        result_dict[key] = ast.literal_eval(value)
                        self.logger.debug(f"Fixed string list for {key}: {value} -> {result_dict[key]}")
                    except:
                        # If it fails, split by common delimiters
                        if ',' in value:
                            result_dict[key] = [item.strip().strip("'\"") for item in value.strip('[]').split(',')]
                            self.logger.debug(f"Split string list for {key}: {value} -> {result_dict[key]}")
                
                # Fix multi-line strings that should be lists (for issues/suggestions)
                elif key in ['issues', 'suggestions'] and ('\n-' in value or '\n•' in value):
                    # Split by bullet points
                    lines = [line.strip().lstrip('-•').strip() for line in value.split('\n') if line.strip() and line.strip().startswith(('-', '•'))]
                    if lines:
                        result_dict[key] = lines
                        self.logger.debug(f"Fixed bullet list for {key}: converted to {len(lines)} items")
                    else:
                        result_dict[key] = [value]  # Fallback to single item list
        
        return result_dict

class ChainNode(BaseNode):
    """Legacy base class for backward compatibility"""
    
    def __init__(self, node_name: str, llm: Any, custom_logger: Optional[Any] = None):
        super().__init__(node_name, custom_logger)
        self.llm = llm
        self._chain = None
    
    @abstractmethod
    def create_chain(self):
        """Create the LangChain chain for this node"""
        pass
    
    @property
    def chain(self):
        """Lazy loading of the chain"""
        if self._chain is None:
            self._chain = self.create_chain()
        return self._chain
    
    def invoke_chain(self, inputs: Dict[str, Any], max_retries: int = 3) -> Any:
        """Invoke the chain with retry logic for API overload errors"""
        last_error = None
        
        for attempt in range(max_retries):
            try:
                self.logger.debug(f"Invoking chain for {self.node_name}, attempt {attempt + 1}")
                result = self.chain.invoke(inputs)
                self.logger.debug(f"Chain invocation successful for {self.node_name}")
                return result
            except Exception as e:
                error_str = str(e).lower()
                
                # Check for API overload errors (529, rate limit, overloaded)
                if any(keyword in error_str for keyword in ['529', 'overloaded', 'rate limit', 'too many requests']):
                    if attempt < max_retries - 1:
                        # Exponential backoff with jitter
                        wait_time = (2 ** attempt) + random.uniform(0, 1)
                        self.logger.warning(f"API overloaded (attempt {attempt + 1}/{max_retries}), retrying in {wait_time:.2f}s...")
                        time.sleep(wait_time)
                        last_error = e
                        continue
                
                # For non-retriable errors, raise immediately
                log_exception(self.logger, f"Chain invocation failed in {self.node_name}")
                raise
        
        # If all retries failed
        self.logger.error(f"All {max_retries} attempts failed for {self.node_name}")
        raise last_error

