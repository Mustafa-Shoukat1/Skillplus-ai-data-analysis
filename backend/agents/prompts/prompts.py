from langchain_core.prompts import ChatPromptTemplate

# ===== NODE 1: UNDERSTANDING & CLASSIFY =====
PROMPT_CLASSIFY_QUERY = ChatPromptTemplate.from_template("""
You are a data analysis classifier. Analyze the user query and classify it as either:
- GENERAL: For data filtering, aggregation, statistics, summaries, calculations
- VISUALIZATION: For creating charts, graphs, plots, visual representations

User Query: "{user_query}"

Dataset Info:
- Shape: {dataset_shape}
- Columns: {columns}
- Sample Data: {sample_data}

Analyze the query and provide structured classification with:
- query_type: "general" or "visualization"
- reasoning: Why you chose this classification
- user_intent: What the user wants to achieve
- requires_data_filtering: Whether data filtering/selection is needed
- confidence: Your confidence level (0-1)

Focus on the user's intent - do they want to see data or visualize data?
""")

# ===== NODE 2A & 2B: QUERY ANALYSIS & CODE GENERATION =====
PROMPT_GENERAL_CODE_GENERATION = ChatPromptTemplate.from_template("""
You are a Python data analysis expert. Generate code for GENERAL data analysis (no visualization).

User Query: "{user_query}"
Classification: {classification}

Dataset Info:
- Shape: {dataset_shape}  
- Columns: {columns}
- Data Types: {data_types}
- Sample: {sample_data}

Generate Python code using pandas for:
- Data filtering, aggregation, statistics, calculations
- Print clear, formatted results
- Handle missing data appropriately
- Use df as the dataframe variable

Provide structured output:
- query_understanding: What the user wants
- approach: Your solution approach  
- required_columns: List of column names as array (e.g., ["col1", "col2"])
- generated_code: Complete Python code
- expected_output: What the code will produce

IMPORTANT: required_columns must be a JSON array of strings, not a string representation.
""")

PROMPT_VISUALIZATION_CODE_GENERATION = ChatPromptTemplate.from_template("""
You are a Python visualization expert. Generate code for VISUALIZATION using plotly.

User Query: "{user_query}"
Classification: {classification}

Dataset Info:
- Shape: {dataset_shape}
- Columns: {columns}
- Data Types: {data_types}
- Sample: {sample_data}

Generate Python code using pandas + plotly for:
- Create interactive visualizations
- Save as HTML file: 'plots/visualization.html'
- Create plots directory: os.makedirs('plots', exist_ok=True)
- Use appropriate chart types (bar, line, scatter, pie, etc.)
- Include proper titles, labels, and formatting
- Use df as the dataframe variable

Provide structured output:
- query_understanding: What visualization the user wants
- approach: Your visualization approach
- required_columns: List of column names as array (e.g., ["col1", "col2"])
- generated_code: Complete Python code with plotly
- expected_output: Description of the visualization

IMPORTANT: required_columns must be a JSON array of strings, not a string representation.
""")

# ===== NODE 3: CODE REVIEW =====
PROMPT_CODE_REVIEW = ChatPromptTemplate.from_template("""
You are a Python code reviewer. Review this code to ensure it correctly fulfills the user's query.

User Query: "{user_query}"
Generated Code:
```python
{generated_code}
```

Code Analysis Context: {code_analysis}

Review the code for:
1. Does it correctly address the user's query?
2. Are there any syntax or logic errors?
3. Will it produce the expected output?
4. Is error handling adequate?
5. Are required libraries imported?

Provide structured review:
- is_correct: true if code correctly fulfills user query
- review_status: "approved" or "needs_rewrite"
- issues: Array of issue strings (e.g., ["issue1", "issue2"])
- suggestions: Array of suggestion strings (e.g., ["suggestion1", "suggestion2"])
- confidence: Your confidence in the review (0-1)

IMPORTANT: issues and suggestions must be JSON arrays of strings, not single strings or bullet points.
Be strict - only approve if the code will definitely work and answer the user's question.
""")

# ===== NODE 4: CODE REWRITE =====
PROMPT_CODE_REWRITE = ChatPromptTemplate.from_template("""
The previous code had issues. Rewrite it to correctly fulfill the user query.

User Query: "{user_query}"
Previous Code:
```python
{previous_code}
```

Review Issues: {review_issues}
Suggestions: {review_suggestions}

Dataset Info:
- Shape: {dataset_shape}
- Columns: {columns}
- Data Types: {data_types}

Rewrite the code addressing all issues. Provide structured output:
- query_understanding: Clarified understanding
- approach: Improved approach
- required_columns: List of column names as array (e.g., ["col1", "col2"])
- generated_code: Fixed/rewritten code
- expected_output: What the new code will produce

IMPORTANT: required_columns must be a JSON array of strings, not a string representation.
Ensure the rewritten code is correct and will work properly.
""")

# ===== NODE 5: FINAL RESULTS =====
PROMPT_FINAL_RESULTS = ChatPromptTemplate.from_template("""
Generate final results summary for the completed data analysis.

User Query: "{user_query}"
Execution Result: {execution_result}
Query Type: {query_type}

Create a comprehensive final result:
- answer: Direct answer to user's question
- summary: What analysis was performed
- visualization_info: Details about any charts created
- success: Whether the analysis was successful

Make the answer clear, actionable, and user-friendly.
""")

