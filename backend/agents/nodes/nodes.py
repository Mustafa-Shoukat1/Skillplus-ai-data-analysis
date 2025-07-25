import os
import traceback
from typing import Any, Dict
from langchain_experimental.tools import PythonREPLTool

from .base import StructuredChainNode, BaseNode
from models.data_analysis import (
    AnalysisState, QueryClassification, CodeAnalysis, 
    CodeReview, ExecutionResult, FinalResults, QueryType
)
from ..prompts.prompts import (
    PROMPT_CLASSIFY_QUERY, PROMPT_GENERAL_CODE_GENERATION,
    PROMPT_VISUALIZATION_CODE_GENERATION, PROMPT_CODE_REVIEW,
    PROMPT_CODE_REWRITE, PROMPT_FINAL_RESULTS
)
from core.logger import logger, log_exception
class QueryClassificationNode(StructuredChainNode):
    """Node 1: Understanding & Classify Query with Structured Output"""
    
    def __init__(self, llm: Any):
        super().__init__("QueryClassification", llm, QueryClassification)
    
    def create_chain_with_structured_llm(self, structured_llm):
        return PROMPT_CLASSIFY_QUERY | structured_llm
    
    def create_fallback_response(self, inputs: Dict[str, Any], error: Exception) -> QueryClassification:
        """Create fallback classification when API fails"""
        self.logger.warning(f"Creating fallback classification due to error: {str(error)}")
        return QueryClassification(
            query_type=QueryType.GENERAL,
            reasoning=f"Fallback classification due to API error: {str(error)[:100]}",
            user_intent="General data analysis (fallback)",
            requires_data_filtering=False,
            confidence=0.3
        )
    
    def execute(self, state: AnalysisState) -> AnalysisState:
        self.validate_state(state, ['user_query', 'df'])
        
        classification = self.invoke_chain_with_fallback({
            "user_query": state.user_query,
            "dataset_shape": state.df.shape,
            "columns": state.df.columns.tolist(),
            "sample_data": state.df.head(2).to_string()
        })
        
        self.logger.info(f"Query classified as: {classification.query_type.value} with confidence: {classification.confidence}")
        
        return state.model_copy(update={"classification": classification})

class GeneralCodeGenerationNode(StructuredChainNode):
    """Node 2A: General Query Code Generation with Structured Output"""
    
    def __init__(self, llm: Any):
        super().__init__("GeneralCodeGeneration", llm, CodeAnalysis)
    
    def create_chain_with_structured_llm(self, structured_llm):
        return PROMPT_GENERAL_CODE_GENERATION | structured_llm
    
    def create_fallback_response(self, inputs: Dict[str, Any], error: Exception) -> CodeAnalysis:
        """Create fallback code analysis for general queries"""
        self.logger.warning(f"Creating fallback general code due to error: {str(error)}")
        
        # Extract basic info from inputs for fallback
        columns = inputs.get("columns", [])
        sample_columns = columns[:3] if columns else ["col1", "col2", "col3"]
        
        fallback_code = f"""
# General data analysis (NO VISUALIZATION)
import pandas as pd
import numpy as np

print("=== GENERAL DATA ANALYSIS ===")
print("Dataset Overview:")
print(f"Shape: {{df.shape}}")
print(f"Columns: {{df.columns.tolist()}}")
print()

print("Basic Statistics:")
print(df.describe())
print()

print("Data Types:")
print(df.dtypes)
print()

print("Sample Data:")
print(df.head(10))
print()

print("Missing Values:")
print(df.isnull().sum())
"""
        
        return CodeAnalysis(
            query_understanding=f"Fallback general analysis for: {inputs.get('user_query', 'unknown query')}",
            approach="Basic data exploration and statistics - NO VISUALIZATION",
            required_columns=sample_columns,
            generated_code=fallback_code,
            expected_output="Basic dataset overview, statistics, and sample data (text output only)"
        )
    
    def execute(self, state: AnalysisState) -> AnalysisState:
        code_analysis = self.invoke_chain_with_fallback({
            "user_query": state.user_query,
            "classification": state.classification.model_dump_json() if state.classification else "{}",
            "dataset_shape": state.df.shape,
            "columns": state.df.columns.tolist(),
            "data_types": {str(col): str(dtype) for col, dtype in state.df.dtypes.items()},
            "sample_data": state.df.head(3).to_string()
        })
        
        self.logger.info(f"Generated general code with {len(code_analysis.required_columns)} required columns")
        
        return state.model_copy(update={
            "code_analysis": code_analysis,
            "current_code": code_analysis.generated_code
        })

class VisualizationCodeGenerationNode(StructuredChainNode):
    """Node 2B: Visualization Query Code Generation with Structured Output"""
    
    def __init__(self, llm: Any):
        super().__init__("VisualizationCodeGeneration", llm, CodeAnalysis)
    
    def create_chain_with_structured_llm(self, structured_llm):
        return PROMPT_VISUALIZATION_CODE_GENERATION | structured_llm
    
    def create_fallback_response(self, inputs: Dict[str, Any], error: Exception) -> CodeAnalysis:
        """Create fallback visualization code"""
        self.logger.warning(f"Creating fallback visualization code due to error: {str(error)}")
        
        # Try to get numeric columns from inputs
        columns = inputs.get("columns", [])
        data_types = inputs.get("data_types", {})
        
        # Find numeric columns for visualization
        numeric_cols = [col for col, dtype in data_types.items() if 'int' in str(dtype).lower() or 'float' in str(dtype).lower()]
        if not numeric_cols and columns:
            numeric_cols = columns[:1]  # Use first column as fallback
        
        # ENHANCED fallback code with better pie chart support
        fallback_code = f"""
# Enhanced fallback visualization code
import plotly.express as px
import plotly.graph_objects as go
import os
import pandas as pd

# Create plots directory with absolute path
plots_dir = os.path.abspath('plots')
os.makedirs(plots_dir, exist_ok=True)
html_file = os.path.join(plots_dir, 'visualization.html')

try:
    print(f"Dataset shape: {{df.shape}}")
    print(f"Columns available: {{df.columns.tolist()}}")
    
    # Get numeric columns
    numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
    
    # Check if user wants pie chart (common request)
    user_query_lower = "{inputs.get('user_query', '').lower()}"
    wants_pie = any(word in user_query_lower for word in ['pie', 'piechart', 'pie chart'])
    
    if wants_pie and len(numeric_cols) > 0:
        # Create pie chart for top values
        if len(df) > 10:
            # Get top 5 entries by the first numeric column
            top_data = df.nlargest(5, numeric_cols[0])
        else:
            top_data = df.head(10)
            
        # Use first text column for labels, first numeric for values
        text_cols = df.select_dtypes(include=['object']).columns.tolist()
        label_col = text_cols[0] if text_cols else df.columns[0]
        value_col = numeric_cols[0]
        
        fig = px.pie(top_data, 
                    names=label_col, 
                    values=value_col,
                    title=f'Top 5 {{label_col}} by {{value_col}}')
        
        # Add explode effect and interactivity
        fig.update_traces(
            textposition='inside', 
            textinfo='percent+label',
            hovertemplate='<b>%{{label}}</b><br>Value: %{{value}}<br>Percentage: %{{percent}}<extra></extra>',
            pull=[0.1 if i == 0 else 0 for i in range(len(top_data))]  # Explode first slice
        )
        
        fig.update_layout(
            showlegend=True,
            height=500,
            font=dict(size=12)
        )
        
        print(f"Created pie chart with {{len(top_data)}} slices")
        
    elif len(numeric_cols) > 0:
        # Create histogram for first numeric column
        fig = px.histogram(df, x=numeric_cols[0], 
                          title=f'Distribution of {{numeric_cols[0]}}',
                          labels={{'x': numeric_cols[0], 'y': 'Frequency'}})
        print(f"Created histogram for {{numeric_cols[0]}}")
        
    else:
        # Create count plot of the first column
        first_col = df.columns[0]
        value_counts = df[first_col].value_counts().head(10)
        
        fig = px.bar(x=value_counts.index, y=value_counts.values,
                    title=f'Top 10 Values in {{first_col}}',
                    labels={{'x': first_col, 'y': 'Count'}})
        print(f"Created bar chart for {{first_col}}")
    
    # Save the visualization
    fig.write_html(html_file)
    print(f"✅ Visualization saved to: {{html_file}}")
    print(f"File exists: {{os.path.exists(html_file)}}")
    
except Exception as e:
    print(f"❌ Visualization error: {{e}}")
    # Create a simple table as ultimate fallback
    try:
        sample_data = df.head(10)
        fig = go.Figure(data=[go.Table(
            header=dict(values=list(sample_data.columns),
                       fill_color='paleturquoise',
                       align='left'),
            cells=dict(values=[sample_data[col] for col in sample_data.columns],
                      fill_color='lavender',
                      align='left'))
        ])
        fig.update_layout(title="Data Table (Fallback)")
        fig.write_html(html_file)
        print(f"✅ Fallback table saved to: {{html_file}}")
    except Exception as table_error:
        print(f"❌ Even table fallback failed: {{table_error}}")
"""
        
        return CodeAnalysis(
            query_understanding=f"Fallback visualization for: {inputs.get('user_query', 'unknown query')}",
            approach="Enhanced pie chart or histogram visualization with fallbacks",
            required_columns=numeric_cols or columns[:1],
            generated_code=fallback_code,
            expected_output="Interactive chart saved as HTML file with proper error handling"
        )
    
    def execute(self, state: AnalysisState) -> AnalysisState:
        code_analysis = self.invoke_chain_with_fallback({
            "user_query": state.user_query,
            "classification": state.classification.model_dump_json() if state.classification else "{}",
            "dataset_shape": state.df.shape,
            "columns": state.df.columns.tolist(),
            "data_types": {str(col): str(dtype) for col, dtype in state.df.dtypes.items()},
            "sample_data": state.df.head(3).to_string()
        })
        
        self.logger.info(f"Generated visualization code targeting columns: {code_analysis.required_columns}")
        
        return state.model_copy(update={
            "code_analysis": code_analysis,
            "current_code": code_analysis.generated_code
        })

class CodeReviewNode(StructuredChainNode):
    """Node 3: Review Generated Code with Structured Output"""
    
    def __init__(self, llm: Any):
        super().__init__("CodeReview", llm, CodeReview)
    
    def create_chain_with_structured_llm(self, structured_llm):
        return PROMPT_CODE_REVIEW | structured_llm
    
    def create_fallback_response(self, inputs: Dict[str, Any], error: Exception) -> CodeReview:
        """Create fallback review when API fails"""
        self.logger.warning(f"Creating fallback code review due to error: {str(error)}")
        
        # Auto-approve with low confidence when review fails
        return CodeReview(
            is_correct=True,
            review_status="approved",
            issues=[f"Review skipped due to API error: {str(error)[:100]}"],
            suggestions=["Manual review recommended due to API failure"],
            confidence=0.2
        )
    
    def execute(self, state: AnalysisState) -> AnalysisState:
        if not state.current_code:
            fallback_review = CodeReview(
                is_correct=False,
                review_status="needs_rewrite",
                issues=["No code available to review"],
                suggestions=["Generate code first"],
                confidence=0.0
            )
            return state.model_copy(update={"code_review": fallback_review})
        
        code_review = self.invoke_chain_with_fallback({
            "user_query": state.user_query,
            "generated_code": state.current_code,
            "code_analysis": state.code_analysis.model_dump_json() if state.code_analysis else "{}"
        })
        
        self.logger.info(f"Code review completed: {code_review.review_status} (confidence: {code_review.confidence})")
        if code_review.issues:
            self.logger.warning(f"Issues found: {code_review.issues}")
        
        return state.model_copy(update={"code_review": code_review})

class CodeRewriteNode(StructuredChainNode):
    """Node 4: Rewrite Code Based on Review with Structured Output"""
    
    def __init__(self, llm: Any):
        super().__init__("CodeRewrite", llm, CodeAnalysis)
    
    def create_chain_with_structured_llm(self, structured_llm):
        return PROMPT_CODE_REWRITE | structured_llm
    
    def create_fallback_response(self, inputs: Dict[str, Any], error: Exception) -> CodeAnalysis:
        """Create fallback when rewrite fails"""
        self.logger.warning(f"Creating fallback rewrite due to error: {str(error)}")
        
        # Return the previous code with minimal changes
        previous_code = inputs.get("previous_code", "# No previous code available")
        
        return CodeAnalysis(
            query_understanding=f"Fallback rewrite for: {inputs.get('user_query', 'unknown query')}",
            approach="Using previous code with error handling additions",
            required_columns=inputs.get("columns", [])[:3],
            generated_code=f"""
# Rewrite fallback due to API error
try:
{chr(10).join('    ' + line for line in previous_code.split(chr(10)))}
except Exception as e:
    print(f"Execution error: {{e}}")
    print("Basic data info:")
    print(f"Dataset shape: {{df.shape}}")
    print(f"Columns: {{df.columns.tolist()}}")
""",
            expected_output="Previous code with added error handling"
        )

    def execute(self, state: AnalysisState) -> AnalysisState:
        rewritten_analysis = self.invoke_chain_with_fallback({
            "user_query": state.user_query,
            "previous_code": state.current_code,
            "review_issues": state.code_review.issues if state.code_review else [],
            "review_suggestions": state.code_review.suggestions if state.code_review else [],
            "dataset_shape": state.df.shape,
            "columns": state.df.columns.tolist(),
            "data_types": {str(col): str(dtype) for col, dtype in state.df.dtypes.items()}
        })
        
        self.logger.info(f"Code rewritten with approach: {rewritten_analysis.approach}")
        
        return state.model_copy(update={
            "code_analysis": rewritten_analysis,
            "current_code": rewritten_analysis.generated_code,
            "retry_count": state.retry_count + 1
        })

class CodeExecutionNode(BaseNode):
    """Node 5: Execute Python Code with proper dataframe injection"""
    
    def __init__(self):
        super().__init__("CodeExecution")
        self.py_tool = PythonREPLTool()
    
    def execute(self, state: AnalysisState) -> AnalysisState:
        if not state.current_code:
            result = ExecutionResult(
                success=False,
                output="No code to execute"
            )
            return state.model_copy(update={"execution_result": result})
        
        # Determine if this is a visualization query
        is_visualization_query = (
            state.classification and 
            state.classification.query_type.value == "visualization"
        )
        
        try:
            # Prepare code for execution with actual dataframe
            full_code = self._prepare_code_for_execution(state.df, state.current_code, is_visualization_query)
            
            # Log the prepared code for debugging
            logger.debug(f"Executing code for {'visualization' if is_visualization_query else 'general'} query")
            logger.debug(f"Code length: {len(full_code)} characters")
            
            # Execute code
            output = self.py_tool.invoke(full_code)
            
            # For general queries, don't check for visualization files
            if is_visualization_query:
                created_files = self._get_created_files()
                viz_created = len(created_files) > 0 or self._check_visualization_created(state.current_code)
            else:
                # For general queries, explicitly set no visualization
                created_files = []
                viz_created = False
                self.logger.info("General query executed - no visualization files expected")
            
            # Create execution result
            result = ExecutionResult(
                success=True,
                output=str(output),
                result_data=str(output),
                visualization_created=viz_created,
                file_paths=created_files
            )
            
            self.logger.info(f"✅ Code executed successfully. Query type: {'visualization' if is_visualization_query else 'general'}, Visualization created: {viz_created}")
            if created_files:
                self.logger.info(f"Created files: {created_files}")
            
            return state.model_copy(update={"execution_result": result})
            
        except Exception as e:
            error_msg = f"Execution Error: {str(e)}\n{traceback.format_exc()}"
            result = ExecutionResult(success=False, output=error_msg)
            
            self.logger.error(f"❌ Code execution failed: {str(e)}")
            
            return state.model_copy(update={"execution_result": result})
    
    def _prepare_code_for_execution(self, df, code: str, is_visualization: bool = False) -> str:
        """Prepare code with the actual dataframe data - NO FILE LOADING"""
        
        if is_visualization:
            # Full setup for visualization queries - but with dataframe data directly
            setup_code = f"""
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import os
import warnings
warnings.filterwarnings('ignore')

# Create plots directory
plots_dir = os.path.abspath('plots')
os.makedirs(plots_dir, exist_ok=True)

# Load the dataframe from provided data (NOT from file)
df_data = {df.to_dict('records')}
df = pd.DataFrame(df_data)

print(f"Dataframe loaded successfully. Shape: {{df.shape}}")
print(f"Columns: {{df.columns.tolist()}}")
print(f"Sample data:")
print(df.head(3))
"""
        else:
            # Minimal setup for general queries - NO VISUALIZATION IMPORTS
            setup_code = f"""
import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')

# Load the dataframe from provided data (NOT from file)
df_data = {df.to_dict('records')}
df = pd.DataFrame(df_data)

print(f"Dataframe loaded successfully. Shape: {{df.shape}}")
print(f"Columns: {{df.columns.tolist()}}")
"""
        
        # Remove any file loading code from the generated code
        cleaned_code = self._remove_file_loading_code(code)
        
        return setup_code + "\n" + cleaned_code
    
    def _remove_file_loading_code(self, code: str) -> str:
        """Remove file loading statements from generated code"""
        lines = code.split('\n')
        cleaned_lines = []
        
        for line in lines:
            # Skip lines that try to load files
            if any(pattern in line.lower() for pattern in [
                'pd.read_csv', 'pd.read_excel', 'pd.read_', 
                'read_csv', 'read_excel', '.csv', '.xlsx',
                'df = pd.read', 'df=pd.read'
            ]):
                self.logger.debug(f"Removing file loading line: {line.strip()}")
                continue
            cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)
    
    def _check_visualization_created(self, code: str) -> bool:
        """Check if visualization was created - only for visualization queries"""
        viz_indicators = [
            "plots/visualization.html",
            "write_html",
            "to_html",
            "fig.write_html",
            "plotly",
            "matplotlib",
            "seaborn"
        ]
        return any(indicator in code for indicator in viz_indicators)
    
    def _get_created_files(self) -> list:
        """Get list of created files - only check if we expect visualization files"""
        files = []
        
        # Check multiple possible locations
        possible_paths = [
            'plots/visualization.html',
            './plots/visualization.html',
            os.path.abspath('plots/visualization.html'),
            os.path.join(os.getcwd(), 'plots', 'visualization.html')
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                abs_path = os.path.abspath(path)
                if abs_path not in files:
                    files.append(abs_path)
                    self.logger.info(f"Found visualization file: {abs_path}")
                break
        
        return files

class FinalResultsNode(StructuredChainNode):
    """Node 6: Generate Final Results with Structured Output"""
    
    def __init__(self, llm: Any):
        super().__init__("FinalResults", llm, FinalResults)
    
    def create_chain_with_structured_llm(self, structured_llm):
        return PROMPT_FINAL_RESULTS | structured_llm
    
    def create_fallback_response(self, inputs: Dict[str, Any], error: Exception) -> FinalResults:
        """Create fallback final results"""
        self.logger.warning(f"Creating fallback final results due to error: {str(error)}")
        
        # Extract basic info from inputs
        user_query = inputs.get("user_query", "Unknown query")
        execution_result = inputs.get("execution_result", "{}")
        
        # Try to parse execution result
        execution_success = False
        if execution_result and execution_result != "{}":
            try:
                if isinstance(execution_result, str):
                    import json
                    exec_data = json.loads(execution_result)
                    execution_success = exec_data.get("success", False)
                elif isinstance(execution_result, dict):
                    execution_success = execution_result.get("success", False)
            except:
                pass
        
        if execution_success:
            answer = "Analysis completed successfully. Please check the execution output for detailed results."
            summary = f"Successfully processed query: {user_query}"
            success = True
        else:
            answer = "Analysis completed with some issues. Code was generated but execution may have encountered problems."
            summary = f"Partial analysis completed for: {user_query}"
            success = False
        
        return FinalResults(
            answer=answer,
            summary=summary,
            visualization_info=None,
            success=success
        )
    
    def execute(self, state: AnalysisState) -> AnalysisState:
        final_results = self.invoke_chain_with_fallback({
            "user_query": state.user_query,
            "execution_result": state.execution_result.model_dump_json() if state.execution_result else "{}",
            "query_type": state.classification.query_type.value if state.classification else "unknown"
        })
        
        # Add visualization info if available
        if state.execution_result and state.execution_result.visualization_created:
            final_results.visualization_info = {
                "files_created": state.execution_result.file_paths,
                "type": "interactive_html"
            }
        
        self.logger.info(f"🎯 Final results generated: success={final_results.success}")
        
        return state.model_copy(update={"final_results": final_results})
