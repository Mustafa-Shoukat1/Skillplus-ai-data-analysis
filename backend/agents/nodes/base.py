from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Type, TypeVar
import time
import random
from pydantic import BaseModel
from models.data_analysis import AnalysisState
from core.logger import logger, log_exception

T = TypeVar('T', bound=BaseModel)

class BaseNode(ABC):
    """Base class for all workflow nodes"""
    
    def __init__(self, name: str, custom_logger: Optional[Any] = None):
        self.name = name
        self.logger = custom_logger or logger
    
    @abstractmethod
    def execute(self, state: Any) -> Any:
        """Execute the node logic"""
        pass
    
    def validate_state(self, state: Any, required_fields: list):
        """Validate that required fields exist in state"""
        for field in required_fields:
            if not hasattr(state, field) or getattr(state, field) is None:
                raise ValueError(f"Required field '{field}' is missing or None")

class StructuredChainNode(BaseNode):
    """Base class for nodes that use structured LLM chains"""
    
    def __init__(self, name: str, llm: Any, output_model: Type[BaseModel], custom_logger: Optional[Any] = None):
        super().__init__(name, custom_logger)
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
    
    @abstractmethod
    def create_fallback_response(self, inputs: Dict[str, Any], error: Exception) -> BaseModel:
        """Create a fallback response when the chain fails"""
        pass
    
    def invoke_chain_with_fallback(self, inputs: Dict[str, Any]) -> BaseModel:
        """Invoke the chain with fallback handling"""
        try:
            if self.chain is None:
                raise Exception("Chain not initialized")
            
            result = self.chain.invoke(inputs)
            
            if result is None:
                raise Exception("Chain returned None")
            
            return result
            
        except Exception as e:
            self.logger.error(f"Chain invocation failed: {e}")
            return self.create_fallback_response(inputs, e)
    
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

