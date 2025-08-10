from __future__ import annotations

from typing import Any, Dict, Optional, List

import numpy as np
import pandas as pd

from langgraph.graph import StateGraph, END
from langchain_anthropic.chat_models import ChatAnthropic
from langchain_core.output_parsers import StrOutputParser

from core.config import settings
from core.logger import logger

from models.data_analysis import (
    AgentState,
    AnalysisClassification,
    CodeGenerationResult,
    CodeReviewResult,
    AnalysisResult,
)
from ..prompts.prompts import (
    START_PROMPT,
    CODE_WRITER_PROMPT,
    CODE_REVIEW_PROMPT,
    ANALYSIS_PROMPT,
    ECHARTS_PROMPT,
    ECHARTS_CODE_MERGE_PROMPT,
)


class DataAnalysisWorkflow:
    """OOP-based LCEL workflow for data analysis with all components as class methods."""
    
    def __init__(self, llm: ChatAnthropic):
        self.llm = llm
        self.chains = self._initialize_chains()
        self.graph = self._build_graph()
    
    def _initialize_chains(self):
        """Initialize LCEL chains using the provided LLM."""
        class LCELChains:
            def __init__(self, llm: ChatAnthropic):
                self.llm = llm
                # Structured chains
                self.start_chain = START_PROMPT | self.llm.with_structured_output(AnalysisClassification)
                self.code_writer_chain = CODE_WRITER_PROMPT | self.llm.with_structured_output(CodeGenerationResult)
                self.code_review_chain = CODE_REVIEW_PROMPT | self.llm.with_structured_output(CodeReviewResult)
                self.analysis_chain = ANALYSIS_PROMPT | self.llm.with_structured_output(AnalysisResult)
                # String-output chains
                self.echarts_chain = ECHARTS_PROMPT | self.llm | StrOutputParser()
                self.echarts_code_merge_chain = ECHARTS_CODE_MERGE_PROMPT | self.llm | StrOutputParser()
        
        return LCELChains(self.llm)
    
    def start_node(self, state: AgentState):
        """Classification and start node logic."""
        user_input = state["messages"][-1]
        available_sheets = [meta["sheet_name"] for meta in state.get("sheets_metadata", [])]

        try:
            classification = self.chains.start_chain.invoke({
                "user_input": user_input,
                "available_sheets": ", ".join(available_sheets)
            })

            state["analysis_classification"] = classification
            state["analysis_type"] = classification.analysis_type

            if not state.get("sheet") and classification.suggested_sheet:
                state["sheet"] = classification.suggested_sheet

            state.setdefault("response", {}).update({
                "stage": "classification",
                "analysis_type": classification.analysis_type,
                "confidence": classification.confidence,
                "reasoning": classification.reasoning,
                "suggested_sheet": classification.suggested_sheet,
            })
        except Exception as e:
            logger.error(f"Classification failed: {e}")
            state.setdefault("error_log", []).append(f"Classification error: {str(e)}")
            classification = AnalysisClassification(
                analysis_type="unknown", confidence=0.5, reasoning="Fallback classification due to LLM error"
            )
            state["analysis_classification"] = classification
            state["analysis_type"] = "unknown"
            state.setdefault("response", {}).update({"stage": "classification", "error": str(e)})

        return state
    
    def sheet_loader_node(self, sheet_type: str):
        """Create sheet loader for specific sheet type."""
        def _sheet_loader(state: AgentState):
            selected_sheets = state.get("selected_sheets", {})
            dfs_list = state.get("dfs_list", [])

            sheet_mapping = {
                "back_office": {"keywords": ["back", "office"], "fallback_idx": 0},
                "call_center": {"keywords": ["call", "center"], "fallback_idx": 1},
                "leaders": {"keywords": ["leader", "leadership"], "fallback_idx": 2},
                "retail": {"keywords": ["retail", "sales"], "fallback_idx": 3},
            }

            df = None
            sheet_name = None

            if sheet_type in sheet_mapping:
                keywords = sheet_mapping[sheet_type]["keywords"]
                for name, dataframe in selected_sheets.items():
                    if any(keyword in str(name).lower() for keyword in keywords):
                        df = dataframe
                        sheet_name = name
                        break
                if df is None:
                    fallback_idx = sheet_mapping[sheet_type]["fallback_idx"]
                    if fallback_idx < len(dfs_list):
                        df = dfs_list[fallback_idx]
                        sheet_name = f"{sheet_type.title()} (fallback)"
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
                state.setdefault("response", {}).update({
                    "sheet_loaded": sheet_name,
                    "data_shape": df.shape,
                    "columns": df.columns.tolist()[:10],
                    "data_types": dict(df.dtypes.astype(str)),
                    "memory_usage": f"{df.memory_usage(deep=True).sum() / 1024**2:.2f} MB",
                })
            else:
                logger.warning(f"Failed to load {sheet_type} sheet")
                state.setdefault("error_log", []).append(f"Failed to load {sheet_type} sheet")

            return state
        
        return _sheet_loader
    
    def code_writer_node(self, state: AgentState):
        """Code generation node logic."""
        user_query = state["messages"][-1]
        classification = state.get("analysis_classification")
        df = state.get("df")
        sheet_name = state.get("sheet", "")

        if df is None:
            logger.error("No dataframe available for code generation")
            state.setdefault("error_log", []).append("No dataframe available")
            return state

        try:
            sheet_info = {
                "name": sheet_name,
                "shape": df.shape,
                "columns": df.columns.tolist()[:20],
                "dtypes": dict(df.dtypes.astype(str)),
            }

            data_sample = df.head(3).to_string(max_cols=10)

            code_result = self.chains.code_writer_chain.invoke({
                "user_query": user_query,
                "analysis_classification": classification.model_dump() if classification else {},
                "sheet_info": str(sheet_info),
                "data_sample": data_sample,
            })

            state["code_generation_result"] = code_result
            state.setdefault("response", {}).update({
                "code_generated": True,
                "code_description": code_result.description,
                "expected_output": code_result.expected_output,
            })
        except Exception as e:
            logger.error(f"Code generation failed: {e}")
            state.setdefault("error_log", []).append(f"Code generation error: {str(e)}")
            fallback_code = CodeGenerationResult(
                code=(
                    """
                        try:
                            analysis_results = {
                                'total_records': len(df),
                                'shape': df.shape,
                                'columns': df.columns.tolist(),
                                'analysis_type': 'basic_summary'
                            }
                            analysis_df = pd.DataFrame([analysis_results])
                            print(f"Analysis results: {analysis_results}")
                        except Exception as e:
                            analysis_results = {'error': str(e)}
                            analysis_df = pd.DataFrame([analysis_results])
                        """
                ),
                description="Basic fallback analysis",
                expected_output="Dictionary with basic data statistics",
            )
            state["code_generation_result"] = fallback_code

        return state
    
    def code_review_node(self, state: AgentState):
        """Code review node logic."""
        state["review_attempts"] = state.get("review_attempts", 0) + 1
        attempt = state["review_attempts"]
        max_attempts = state.get("max_review_attempts", 3)

        code_result = state.get("code_generation_result")
        if not code_result:
            logger.error("No code to review")
            return state

        if attempt > max_attempts:
            review_result = CodeReviewResult(
                approved=True,
                feedback="Auto-approved after maximum attempts",
                issues=[],
                suggestions=[],
                severity="low",
            )
        else:
            try:
                user_query = state["messages"][-1]
                analysis_type = state.get("analysis_type", "")
                review_result = self.chains.code_review_chain.invoke({
                    "code": code_result.code,
                    "user_query": user_query,
                    "analysis_type": analysis_type,
                    "attempt_number": attempt,
                    "max_attempts": max_attempts,
                })
            except Exception as e:
                logger.error(f"Code review failed: {e}")
                try:
                    compile(code_result.code, '<string>', 'exec')
                    review_result = CodeReviewResult(
                        approved=True,
                        feedback="Approved via fallback syntax check",
                        issues=[],
                        suggestions=["Consider manual code review"],
                        severity="low",
                    )
                except SyntaxError as se:
                    review_result = CodeReviewResult(
                        approved=False,
                        feedback="Syntax error detected",
                        issues=[f"Syntax error: {str(se)}"],
                        suggestions=["Fix syntax error and retry"],
                        severity="high",
                    )

        # Contract enforcement
        enforce_issues: List[str] = []
        code_str = state.get("code_generation_result").code if state.get("code_generation_result") else ""
        if "analysis_results" not in code_str:
            enforce_issues.append("Missing 'analysis_results' dictionary in generated code")
        if "analysis_df" not in code_str:
            enforce_issues.append("Missing 'analysis_df' pandas DataFrame in generated code")
        if enforce_issues and attempt <= max_attempts:
            review_result = CodeReviewResult(
                approved=False,
                feedback=(review_result.feedback + "; contract not satisfied") if review_result else "Contract not satisfied",
                issues=(getattr(review_result, 'issues', []) + enforce_issues) if review_result else enforce_issues,
                suggestions=["Ensure both 'analysis_results' and 'analysis_df' are defined as specified"],
                severity="medium",
            )

        state["code_review_result"] = review_result
        state.setdefault("response", {}).update({
            "code_reviewed": True,
            "approved": review_result.approved,
            "review_feedback": review_result.feedback,
            "attempt": attempt,
        })

        return state
    
    def exec_node(self, state: AgentState):
        """Execution node logic."""
        try:
            df = state.get("df")
            code_result = state.get("code_generation_result")
            if df is None or code_result is None:
                raise ValueError("Missing dataframe or code for execution")

            def sanitize_code(code: str) -> str:
                """Remove or neutralize imports of optional libraries not guaranteed to be installed."""
                if not isinstance(code, str):
                    return ""
                unsafe_imports = [
                    "fuzzywuzzy", "rapidfuzz", "sklearn", "matplotlib", "seaborn",
                    "statsmodels", "xgboost", "lightgbm"
                ]
                lines = []
                for line in code.splitlines():
                    stripped = line.strip()
                    if stripped.startswith("import ") or stripped.startswith("from "):
                        if any(pkg in stripped for pkg in unsafe_imports):
                            # Skip this import line
                            continue
                    lines.append(line)
                return "\n".join(lines)

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
                        list_lengths = [len(v) for v in value.values() if hasattr(v, "__len__") and not isinstance(v, (str, bytes))]
                        if len(list_lengths) > 0 and len(set(list_lengths)) == 1:
                            return pd.DataFrame(value)
                        return pd.DataFrame([value])
                    return pd.DataFrame([{ "value": value }])
                except Exception:
                    return pd.DataFrame([{ "error": "failed_to_coerce_to_dataframe" }])

            exec_globals = {
                "df": df,
                "pd": pd,
                "np": np,
                "__builtins__": __builtins__,
            }

            safe_code = sanitize_code(code_result.code)
            exec(safe_code, exec_globals)

            execution_result = exec_globals.get("analysis_results", {})
            analysis_df = exec_globals.get("analysis_df", None)
            if analysis_df is None:
                analysis_df = coerce_to_dataframe(execution_result)

            user_query = state["messages"][-1]
            analysis_type = state.get("analysis_type", "")
            data_context = {"sheet": state.get("sheet"), "shape": df.shape, "columns_count": len(df.columns)}

            # LLM summarize of execution (guard if chains missing)
            if hasattr(self.chains, "analysis_chain"):
                final_analysis = self.chains.analysis_chain.invoke({
                    "user_query": user_query,
                    "analysis_type": analysis_type,
                    "execution_results": str(execution_result),
                    "data_context": str(data_context),
                })
            else:
                final_analysis = {
                    "summary": "Execution summarized without LLM due to missing chain context",
                    "key_insights": [],
                    "metrics": {},
                    "recommendations": [],
                    "data_quality_notes": [],
                    "methodology": "fallback",
                }

            state["execution_result"] = execution_result
            state["analysis_result"] = final_analysis
            state["response_df"] = analysis_df
            state.setdefault("response", {}).update({
                "status": "completed",
                "execution_results": execution_result,
                "analysis": (final_analysis.model_dump() if hasattr(final_analysis, "model_dump") else (
                    final_analysis if isinstance(final_analysis, dict) else {"summary": str(final_analysis)}
                )),
                "total_attempts": state.get("review_attempts", 0),
                "dataframe_shape": tuple(analysis_df.shape),
                "dataframe_columns": analysis_df.columns.tolist() if not analysis_df.empty else [],
            })
        except Exception as e:
            logger.error(f"Execution failed: {e}")
            state.setdefault("error_log", []).append(f"Execution error: {str(e)}")
            state["response_df"] = pd.DataFrame()
            state.setdefault("response", {}).update({
                "status": "error",
                "error": str(e),
                "error_log": state.get("error_log"),
            })

        return state
    
    def echarts_node(self, forced_type: Optional[str] = None):
        """Create ECharts generation node for specific chart type."""
        def _echarts_node(state: AgentState):
            try:
                df_out = state.get("response_df")
                if df_out is None or not isinstance(df_out, pd.DataFrame) or df_out.empty:
                    raise ValueError("No analysis DataFrame available for charting")

                dataframe_overview = {
                    "shape": tuple(df_out.shape),
                    "columns": [str(c) for c in df_out.columns.tolist()],
                    "dtypes": {str(k): str(v) for k, v in df_out.dtypes.astype(str).items()},
                }
                data_preview = df_out.head(10).to_csv(index=False)

                chart_type = forced_type or (state.get("graph_type") or "bar")
                user_query = state["messages"][-1]

                code_str = self.chains.echarts_chain.invoke({
                    "user_query": user_query,
                    "chart_type": chart_type,
                    "dataframe_overview": str(dataframe_overview),
                    "data_preview": data_preview,
                })

                state["echart_code"] = code_str
                state.setdefault("response", {}).update({
                    "echarts": {"chart_type": chart_type, "code_len": len(code_str) if isinstance(code_str, str) else 0}
                })
            except Exception as e:
                logger.error(f"ECharts generation failed: {e}")
                state.setdefault("error_log", []).append(f"ECharts error: {str(e)}")
                state["echart_code"] = None
                state.setdefault("response", {}).update({"echarts": {"error": str(e)}})
            return state
        
        return _echarts_node
    
    def echarts_design_merge_node(self, state: AgentState):
        """ECharts design enhancement node logic."""
        try:
            previous_code = state.get("echart_code")
            sample_code = state.get("echart_sample_code")
            if not previous_code or not isinstance(previous_code, str) or not previous_code.strip():
                raise ValueError("Missing previous ECharts code to merge")
            if not sample_code or not isinstance(sample_code, str) or not sample_code.strip():
                raise ValueError("Missing echart_sample_code in state for merging")

            merged_code = self.chains.echarts_code_merge_chain.invoke({
                "previous_code": previous_code,
                "echart_sample_code": sample_code,
            })

            state["designed_echart_code"] = merged_code
            state.setdefault("response", {}).update({"echarts_design": {"designed_code_len": len(merged_code)}})
        except Exception as e:
            logger.error(f"ECharts design enhancement failed: {e}")
            state.setdefault("error_log", []).append(f"Design enhancement error: {str(e)}")
            state["designed_echart_code"] = None
            state.setdefault("response", {}).update({"design_enhancement": {"error": str(e)}})
        return state
    
    def analysis_router(self, state: AgentState) -> str:
        """Router for analysis type."""
        mapping = {
            "skill": "Skill Analysis",
            "gap": "Gap Analysis",
            "count": "Count Analysis",
            "summary": "Summary Analysis",
            "comparison": "Comparison Analysis",
        }
        return mapping.get(state.get("analysis_type", "unknown"), "Summary Analysis")
    
    def sheet_router(self, state: AgentState) -> str:
        """Router for sheet selection."""
        explicit_sheet = state.get("sheet")
        if isinstance(explicit_sheet, str) and explicit_sheet.strip():
            sheet_val = explicit_sheet.strip().lower().replace("_", " ")
        else:
            sheet_val = ""

        if not sheet_val:
            suggested = state.get("analysis_classification", {})
            if hasattr(suggested, "suggested_sheet") and suggested.suggested_sheet:
                sheet_val = str(suggested.suggested_sheet).strip().lower().replace("_", " ")

        if not sheet_val:
            user_query = state["messages"][-1].lower()
            sheet_val = user_query

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
    
    def review_router(self, state: AgentState) -> str:
        """Router for code review decision."""
        review_result = state.get("code_review_result")
        if review_result and review_result.approved:
            return "LLM Node"
        return "Code Rewrite Node"
    
    def echarts_router(self, state: AgentState) -> str:
        """Router for ECharts chart type."""
        graph_type = (state.get("graph_type") or "").strip().lower()
        if graph_type in {"bar", "bar_chart", "column"}: return "ECharts Bar"
        if graph_type in {"line", "line_chart"}: return "ECharts Line"
        if graph_type in {"pie", "donut", "doughnut"}: return "ECharts Pie"
        if graph_type in {"scatter", "bubble"}: return "ECharts Scatter"
        return "ECharts Bar"
    
    def _build_graph(self):
        """Build the LangGraph workflow."""
        graph = StateGraph(AgentState)

        # Add nodes
        graph.add_node("start", self.start_node)
        graph.add_node("Skill Analysis", lambda s: s)
        graph.add_node("Gap Analysis", lambda s: s)
        graph.add_node("Count Analysis", lambda s: s)
        graph.add_node("Summary Analysis", lambda s: s)
        graph.add_node("Comparison Analysis", lambda s: s)

        graph.add_node("Summary Sheet", self.sheet_loader_node("summary"))
        graph.add_node("Back Office Sheet", self.sheet_loader_node("back_office"))
        graph.add_node("Call Center Sheet", self.sheet_loader_node("call_center"))
        graph.add_node("Leader Sheet", self.sheet_loader_node("leaders"))
        graph.add_node("Retails Sheet", self.sheet_loader_node("retail"))

        graph.add_node("Code Writer Node", self.code_writer_node)
        graph.add_node("Code Review Node", self.code_review_node)
        graph.add_node("Code Rewrite Node", self.code_writer_node)  # regenerate
        graph.add_node("LLM Node", self.exec_node)

        graph.add_node("ECharts Bar", self.echarts_node("bar"))
        graph.add_node("ECharts Line", self.echarts_node("line"))
        graph.add_node("ECharts Pie", self.echarts_node("pie"))
        graph.add_node("ECharts Scatter", self.echarts_node("scatter"))
        graph.add_node("ECharts Design Enhancement", self.echarts_design_merge_node)

        # Entry
        graph.set_entry_point("start")

        # Routing
        graph.add_conditional_edges("start", self.analysis_router, {
            "Skill Analysis": "Skill Analysis",
            "Gap Analysis": "Gap Analysis",
            "Count Analysis": "Count Analysis",
            "Summary Analysis": "Summary Analysis",
            "Comparison Analysis": "Comparison Analysis",
        })

        for node in ["Skill Analysis", "Gap Analysis", "Count Analysis", "Summary Analysis", "Comparison Analysis"]:
            graph.add_conditional_edges(node, self.sheet_router, {
                "Summary Sheet": "Summary Sheet",
                "Back Office Sheet": "Back Office Sheet",
                "Call Center Sheet": "Call Center Sheet",
                "Leader Sheet": "Leader Sheet",
                "Retails Sheet": "Retails Sheet",
            })

        for sheet_node in ["Summary Sheet", "Back Office Sheet", "Call Center Sheet", "Leader Sheet", "Retails Sheet"]:
            graph.add_edge(sheet_node, "Code Writer Node")

        graph.add_edge("Code Writer Node", "Code Review Node")
        graph.add_conditional_edges("Code Review Node", self.review_router, {
            "LLM Node": "LLM Node",
            "Code Rewrite Node": "Code Rewrite Node",
        })
        graph.add_edge("Code Rewrite Node", "Code Review Node")

        graph.add_conditional_edges("LLM Node", self.echarts_router, {
            "ECharts Bar": "ECharts Bar",
            "ECharts Line": "ECharts Line",
            "ECharts Pie": "ECharts Pie",
            "ECharts Scatter": "ECharts Scatter",
        })
        graph.add_edge("ECharts Bar", "ECharts Design Enhancement")
        graph.add_edge("ECharts Line", "ECharts Design Enhancement")
        graph.add_edge("ECharts Pie", "ECharts Design Enhancement")
        graph.add_edge("ECharts Scatter", "ECharts Design Enhancement")
        graph.add_edge("ECharts Design Enhancement", END)

        return graph.compile()
    
    def run(self, initial_state: Dict[str, Any]) -> Dict[str, Any]:
        """Run the workflow with initial state."""
        # Seed defaults and attach chains for nodes that need them
        initial_state.setdefault("response", {})
        initial_state.setdefault("review_attempts", 0)
        initial_state.setdefault("max_review_attempts", 3)
        initial_state.setdefault("error_log", [])
        initial_state["_chains"] = self.chains
        return self.graph.invoke(initial_state)


#