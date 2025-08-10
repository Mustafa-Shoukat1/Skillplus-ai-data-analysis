from langchain_core.prompts import PromptTemplate


START_PROMPT = PromptTemplate(
    input_variables=["user_input", "available_sheets"],
    template="""
    You are an expert data analyst. Analyze the user's query and classify the type of analysis needed.

    User Query: "{user_input}"

    Available Data Sheets: {available_sheets}

    Classification Guidelines:
    - "skill": Analysis of skills, competencies, capabilities, training needs
    - "gap": Analysis of gaps, deficiencies, missing elements, shortfalls
    - "count": Counting, tallying, totaling employees, records, items
    - "summary": General overview, statistical summary, descriptive analysis
    - "comparison": Comparing between groups, departments, time periods
    - "unknown": Cannot determine clear analysis type

    For sheet suggestion, consider:
    - "Back Office" for administrative roles
    - "Call Center" for customer service roles
    - "Leaders" for management and leadership roles
    - "Retail" for retail/sales roles
    - "Summary" for overall organizational data

    Analyze the query carefully and provide a structured response.
    """
)

CODE_WRITER_PROMPT = PromptTemplate(
    input_variables=["user_query", "analysis_classification", "sheet_info", "data_sample"],
    template="""
    You are a senior Python data analyst. Generate professional, production-ready code for data analysis.

    USER REQUEST: {user_query}
    ANALYSIS TYPE: {analysis_classification}
    SHEET INFO: {sheet_info}
    DATA SAMPLE:
    {data_sample}

    REQUIREMENTS:
    1. Use pandas best practices with proper error handling
    2. Include comprehensive data validation
    3. Add informative print statements for debugging
    4. Store results in a dictionary called 'analysis_results'
    5. Handle missing data appropriately
    6. Use descriptive variable names
    7. Add comments explaining the analysis logic
    8. Produce a pandas DataFrame named 'analysis_df' that tabularizes the key results for downstream processing
    9. Do not rely on global variables other than df, pd, np which are provided at runtime
    10. DO NOT fabricate or simulate data under any circumstance. Operate STRICTLY on the provided dataframe `df`.
    11. If the expected columns are not present, attempt robust column detection using fuzzy matching on names like ["employee", "id", "name", "family", "total", "score", "%"] including Arabic equivalents, and raise a clear error in 'analysis_results' if you cannot proceed. Never create fake rows.

    CODE STRUCTURE:
    ```python
    import pandas as pd
    import numpy as np

    try:
        # Data validation
        print(f"Data shape: {{df.shape}}")
        print(f"Data types: {{df.dtypes}}")

        # Main analysis logic here
        analysis_results = {{
            'total_records': len(df),
            'analysis_type': '{analysis_classification}',
            # Add specific metrics based on analysis type
        }}

        # Build tabular output for downstream processing
        # analysis_df MUST exist and be a pandas DataFrame
        analysis_df = pd.DataFrame([analysis_results])

        print("Analysis completed successfully")
        print(f"Results: {{analysis_results}}")

    except Exception as e:
        analysis_results = {{
            'error': str(e),
            'analysis_type': '{analysis_classification}',
            'status': 'failed'
        }}
        # Ensure a DataFrame is still created so the pipeline can continue
        analysis_df = pd.DataFrame([analysis_results])
        print(f"Analysis failed: {{e}}")
    ```

    Generate the complete Python code:
    """
)

CODE_REVIEW_PROMPT = PromptTemplate(
    input_variables=["code", "user_query", "analysis_type", "attempt_number", "max_attempts"],
    template="""
    You are a senior code reviewer conducting a professional code review.

    CODE TO REVIEW:
    ```python
    {code}
    ```

    CONTEXT:
    - User Query: {user_query}
    - Analysis Type: {analysis_type}
    - Review Attempt: {attempt_number}/{max_attempts}

    REVIEW CRITERIA:
    1. **Syntax & Logic**: Correct Python syntax and logical flow
    2. **Error Handling**: Proper try-catch blocks and edge case handling
    3. **Data Safety**: No operations that could crash with real data
    4. **Performance**: Efficient pandas operations
    5. **Readability**: Clear, well-commented code
    6. **Contract**: The code MUST define both 'analysis_results' (dict) and 'analysis_df' (pandas DataFrame)

    APPROVAL GUIDELINES:
    - APPROVE if code meets basic functionality requirements (be lenient on style)
    - REJECT only for critical issues: syntax errors, logical flaws, missing error handling
    - For attempt {attempt_number}/{max_attempts}: Be increasingly lenient

    You must respond with a JSON object that has the following structure:
    {{
        "approved": boolean,
        "feedback": "string describing overall feedback",
        "issues": ["list", "of", "specific", "issues"],
        "suggestions": ["list", "of", "improvement", "suggestions"],
        "severity": "low|medium|high|critical"
    }}

    Example response:
    {{
        "approved": true,
        "feedback": "Code looks good with proper error handling",
        "issues": [],
        "suggestions": ["Consider adding more descriptive variable names"],
        "severity": "low"
    }}
    """
)

ECHARTS_PROMPT = PromptTemplate(
    input_variables=["user_query", "chart_type", "dataframe_overview", "data_preview"],
    template="""
    You are a senior front-end engineer. Generate a complete Node.js script that uses Apache ECharts to create a chart from the provided data.

    CONTEXT:
    - Chart Type: {chart_type}
    - User Request: {user_query}
    - DataFrame Overview: {dataframe_overview}
    - Data Sample:
    {data_preview}

    REQUIREMENTS:
    1. Generate ONLY the ECharts option object as valid JSON
    2. Use the actual column names and data from the preview
    3. For {chart_type} charts, structure the data appropriately:
       - Bar/Line: Use first column as categories (xAxis.data), remaining numeric columns as series
       - Pie: Use first two columns (name, value pairs)
       - Scatter: Use first two numeric columns as [x, y] coordinates
    4. Include proper titles, labels, and formatting
    5. Do NOT include any JavaScript code, require statements, or markdown - ONLY the JSON option object
    6. Ensure all strings are properly quoted and the JSON is valid

    Generate the ECharts option object:
    """
)

ECHARTS_DESIGN_PROMPT = PromptTemplate(
    input_variables=["user_query", "chart_type", "current_options", "dataframe_overview", "data_preview"],
    template="""
    You are a senior UI/UX designer and data visualization expert specializing in creating professional, publication-ready charts using Apache ECharts.

    CONTEXT:
    - User Request: {user_query}
    - Chart Type: {chart_type}
    - Current ECharts Options: {current_options}
    - DataFrame Overview: {dataframe_overview}
    - Data Sample: {data_preview}

    YOUR TASK:
    Transform the current basic ECharts configuration into a professional, visually appealing chart suitable for business presentations and reports.

    DESIGN REQUIREMENTS:
    1. **Professional Color Palette**: Use modern, accessible color schemes (avoid default colors)
    2. **Typography**: Implement proper font hierarchy with readable sizes and weights
    3. **Layout & Spacing**: Optimize margins, padding, and component positioning
    4. **Visual Hierarchy**: Ensure clear data emphasis and logical information flow
    5. **Accessibility**: Include proper contrast ratios and screen reader support
    6. **Responsiveness**: Design for multiple screen sizes and orientations
    7. **Brand Consistency**: Use professional styling suitable for corporate environments

    SPECIFIC ENHANCEMENTS TO INCLUDE:
    - Enhanced title styling with proper positioning and typography
    - Professional color gradients or solid colors (no garish combinations)
    - Improved legend positioning and styling
    - Better tooltip formatting with rich content
    - Grid lines and axis styling for clarity
    - Animation settings for smooth interactions
    - Shadow effects and border radius where appropriate
    - Proper label formatting and positioning
    - Data zoom and brush features if applicable
    - Professional background colors or gradients

    OUTPUT FORMAT:
    Return ONLY a valid JSON object representing the complete ECharts option configuration.
    The JSON must be properly formatted and ready to be parsed by JSON.parse() in JavaScript.
    Do NOT include any markdown fences, explanations, or additional text.
    Do NOT include variable declarations or JavaScript code - ONLY the JSON options object.

    EXAMPLE OUTPUT STRUCTURE:
    {{
        "backgroundColor": "#ffffff",
        "title": {{
            "text": "Professional Chart Title",
            "textStyle": {{
                "fontSize": 18,
                "fontWeight": "bold",
                "color": "#333333"
            }},
            "left": "center",
            "top": 20
        }},
        "tooltip": {{...}},
        "legend": {{...}},
        "xAxis": {{...}},
        "yAxis": {{...}},
        "series": [{{...}}]
    }}

    Generate the enhanced ECharts options JSON now:
    """
)

# New: Merge only original data points from previous ECharts code into the sample option block
ECHARTS_CODE_MERGE_PROMPT = PromptTemplate(
    input_variables=["previous_code", "echart_sample_code"],
    template="""
    You are a senior front-end engineer.

    TASK:
    - Take the PREVIOUS CODE (a working ECharts script) and the SAMPLE OPTION CODE.
    - Extract ONLY the ORIGINAL DATA POINTS from the PREVIOUS CODE's ECharts option.
      • For pie: series[0].data items (value/name pairs)
      • For bar/line: xAxis.data (categories) and each series[i].data arrays
      • For scatter/bubble: each series[i].data point arrays
      • If legend.data exists in the previous option, use it; otherwise leave the sample's legend as-is
    - Do NOT change styling, layout, titles, colors, axes styles, grid, background, animations, or any non-data property from the SAMPLE.
    - Do NOT invent or fabricate any data.

    OUTPUT REQUIREMENTS (STRICT):
    - Return ONLY the updated SAMPLE option block from "{{" to the matching "}};".
    - Do NOT include any code before or after the option block.
    - Preserve the SAMPLE structure and all non-data values exactly; only transplant original data points.

    --- PREVIOUS CODE START ---
    {previous_code}
    --- PREVIOUS CODE END ---

    --- SAMPLE CODE START ---
    {echart_sample_code}
    --- SAMPLE CODE END ---

    Now return EXACTLY the updated option block only:
    """
)


ANALYSIS_PROMPT = PromptTemplate(
    input_variables=["user_query", "analysis_type", "execution_results", "data_context"],
    template="""
    You are a senior business analyst providing insights to executive leadership.

    ANALYSIS REQUEST: {user_query}
    ANALYSIS TYPE: {analysis_type}
    DATA CONTEXT: {data_context}

    EXECUTION RESULTS:
    {execution_results}

    You must respond with a JSON object that matches this exact structure:
    {{
        "summary": "2-3 sentence executive summary",
        "key_insights": [
            "insight 1",
            "insight 2",
            "insight 3"
        ],
        "metrics": {{
            "key1": "value1",
            "key2": "value2"
        }},
        "recommendations": [
            "recommendation 1",
            "recommendation 2",
            "recommendation 3"
        ],
        "data_quality_notes": [
            "quality note 1",
            "quality note 2"
        ],
        "methodology": "brief explanation of analysis approach"
    }}

    IMPORTANT:
    - key_insights must be an array of strings, not a single string with bullet points
    - recommendations must be an array of strings, not a single string with bullet points
    - data_quality_notes must be an array of strings, not a single string with bullet points
    - Each array item should be a complete sentence without bullet points or dashes

    Provide comprehensive analysis based on the execution results above.
    """
)