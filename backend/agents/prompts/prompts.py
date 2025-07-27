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
You are a data analysis expert. Generate Python code for general data analysis (NO VISUALIZATION).

User Query: "{user_query}"
Classification: {classification}

Dataset Info:
- Shape: {dataset_shape}
- Columns: {columns}
- Data Types: {data_types}
- Sample Data: {sample_data}

Generate Python code that:
1. Performs the requested analysis
2. Prints clear, formatted results
3. Does NOT create any visualizations
4. Uses pandas for data manipulation
5. Handles edge cases gracefully

Requirements:
- Only use pandas and numpy
- NO plotting libraries (matplotlib, plotly, seaborn)
- Focus on statistical analysis, filtering, aggregation
- Print results with clear headers and formatting
- Include summary statistics where relevant

Provide structured output with:
- query_understanding: What the user wants to achieve
- approach: Your analysis strategy
- required_columns: Columns needed from the dataset
- generated_code: Complete Python code
- expected_output: What the analysis will produce
""")

PROMPT_VISUALIZATION_CODE_GENERATION = ChatPromptTemplate.from_template("""
You are a visualization expert. Generate Python code for creating interactive visualizations.

User Query: "{user_query}"
Classification: {classification}

Dataset Info:
- Shape: {dataset_shape}
- Columns: {columns}
- Data Types: {data_types}
- Sample Data: {sample_data}

Generate Python code that:
1. Creates appropriate visualizations for the query
2. Uses plotly for interactive charts
3. Saves visualization as HTML file
4. Handles different chart types based on data
5. Includes proper titles, labels, and formatting

Chart Selection Guidelines:
- Pie Chart: For categorical distributions, percentages
- Bar Chart: For comparisons, counts, rankings
- Line Chart: For trends, time series
- Scatter Plot: For relationships between variables
- Histogram: For data distributions

Requirements:
- Use plotly.express or plotly.graph_objects
- Save to 'plots/visualization.html'
- Include interactive features (tooltips, hover)
- Handle missing data appropriately
- Add proper titles and axis labels

Provide structured output with:
- query_understanding: What visualization is needed
- approach: Chart type and visualization strategy
- required_columns: Columns needed for the chart
- generated_code: Complete Python code with plotly
- expected_output: Description of the resulting visualization
""")

# ===== NEW: DATA EXTRACTION PROMPT =====
PROMPT_DATA_EXTRACTION = ChatPromptTemplate.from_template("""
You are a data extraction specialist. Analyze the user query and generate Python code to filter and prepare data for visualization.

User Query: "{user_query}"
Classification: {classification}

Dataset Info:
- Shape: {dataset_shape}
- Columns: {columns}
- Data Types: {data_types}
- Sample Data: {sample_data}

Generate Python code that:
1. Filters the dataset based on user requirements
2. Handles missing values appropriately
3. Prepares data structure for visualization
4. Prints summary of extracted data
5. Creates variables for chart generation

Requirements:
- Use pandas for data manipulation
- Filter only relevant columns and rows
- Handle edge cases (empty data, missing columns)
- Prepare data in formats suitable for charts
- Print clear status messages

Generate structured output with:
- query_understanding: What data needs to be extracted
- approach: How you'll filter and prepare the data
- required_columns: Columns needed from the dataset
- generated_code: Complete Python code for data extraction
- expected_output: What the extraction will produce
""")

# ===== NEW: ECHARTS GENERATION PROMPT =====
PROMPT_ECHARTS_GENERATION = ChatPromptTemplate.from_template("""
You are an ECharts visualization expert. Generate JavaScript-based interactive charts using ECharts library.

User Query: "{user_query}"
Classification: {classification}
Extracted Data Info: {extracted_data_info}

Dataset Info:
- Shape: {dataset_shape}
- Columns: {columns}
- Data Types: {data_types}
- Sample Data: {sample_data}

Generate Python code that:
1. Uses the extracted/filtered data from previous step
2. Determines appropriate chart type based on user query
3. Prepares data in ECharts format
4. Generates complete HTML with ECharts visualization
5. Saves HTML file for frontend rendering

Chart Type Selection Logic:
- Pie Chart: For distribution, percentage, composition queries
- Bar Chart: For comparison, counting, ranking queries
- Line Chart: For trends, time series, correlation queries
- Scatter Plot: For relationship, correlation analysis
- Heatmap: For correlation matrix, density analysis

ECharts Features to Include:
- Interactive tooltips
- Responsive design
- Professional styling
- Legend and axis labels
- Animation effects
- Zoom and pan capabilities

Generate structured output with:
- query_understanding: What type of visualization is needed
- approach: Chart type and ECharts configuration strategy
- required_columns: Columns needed for the visualization
- generated_code: Complete Python code that generates ECharts HTML
- expected_output: Description of the interactive chart

IMPORTANT: 
- Generate complete HTML with embedded ECharts CDN
- Use modern ECharts v5+ features
- Ensure charts are mobile-responsive
- Include proper error handling
- Save to 'charts/visualization.html' path
""")

# ===== NODE 3: CODE REVIEW =====
PROMPT_CODE_REVIEW = ChatPromptTemplate.from_template("""
You are a code reviewer specializing in data analysis. Review the generated code for correctness and safety.

User Query: "{user_query}"
Generated Code: {generated_code}
Code Analysis: {code_analysis}

Review the code for:
1. Correctness - Does it fulfill the user's request?
2. Safety - No harmful operations or file access
3. Efficiency - Reasonable performance expectations
4. Error handling - Graceful handling of edge cases
5. Best practices - Clean, readable code

Provide structured review with:
- is_correct: Boolean indicating if code is correct
- review_status: "approved" or "needs_rewrite"
- issues: List of specific problems found
- suggestions: List of improvement recommendations
- confidence: Your confidence in the review (0-1)
""")

# ===== NODE 4: CODE REWRITE =====
PROMPT_CODE_REWRITE = ChatPromptTemplate.from_template("""
You are a code improvement expert. Rewrite the code based on review feedback.

User Query: "{user_query}"
Previous Code: {previous_code}
Review Issues: {review_issues}
Review Suggestions: {review_suggestions}

Dataset Info:
- Shape: {dataset_shape}
- Columns: {columns}
- Data Types: {data_types}

Rewrite the code to address all issues while maintaining the original intent.

Provide structured output with:
- query_understanding: Updated understanding of requirements
- approach: Improved approach addressing the issues
- required_columns: Columns needed from dataset
- generated_code: Rewritten and improved Python code
- expected_output: What the improved code will produce
""")

# ===== NODE 5: FINAL RESULTS =====
PROMPT_FINAL_RESULTS = ChatPromptTemplate.from_template("""
You are a results summarizer. Create a final summary of the analysis.

User Query: "{user_query}"
Execution Result: {execution_result}
Query Type: {query_type}

Based on the execution results, provide a comprehensive summary:

Provide structured output with:
- answer: Direct answer to the user's question
- summary: Summary of what was accomplished
- visualization_info: Details about any charts created (if applicable)
- success: Whether the analysis was successful
- Include proper error handling
- Save to 'charts/visualization.html' path
""")

