
# ---------------------------------------------------------------------
# LCEL Chains with Structured Outputs
# ---------------------------------------------------------------------
# Create parsers
analysis_classification_parser = PydanticOutputParser(pydantic_object=AnalysisClassification)
code_generation_parser = PydanticOutputParser(pydantic_object=CodeGenerationResult)
code_review_parser = PydanticOutputParser(pydantic_object=CodeReviewResult)
analysis_result_parser = PydanticOutputParser(pydantic_object=AnalysisResult)

# Enhanced chains with structured output
start_chain = (
    START_PROMPT
    | llm.with_structured_output(AnalysisClassification)
)

code_writer_chain = (
    CODE_WRITER_PROMPT
    | llm.with_structured_output(CodeGenerationResult)
)

code_review_chain = (
    CODE_REVIEW_PROMPT
    | llm.with_structured_output(CodeReviewResult)
)

analysis_chain = (
    ANALYSIS_PROMPT
    | llm.with_structured_output(AnalysisResult)
)

# Raw code generator for ECharts (string output)
echarts_chain = (
    ECHARTS_PROMPT
    | llm
    | StrOutputParser()
)

# ECharts Design Enhancement chain (JSON output)
echarts_design_chain = (
    ECHARTS_DESIGN_PROMPT
    | llm
    | StrOutputParser()
)

# ECharts code merge chain (string output)
echarts_code_merge_chain = (
    ECHARTS_CODE_MERGE_PROMPT
    | llm
    | StrOutputParser()
)

# ---------------------------------------------------------------------
# Enhanced Node Functions with Error Handling
# ---------------------------------------------------------------------
def start_node(state: AgentState):
    """Enhanced start node with structured classification"""
    user_input = state["messages"][-1]
    logger.info(f"Processing user query: {user_input}")

    # Initialize state
    state["review_attempts"] = 0
    state["max_review_attempts"] = 3
    state["error_log"] = []

    # Prepare available sheets info
    available_sheets = [meta["sheet_name"] for meta in state.get("sheets_metadata", [])]

    try:
        # Use LLM for structured classification
        classification = start_chain.invoke({
            "user_input": user_input,
            "available_sheets": ", ".join(available_sheets)
        })

        state["analysis_classification"] = classification
        state["analysis_type"] = classification.analysis_type

        # Respect preselected sheet in state; only set suggested if none provided
        if not state.get("sheet") and classification.suggested_sheet:
            state["sheet"] = classification.suggested_sheet

        state["response"] = {
            "stage": "classification",
            "analysis_type": classification.analysis_type,
            "confidence": classification.confidence,
            "reasoning": classification.reasoning,
            "suggested_sheet": classification.suggested_sheet
        }

        logger.info(f"Classified as: {classification.analysis_type} (confidence: {classification.confidence})")

    except Exception as e:
        logger.error(f"Classification failed: {e}")
        state["error_log"].append(f"Classification error: {str(e)}")

        # Fallback classification
        classification = AnalysisClassification(
            analysis_type="unknown",
            confidence=0.5,
            reasoning="Fallback classification due to LLM error"
        )
        state["analysis_classification"] = classification
        state["analysis_type"] = "unknown"
        state["response"] = {"stage": "classification", "error": str(e)}

    return state

def enhanced_sheet_loader(state: AgentState, sheet_type: str):
    """Enhanced sheet loading with better error handling"""
    logger.info(f"Loading {sheet_type} sheet...")

    selected_sheets = state.get("selected_sheets", {})
    dfs_list = state.get("dfs_list", [])

    # Sheet mapping with fallback indices
    sheet_mapping = {
        "back_office": {"keywords": ["back", "office"], "fallback_idx": 0},
        "call_center": {"keywords": ["call", "center"], "fallback_idx": 1},
        "leaders": {"keywords": ["leader", "leadership"], "fallback_idx": 2},
        "retail": {"keywords": ["retail", "sales"], "fallback_idx": 3}
    }

    df = None
    sheet_name = None

    # Try to find sheet by keywords
    if sheet_type in sheet_mapping:
        keywords = sheet_mapping[sheet_type]["keywords"]
        for name, dataframe in selected_sheets.items():
            if any(keyword in name.lower() for keyword in keywords):
                df = dataframe
                sheet_name = name
                break

        # Fallback to index
        if df is None:
            fallback_idx = sheet_mapping[sheet_type]["fallback_idx"]
            if fallback_idx < len(dfs_list):
                df = dfs_list[fallback_idx]
                sheet_name = f"{sheet_type.title()} (fallback)"

    # Summary sheet special case: combine all processed employee tables
    elif sheet_type == "summary":
        processed = state.get("selected_sheets", {})
        if processed:
            try:
                df = pd.concat(list(processed.values()), ignore_index=True)
                sheet_name = "Summary (combined)"
            except Exception:
                df = None
                sheet_name = None

    if df is not None:
        state["df"] = df
        state["sheet"] = sheet_name

        # Enhanced data context
        data_sample = df.head(5).to_string(max_cols=10)
        state["response"].update({
            "sheet_loaded": sheet_name,
            "data_shape": df.shape,
            "columns": df.columns.tolist()[:10],  # Limit for readability
            "data_types": dict(df.dtypes.astype(str)),
            "memory_usage": f"{df.memory_usage(deep=True).sum() / 1024**2:.2f} MB"
        })

        logger.info(f"Successfully loaded {sheet_name}: {df.shape}")
    else:
        logger.warning(f"Failed to load {sheet_type} sheet")
        state["error_log"].append(f"Failed to load {sheet_type} sheet")

    return state

# Update sheet functions to use enhanced loader
def back_office_fn(state: AgentState):
    return enhanced_sheet_loader(state, "back_office")

def call_center_fn(state: AgentState):
    return enhanced_sheet_loader(state, "call_center")

def leader_fn(state: AgentState):
    return enhanced_sheet_loader(state, "leaders")

def retails_fn(state: AgentState):
    return enhanced_sheet_loader(state, "retail")

def summary_fn(state: AgentState):
    return enhanced_sheet_loader(state, "summary")

def code_writer_node(state: AgentState):
    """Enhanced code generation with structured output"""
    logger.info("Generating analysis code...")

    user_query = state["messages"][-1]
    classification = state.get("analysis_classification")
    df = state.get("df")
    sheet_name = state.get("sheet", "")

    if df is None:
        logger.error("No dataframe available for code generation")
        state["error_log"].append("No dataframe available")
        return state

    try:
        # Prepare context
        sheet_info = {
            "name": sheet_name,
            "shape": df.shape,
            "columns": df.columns.tolist()[:20],  # Limit for prompt size
            "dtypes": dict(df.dtypes.astype(str))
        }

        data_sample = df.head(3).to_string(max_cols=10)

        # Deterministic handler for common "top employees by score" query to avoid LLM simulation
        normalized_query = user_query.lower()
        if ("top" in normalized_query or "اعلى" in normalized_query or "الأعلى" in normalized_query) and (
            "employee" in normalized_query or "الموظ" in normalized_query
        ) and ("score" in normalized_query or "%" in normalized_query or "نسبة" in normalized_query):
            pass  # Add specific handling logic here if needed

        # Generate structured code via LLM (with strict anti-simulation instructions)
        code_result = code_writer_chain.invoke({
            "user_query": user_query,
            "analysis_classification": classification.model_dump() if classification else {},
            "sheet_info": str(sheet_info),
            "data_sample": data_sample
        })

        state["code_generation_result"] = code_result
        state["response"].update({
            "code_generated": True,
            "code_description": code_result.description,
            "expected_output": code_result.expected_output
        })

        logger.info("Code generated successfully")

    except Exception as e:
        logger.error(f"Code generation failed: {e}")
        state["error_log"].append(f"Code generation error: {str(e)}")

        # Fallback simple code
        fallback_code = CodeGenerationResult(
            code=f"""
                try:
                    analysis_results = {{
                        'total_records': len(df),
                        'shape': df.shape,
                        'columns': df.columns.tolist(),
                        'analysis_type': 'basic_summary'
                    }}
                    # Ensure tabular output exists for downstream processing
                    analysis_df = pd.DataFrame([analysis_results])
                    print(f"Analysis results: {{analysis_results}}")
                except Exception as e:
                    analysis_results = {{'error': str(e)}}
                    analysis_df = pd.DataFrame([analysis_results])
                """,
            description="Basic fallback analysis",
            expected_output="Dictionary with basic data statistics"
        )
        state["code_generation_result"] = fallback_code

    return state

def code_review_node(state: AgentState):
    """Enhanced code review with structured feedback and better error handling"""
    state["review_attempts"] += 1
    attempt = state["review_attempts"]
    max_attempts = state.get("max_review_attempts", 3)

    logger.info(f"Reviewing code (attempt {attempt}/{max_attempts})")

    code_result = state.get("code_generation_result")
    if not code_result:
        logger.error("No code to review")
        return state

    # Force approval after max attempts
    if attempt > max_attempts:
        review_result = CodeReviewResult(
            approved=True,
            feedback="Auto-approved after maximum attempts",
            issues=[],
            suggestions=[],
            severity="low"
        )
    else:
        try:
            user_query = state["messages"][-1]
            analysis_type = state.get("analysis_type", "")

            # Try structured output first
            try:
                review_result = code_review_chain.invoke({
                    "code": code_result.code,
                    "user_query": user_query,
                    "analysis_type": analysis_type,
                    "attempt_number": attempt,
                    "max_attempts": max_attempts
                })
            except Exception as structured_error:
                logger.warning(f"Structured output failed, trying fallback: {structured_error}")

                # Fallback to manual parsing
                review_response = (CODE_REVIEW_PROMPT | llm | StrOutputParser()).invoke({
                    "code": code_result.code,
                    "user_query": user_query,
                    "analysis_type": analysis_type,
                    "attempt_number": attempt,
                    "max_attempts": max_attempts
                })

                # Simple approval check
                if "approved" in review_response.lower() and ("true" in review_response.lower() or "yes" in review_response.lower()):
                    approved = True
                    feedback = "Code approved"
                else:
                    approved = False
                    feedback = "Code needs revision"

                review_result = CodeReviewResult(
                    approved=approved,
                    feedback=feedback,
                    issues=[],
                    suggestions=[],
                    severity="low"
                )

        except Exception as e:
            logger.error(f"Code review failed: {e}")
            # Fallback to basic syntax check
            try:
                compile(code_result.code, '<string>', 'exec')
                review_result = CodeReviewResult(
                    approved=True,
                    feedback="Approved via fallback syntax check",
                    issues=[],
                    suggestions=["Consider manual code review"],
                    severity="low"
                )
            except SyntaxError as se:
                review_result = CodeReviewResult(
                    approved=False,
                    feedback="Syntax error detected",
                    issues=[f"Syntax error: {str(se)}"],
                    suggestions=["Fix syntax error and retry"],
                    severity="high"
                )

    # Enforce contract: code must define analysis_results and analysis_df
    enforce_issues: List[str] = []
    if "analysis_results" not in code_result.code:
        enforce_issues.append("Missing 'analysis_results' dictionary in generated code")
    if "analysis_df" not in code_result.code:
        enforce_issues.append("Missing 'analysis_df' pandas DataFrame in generated code")

    if enforce_issues and attempt <= max_attempts:
        # Force a rejection with actionable feedback unless we've exceeded attempts
        review_result = CodeReviewResult(
            approved=False,
            feedback=(review_result.feedback + "; contract not satisfied") if 'review_result' in locals() else "Contract not satisfied",
            issues=(getattr(review_result, 'issues', []) + enforce_issues) if 'review_result' in locals() else enforce_issues,
            suggestions=["Ensure both 'analysis_results' and 'analysis_df' are defined as specified"],
            severity="medium"
        )

    state["code_review_result"] = review_result
    state["response"].update({
        "code_reviewed": True,
        "approved": review_result.approved,
        "review_feedback": review_result.feedback,
        "attempt": attempt
    })

    logger.info(f"Code review: {'APPROVED' if review_result.approved else 'REJECTED'}")
    return state

def llm_node(state: AgentState):
    """Enhanced execution and analysis with structured output"""
    logger.info("Executing code and generating analysis...")

    try:
        df = state.get("df")
        code_result = state.get("code_generation_result")

        if df is None or code_result is None:
            raise ValueError("Missing dataframe or code for execution")

        # Helper to coerce arbitrary results into a DataFrame
        def coerce_to_dataframe(value: Any) -> pd.DataFrame:
            try:
                if isinstance(value, pd.DataFrame):
                    return value
                if isinstance(value, list):
                    if len(value) == 0:
                        return pd.DataFrame()
                    if isinstance(value[0], dict):
                        return pd.DataFrame(value)
                    return pd.DataFrame({"value": value})
                if isinstance(value, dict):
                    # If values are list-like with equal length, DataFrame(value) works; else single row
                    list_lengths = [len(v) for v in value.values() if hasattr(v, "__len__") and not isinstance(v, (str, bytes))]
                    if len(list_lengths) > 0 and len(set(list_lengths)) == 1:
                        return pd.DataFrame(value)
                    return pd.DataFrame([value])
                # Fallback: single-row DataFrame
                return pd.DataFrame([{"value": value}])
            except Exception:
                return pd.DataFrame([{"error": "failed_to_coerce_to_dataframe"}])

        # Execute code in controlled environment
        exec_globals = {
            "df": df,
            "pd": pd,
            "np": __import__("numpy"),
            "__builtins__": __builtins__
        }

        logger.info("Executing generated code...")
        exec(code_result.code, exec_globals)

        # Extract results
        execution_result = exec_globals.get("analysis_results", {})
        analysis_df = exec_globals.get("analysis_df", None)
        if analysis_df is None:
            analysis_df = coerce_to_dataframe(execution_result)

        # Generate final analysis
        user_query = state["messages"][-1]
        analysis_type = state.get("analysis_type", "")

        data_context = {
            "sheet": state.get("sheet"),
            "shape": df.shape,
            "columns_count": len(df.columns)
        }

        final_analysis = analysis_chain.invoke({
            "user_query": user_query,
            "analysis_type": analysis_type,
            "execution_results": str(execution_result),
            "data_context": str(data_context)
        })

        state["execution_result"] = execution_result
        state["analysis_result"] = final_analysis
        state["response_df"] = analysis_df
        state["response"].update({
            "status": "completed",
            "execution_results": execution_result,
            "analysis": final_analysis.model_dump(),
            "total_attempts": state["review_attempts"],
            "dataframe_shape": tuple(analysis_df.shape),
            "dataframe_columns": analysis_df.columns.tolist() if not analysis_df.empty else []
        })

        logger.info("Analysis completed successfully")

    except Exception as e:
        logger.error(f"Execution failed: {e}")
        state["error_log"].append(f"Execution error: {str(e)}")
        # Best-effort to attach an empty DataFrame so downstream can handle uniformly
        state["response_df"] = pd.DataFrame()
        state["response"].update({
            "status": "error",
            "error": str(e),
            "error_log": state["error_log"]
        })

    return state

def echarts_router(state: AgentState):
    """Route to a specific ECharts node based on state['graph_type']"""
    graph_type = (state.get("graph_type") or "").strip().lower()
    if graph_type in {"bar", "bar_chart", "column"}:
        return "ECharts Bar"
    if graph_type in {"line", "line_chart"}:
        return "ECharts Line"
    if graph_type in {"pie", "donut", "doughnut"}:
        return "ECharts Pie"
    if graph_type in {"scatter", "bubble"}:
        return "ECharts Scatter"
    # default fallback
    return "ECharts Bar"

def _generate_echarts_from_df(state: AgentState, forced_type: Optional[str] = None):
    """Helper: create ECharts Node.js code from the latest analysis DataFrame."""
    try:
        df_out = state.get("response_df")
        if df_out is None or not isinstance(df_out, pd.DataFrame) or df_out.empty:
            raise ValueError("No analysis DataFrame available for charting")

        # Build a lightweight overview and sample
        dataframe_overview = {
            "shape": tuple(df_out.shape),
            "columns": [str(c) for c in df_out.columns.tolist()],
            "dtypes": {str(k): str(v) for k, v in df_out.dtypes.astype(str).items()},
        }
        data_preview = df_out.head(10).to_csv(index=False)

        chart_type = forced_type or (state.get("graph_type") or "bar")
        user_query = state["messages"][-1]

        code_str = echarts_chain.invoke({
            "user_query": user_query,
            "chart_type": chart_type,
            "dataframe_overview": str(dataframe_overview),
            "data_preview": data_preview,
        })

        state["echart_code"] = code_str
        # Attach to response for visibility
        state["response"].update({
            "echarts": {
                "chart_type": chart_type,
                "code_len": len(code_str) if isinstance(code_str, str) else 0,
            }
        })
        logger.info("ECharts code generated")
    except Exception as e:
        logger.error(f"ECharts generation failed: {e}")
        state.setdefault("error_log", []).append(f"ECharts error: {str(e)}")
        state["echart_code"] = None
        state["response"].update({
            "echarts": {"error": str(e)}
        })
    return state

def echarts_bar_node(state: AgentState):
    return _generate_echarts_from_df(state, forced_type="bar")

def echarts_line_node(state: AgentState):
    return _generate_echarts_from_df(state, forced_type="line")

def echarts_pie_node(state: AgentState):
    return _generate_echarts_from_df(state, forced_type="pie")

def echarts_scatter_node(state: AgentState):
    return _generate_echarts_from_df(state, forced_type="scatter")

def echarts_design_enhancement_node(state: AgentState):
    """Transplant ONLY original data points from previous ECharts code into the provided sample option and return the updated option block (no extra code)."""
    logger.info("Merging ECharts previous code into sample template...")

    try:
        previous_code = state.get("echart_code")
        sample_code = state.get("echart_sample_code")

        if not previous_code or not isinstance(previous_code, str) or not previous_code.strip():
            raise ValueError("Missing previous ECharts code to merge")
        if not sample_code or not isinstance(sample_code, str) or not sample_code.strip():
            raise ValueError("Missing echart_sample_code in state for merging")

        merged_code = echarts_code_merge_chain.invoke({
            "previous_code": previous_code,
            "echart_sample_code": sample_code,
        })

        print("Merge code",merged_code[:100])

        state["designed_echart_code"] = merged_code
        # For compatibility, expose the same string under enhanced_echart_options

        # Keep the old field untouched to avoid breaking external callers
        state["response"].update({
            "echarts_design": {
                "designed_code_len": len(merged_code)
            }
        })
        logger.info("ECharts designed code merged successfully")

    except Exception as e:
        logger.error(f"ECharts design enhancement failed: {e}")
        state.setdefault("error_log", []).append(f"Design enhancement error: {str(e)}")
        state["enhanced_echart_options"] = None
        state["designed_echart_code"] = None
        state["response"].update({
            "design_enhancement": {"error": str(e)}
        })

    return state

# ---------------------------------------------------------------------
# Enhanced Routers with Better Logic
# ---------------------------------------------------------------------
def analysis_router(state: AgentState):
    """Enhanced router with better fallback logic"""
    analysis_type = state.get("analysis_type", "unknown")

    # Map analysis types to next nodes
    routing_map = {
        "skill": "Skill Analysis",
        "gap": "Gap Analysis",
        "count": "Count Analysis",
        "summary": "Summary Analysis",
        "comparison": "Comparison Analysis"
    }

    return routing_map.get(analysis_type, "Summary Analysis")  # Default fallback

def sheet_router(state: AgentState):
    """Route strictly based on explicit state sheet if present; otherwise fall back to suggestion or heuristics."""
    # 1) Highest priority: explicit sheet in state
    explicit_sheet = state.get("sheet")
    if isinstance(explicit_sheet, str) and explicit_sheet.strip():
        sheet_val = explicit_sheet.strip().lower().replace("_", " ")
    else:
        sheet_val = ""

    # 2) Next: LLM suggestion from classification
    if not sheet_val:
        suggested = state.get("analysis_classification", {})
        if hasattr(suggested, "suggested_sheet") and suggested.suggested_sheet:
            sheet_val = str(suggested.suggested_sheet).strip().lower().replace("_", " ")

    # 3) Fallback: infer from user query
    if not sheet_val:
        user_query = state["messages"][-1].lower()
        sheet_val = user_query

    # Normalize to canonical keys used by node mapping
    normalized: str
    if ("back" in sheet_val and "office" in sheet_val) or sheet_val == "back office":
        normalized = "back office"
    elif ("call" in sheet_val and "center" in sheet_val) or sheet_val == "call center":
        normalized = "call center"
    elif "leader" in sheet_val or sheet_val == "leaders":
        normalized = "leaders"
    elif "retail" in sheet_val or "sales" in sheet_val or sheet_val == "retail":
        normalized = "retail"
    elif "summary" in sheet_val:
        normalized = "summary"
    else:
        normalized = "summary"

    node_mapping = {
        "summary": "Summary Sheet",
        "back office": "Back Office Sheet",
        "call center": "Call Center Sheet",
        "leaders": "Leader Sheet",
        "retail": "Retails Sheet",
    }

    return node_mapping.get(normalized, "Summary Sheet")

def review_router(state: AgentState):
    """Simple review router"""
    review_result = state.get("code_review_result")
    if review_result and review_result.approved:
        return "LLM Node"
    else:
        return "Code Rewrite Node"

# Add simple analysis nodes for new types
def skill_analysis_node(state: AgentState):
    logger.info("Routing to skill analysis...")
    state["response"].update({"analysis_focus": "skill_analysis"})
    return state

def gap_analysis_node(state: AgentState):
    logger.info("Routing to gap analysis...")
    state["response"].update({"analysis_focus": "gap_analysis"})
    return state

def count_analysis_node(state: AgentState):
    logger.info("Routing to count analysis...")
    state["response"].update({"analysis_focus": "count_analysis"})
    return state

def summary_analysis_node(state: AgentState):
    logger.info("Routing to summary analysis...")
    state["response"].update({"analysis_focus": "summary_analysis"})
    return state

def comparison_analysis_node(state: AgentState):
    logger.info("Routing to comparison analysis...")
    state["response"].update({"analysis_focus": "comparison_analysis"})
    return state

def code_rewrite_node(state: AgentState):
    """Simple code rewrite node - for now just regenerate"""
    logger.info("Rewriting code...")
    # For simplicity, just run code writer again
    return code_writer_node(state)

# ---------------------------------------------------------------------
# Graph Setup with Enhanced Nodes
# ---------------------------------------------------------------------
graph = StateGraph(AgentState)

# Add all nodes
graph.add_node("start", start_node)
graph.add_node("Skill Analysis", skill_analysis_node)
graph.add_node("Gap Analysis", gap_analysis_node)
graph.add_node("Count Analysis", count_analysis_node)
graph.add_node("Summary Analysis", summary_analysis_node)
graph.add_node("Comparison Analysis", comparison_analysis_node)
graph.add_node("Summary Sheet", summary_fn)
graph.add_node("Back Office Sheet", back_office_fn)
graph.add_node("Call Center Sheet", call_center_fn)
graph.add_node("Leader Sheet", leader_fn)
graph.add_node("Retails Sheet", retails_fn)
graph.add_node("Code Writer Node", code_writer_node)
graph.add_node("Code Review Node", code_review_node)
graph.add_node("Code Rewrite Node", code_rewrite_node)
graph.add_node("LLM Node", llm_node)
graph.add_node("ECharts Bar", echarts_bar_node)
graph.add_node("ECharts Line", echarts_line_node)
graph.add_node("ECharts Pie", echarts_pie_node)
graph.add_node("ECharts Scatter", echarts_scatter_node)
graph.add_node("ECharts Design Enhancement", echarts_design_enhancement_node)

# Set entry point
graph.set_entry_point("start")

# Enhanced routing
graph.add_conditional_edges(
    "start", analysis_router,
    {
        "Skill Analysis": "Skill Analysis",
        "Gap Analysis": "Gap Analysis",
        "Count Analysis": "Count Analysis",
        "Summary Analysis": "Summary Analysis",
        "Comparison Analysis": "Comparison Analysis"
    }
)

# All analysis types route to sheet selection
for analysis_node in ["Skill Analysis", "Gap Analysis", "Count Analysis", "Summary Analysis", "Comparison Analysis"]:
    graph.add_conditional_edges(
        analysis_node, sheet_router,
        {
            "Summary Sheet": "Summary Sheet",
            "Back Office Sheet": "Back Office Sheet",
            "Call Center Sheet": "Call Center Sheet",
            "Leader Sheet": "Leader Sheet",
            "Retails Sheet": "Retails Sheet"
        }
    )

# Sheet nodes to code writer
for sheet_node in ["Summary Sheet", "Back Office Sheet", "Call Center Sheet", "Leader Sheet", "Retails Sheet"]:
    graph.add_edge(sheet_node, "Code Writer Node")

# Code workflow
graph.add_edge("Code Writer Node", "Code Review Node")
graph.add_conditional_edges(
    "Code Review Node", review_router,
    {
        "LLM Node": "LLM Node",
        "Code Rewrite Node": "Code Rewrite Node"
    }
)
graph.add_edge("Code Rewrite Node", "Code Review Node")
graph.add_conditional_edges(
    "LLM Node", echarts_router,
    {
        "ECharts Bar": "ECharts Bar",
        "ECharts Line": "ECharts Line",
        "ECharts Pie": "ECharts Pie",
        "ECharts Scatter": "ECharts Scatter",
    }
)
graph.add_edge("ECharts Bar", "ECharts Design Enhancement")
graph.add_edge("ECharts Line", "ECharts Design Enhancement")
graph.add_edge("ECharts Pie", "ECharts Design Enhancement")
graph.add_edge("ECharts Scatter", "ECharts Design Enhancement")
graph.add_edge("ECharts Design Enhancement", END)

# Compile graph
app = graph.compile()

# ---------------------------------------------------------------------
# Global Data Loading Function (was missing)
# ---------------------------------------------------------------------
def load_global_sheet_data(file_path: str) -> Dict[str, Any]:
        """Load and preprocess all sheets according to your specifications"""
        # Read all sheets into a dictionary
        sheets = pd.read_excel(file_path, sheet_name=None, skiprows=4)

        # Get sheet names as a list
        sheet_names = list(sheets.keys())

        # Select sheets 2, 3, 4, and 5 (index 1 to 4)
        selected_sheets = {name: sheets[name] for name in sheet_names[1:5]}

        # List of DataFrames
        dfs_list = list(selected_sheets.values())

        # Total number of sheets selected
        total_sheets = len(dfs_list)

        # Metadata: list of dicts with sheet name, shape, and columns
        sheets_metadata = [
            {
                "sheet_name": name,
                "shape": df.shape,
                "columns": list(df.columns),
                "data_types": dict(df.dtypes.astype(str))
            }
            for name, df in selected_sheets.items()
        ]

        # Columns from the first selected sheet
        columns = list(dfs_list[0].columns) if dfs_list else []

        # Shapes of all selected sheets
        shapes = [df.shape for df in dfs_list]

        # Data types from the first selected sheet
        data_types = dict(dfs_list[0].dtypes.astype(str)) if dfs_list else {}

        return {
            "sheets": sheets,
            "selected_sheets": selected_sheets,
            "dfs_list": dfs_list,
            "sheets_metadata": sheets_metadata,
            "total_sheets": total_sheets,
            "columns": columns,
            "shapes": shapes,
            "data_types": data_types
        }
echart_sample_code="""
        option = {
  legend: {
    top: 'bottom'
  },
  toolbox: {
    show: true,
    feature: {
      mark: { show: true },
      dataView: { show: true, readOnly: false },
      restore: { show: true },
      saveAsImage: { show: true }
    }
  },
  series: [
    {
      name: 'Nightingale Chart',
      type: 'pie',
      radius: [50, 250],
      center: ['50%', '50%'],
      roseType: 'area',
      itemStyle: {
        borderRadius: 8
      },
      data: [
        { value: 40, name: 'rose 1' },
        { value: 38, name: 'rose 2' },
        { value: 32, name: 'rose 3' },
        { value: 30, name: 'rose 4' },
        { value: 28, name: 'rose 5' },
        { value: 26, name: 'rose 6' },
        { value: 22, name: 'rose 7' },
        { value: 18, name: 'rose 8' }
      ]
    }
  ]
};


"""
# ---------------------------------------------------------------------
# Usage Example with Global Data Loading
# ---------------------------------------------------------------------
if __name__ == "__main__":
    # Load global sheet data once

    file_path = "/content/Tanmeya Assessments Results Report by Function V06 (2).xlsx"

    global_data = load_global_sheet_data(file_path)


    # Example usage with pre-loaded data
    initial_state = {
        # "messages": ["How many total employees in the back office data"],
        # "messages": ["Give me the top 5 employees based on scores %"],
        "messages": ["Give me the top 5 employees who has topper in مهارات التواصل"],
        "analysis_type": "",
        "sheet": "back office",
        "graph_type": "pie",
        "code_snippet": "",
        "review_feedback": "",
        "review_approved": False,
        "response": {},
        "review_attempts": 0,
        "max_review_attempts": 3,
        "echart_sample_code":echart_sample_code,
        # Add the global data to initial state
        **global_data
    }

    print("Available processed employee-level sheets:")
    for metadata in initial_state["sheets_metadata"]:
        print(f"  - {metadata['sheet_name']}: {metadata['shape']} - {len(metadata['columns'])} columns")

    # Run the graph
    try:
        final_state = app.invoke(initial_state)

        # Access the response
        print("\n" + "="*50)
        print("FINAL RESPONSE:")
        print("="*50)
        print(final_state["response"])
        # Show the tabular output for downstream processing
        try:
            df_out = final_state.get("response_df")
            if isinstance(df_out, pd.DataFrame):
                print("\nTabular output (head):")
                print(df_out.head())
                print(f"\nDataFrame shape: {df_out.shape}")
            else:
                print("No DataFrame produced in final state")
        except Exception as vis_err:
            print(f"Failed to display DataFrame: {vis_err}")




    except Exception as e:
        print(f"Error running workflow: {e}")
