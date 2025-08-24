import asyncio
from typing import Dict, Any
import pandas as pd
import numpy as np
import json
import logging

# LangGraph and LangChain imports
from langgraph.graph import StateGraph, END, START
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
from langchain_core.output_parsers import JsonOutputParser, PydanticOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from ..prompts.prompts import (
    EXECUTIVE_PROMPT,
    HR_PROMPT,
    TEAM_PROMPT,
    SKILL_PROMPT
)
from models.data_analysis import (
    ExecutiveInsight,
    HRInsight,
    TeamInsight,
    SkillInsight,
    DashboardState
)
from dotenv import load_dotenv
load_dotenv()
from langchain_anthropic import ChatAnthropic
llm=ChatAnthropic(model_name='claude-3-7-sonnet-20250219', temperature=0.5, max_tokens=10000)
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# =============================================================================
# LLM SETUP
# =============================================================================



# Executive Analysis Chain
executive_chain = (
    EXECUTIVE_PROMPT
    | llm
    | JsonOutputParser(pydantic_object=ExecutiveInsight)
)

# HR Analysis Chain
hr_chain = (
    HR_PROMPT
    | llm
    | JsonOutputParser(pydantic_object=HRInsight)
)

# Team Management Chain
team_chain = (
    TEAM_PROMPT
    | llm
    | JsonOutputParser(pydantic_object=TeamInsight)
)

# Skills Analysis Chain
skill_chain = (
    SKILL_PROMPT
    | llm
    | JsonOutputParser(pydantic_object=SkillInsight)
)

# ======= SAFE LLM INVOCATION HELPERS (replaces direct JsonOutputParser chains) =======
import re

def _safe_json_extract(text: str) -> Dict[str, Any]:
    try:
        # Extract first JSON object
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if not match:
            return {}
        candidate = match.group(0)
        return json.loads(candidate)
    except Exception:
        return {}

def _ensure_exec_defaults(d: Dict[str, Any]) -> Dict[str, Any]:
    d.setdefault("total_employees", 0)
    d.setdefault("average_performance", 0)
    d.setdefault("top_performing_department", "")
    d.setdefault("areas_of_concern", [])
    d.setdefault("trend_analysis", "stable")
    d.setdefault("key_recommendations", [])
    d.setdefault("performance_distribution", {})
    d.setdefault("department_performance_ranking", [])
    d.setdefault("performance_variance", 0)
    d.setdefault("competency_strength_areas", [])
    d.setdefault("risk_indicators", {})
    d.setdefault("roi_metrics", {"training_effectiveness":0,"performance_improvement":0,"talent_retention":0})
    return d

def _ensure_hr_defaults(d: Dict[str, Any]) -> Dict[str, Any]:
    d.setdefault("workforce_analytics", {})
    d.setdefault("performance_gaps", [])
    d.setdefault("training_priorities", [])
    d.setdefault("retention_risk", {})
    d.setdefault("diversity_metrics", {})
    d.setdefault("recommended_actions", [])
    d.setdefault("talent_segmentation", {})
    d.setdefault("succession_planning", {})
    d.setdefault("compensation_benchmarks", {})
    d.setdefault("engagement_indicators", {})
    d.setdefault("turnover_predictions", {})
    return d

def _ensure_team_defaults(d: Dict[str, Any]) -> Dict[str, Any]:
    d.setdefault("team_performance_ranking", [])
    d.setdefault("collaboration_metrics", {})
    d.setdefault("leadership_effectiveness", {})
    d.setdefault("team_dynamics", [])
    d.setdefault("management_recommendations", [])
    d.setdefault("cross_functional_analysis", {})
    d.setdefault("leadership_pipeline", {})
    d.setdefault("team_productivity_metrics", {})
    d.setdefault("conflict_resolution_effectiveness", {})
    d.setdefault("innovation_indicators", {})
    return d

def _ensure_skill_defaults(d: Dict[str, Any]) -> Dict[str, Any]:
    d.setdefault("competency_analysis", {})
    d.setdefault("skill_gaps", [])
    d.setdefault("development_pathways", {})
    d.setdefault("benchmark_comparison", {})
    d.setdefault("upskilling_priorities", [])
    d.setdefault("competency_matrix", {})
    d.setdefault("skill_trend_analysis", {})
    d.setdefault("critical_skill_shortages", [])
    d.setdefault("learning_effectiveness", {})
    d.setdefault("future_skill_requirements", [])
    return d

async def _invoke_and_parse(prompt, llm, inputs: Dict[str, Any], model_cls, ensure_fn):
    # Pass only required variables (supply union; extra keys are ignored)
    required = getattr(prompt, "input_variables", [])
    filtered = {k: v for k, v in inputs.items() if k in required}
    # If prompt still legacy, ensure legacy vars exist
    # (We already constructed inputs with both legacy & enhanced keys)
    msg = await (prompt | llm).ainvoke(filtered)
    raw = msg.content if hasattr(msg, "content") else str(msg)
    data = _safe_json_extract(raw)
    data = ensure_fn(data)
    return model_cls(**data)

# ======= LEGACY EXECUTIVE SUMMARY BUILDER (for backward prompt compatibility) =======
def build_legacy_executive_inputs(stats: Dict[str, Any], benchmarks: Dict[str, Any]) -> Dict[str, Any]:
    dept_stats = stats.get("department_stats", {})
    departments = list(dept_stats.keys())
    dataset_count = len(departments)
    total_employees = stats.get("overall_metrics", {}).get("total_employees", 0)
    avg_org = stats.get("overall_metrics", {}).get("organization_average", 0)
    performance_summary = f"Analysis of {total_employees} employees across {dataset_count} departments. Org average: {avg_org:.2f}"
    key_metrics = {
        "average_score": avg_org,
        "total_assessed": total_employees,
        "department_count": dataset_count
    }
    return {
        "dataset_count": dataset_count,
        "date_range": "Latest Assessment Period",
        "departments": departments,
        "performance_summary": performance_summary,
        "key_metrics": key_metrics
    }

# =============================================================================
# DATA PROCESSING UTILITIES
# =============================================================================

class DataProcessor:
    """Enhanced utility class for advanced data processing and analytics"""

    @staticmethod
    def process_raw_data(raw_data: Dict[str, Any]) -> Dict[str, pd.DataFrame]:
        """Process raw data with enhanced cleaning and standardization"""
        try:
            sheets = raw_data.get("sheets", {})
            processed = {}

            for sheet_name, df in sheets.items():
                df_clean = df.copy()
                df_clean.columns = df_clean.columns.astype(str).str.strip()
                
                # Convert numeric columns properly
                numeric_columns = [col for col in df_clean.columns if 'Score' in col or '% Score' in col]
                for col in numeric_columns:
                    df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')
                
                # Fill missing values with department median for scores
                for col in numeric_columns:
                    if df_clean[col].isna().any():
                        median_val = df_clean[col].median()
                        df_clean[col] = df_clean[col].fillna(median_val)
                
                # Standardize key columns
                if 'Employee ID' in df_clean.columns:
                    df_clean['Employee_ID'] = df_clean['Employee ID']
                
                processed[sheet_name] = df_clean

            logger.info(f"Processed {len(processed)} datasets with enhanced analytics")
            return processed

        except Exception as e:
            logger.error(f"Error in enhanced data processing: {e}")
            return {}

    @staticmethod
    def generate_statistical_summary(processed_data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """Generate comprehensive statistical analysis"""
        try:
            if not processed_data:
                return {"status": "no_data", "message": "No data available for analysis"}

            summary = {
                "department_stats": {},
                "overall_metrics": {},
                "distribution_analysis": {},
                "variance_analysis": {}
            }

            total_employees = 0
            all_scores = []
            department_averages = {}

            for dept_name, df in processed_data.items():
                # Department-specific statistics
                score_columns = [col for col in df.columns if 'Total Score' in col and '%' in col]
                competency_columns = [col for col in df.columns if any(arabic in col for arabic in 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي')]
                
                if score_columns:
                    main_score_col = score_columns[0]
                    dept_scores = df[main_score_col].dropna()
                    
                    summary["department_stats"][dept_name] = {
                        "employee_count": len(df),
                        "avg_performance": float(dept_scores.mean()),
                        "median_performance": float(dept_scores.median()),
                        "std_deviation": float(dept_scores.std()),
                        "min_score": float(dept_scores.min()),
                        "max_score": float(dept_scores.max()),
                        "performance_range": float(dept_scores.max() - dept_scores.min()),
                        "competency_count": len(competency_columns)
                    }
                    
                    department_averages[dept_name] = float(dept_scores.mean())
                    all_scores.extend(dept_scores.tolist())
                    total_employees += len(df)

            # Overall organizational metrics
            if all_scores:
                summary["overall_metrics"] = {
                    "total_employees": total_employees,
                    "organization_average": np.mean(all_scores),
                    "organization_median": np.median(all_scores),
                    "organization_std": np.std(all_scores),
                    "performance_variance": np.var(all_scores),
                    "coefficient_of_variation": np.std(all_scores) / np.mean(all_scores) if np.mean(all_scores) > 0 else 0
                }

                # Performance distribution analysis
                scores_array = np.array(all_scores)
                summary["distribution_analysis"] = {
                    "high_performers": int(np.sum(scores_array >= 85)),
                    "core_performers": int(np.sum((scores_array >= 70) & (scores_array < 85))),
                    "developing_performers": int(np.sum(scores_array < 70)),
                    "percentile_25": float(np.percentile(scores_array, 25)),
                    "percentile_75": float(np.percentile(scores_array, 75)),
                    "iqr": float(np.percentile(scores_array, 75) - np.percentile(scores_array, 25))
                }

            return summary

        except Exception as e:
            logger.error(f"Error generating statistical summary: {e}")
            return {"status": "error", "message": str(e)}

    @staticmethod
    def analyze_competency_performance(processed_data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """Analyze competency performance across departments"""
        try:
            competency_analysis = {
                "department_competencies": {},
                "cross_departmental_comparison": {},
                "skill_strength_matrix": {},
                "improvement_opportunities": []
            }

            for dept_name, df in processed_data.items():
                # Extract competency columns (Arabic skill names)
                competency_cols = [col for col in df.columns if any(arabic in col for arabic in 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي')]
                
                if competency_cols:
                    dept_competencies = {}
                    for col in competency_cols:
                        # Find corresponding score column
                        score_col_idx = df.columns.get_loc(col) - 1
                        if score_col_idx >= 0 and 'Score per Competency' in df.columns[score_col_idx]:
                            scores = pd.to_numeric(df[df.columns[score_col_idx]], errors='coerce').dropna()
                            if len(scores) > 0:
                                dept_competencies[col] = {
                                    "average_score": float(scores.mean()),
                                    "proficiency_level": "advanced" if scores.mean() >= 85 else "proficient" if scores.mean() >= 70 else "developing",
                                    "consistency": float(100 - scores.std()) if scores.std() > 0 else 100
                                }
                    
                    competency_analysis["department_competencies"][dept_name] = dept_competencies

            return competency_analysis

        except Exception as e:
            logger.error(f"Error in competency analysis: {e}")
            return {"status": "error", "message": str(e)}

    @staticmethod
    def calculate_department_benchmarks(processed_data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """Calculate department performance benchmarks"""
        try:
            benchmarks = {
                "performance_ranking": [],
                "relative_performance": {},
                "benchmark_metrics": {}
            }

            dept_performances = {}
            
            for dept_name, df in processed_data.items():
                score_columns = [col for col in df.columns if 'Total Score' in col and '%' in col]
                if score_columns:
                    main_scores = pd.to_numeric(df[score_columns[0]], errors='coerce').dropna()
                    if len(main_scores) > 0:
                        dept_performances[dept_name] = {
                            "avg_score": float(main_scores.mean()),
                            "employee_count": len(df),
                            "performance_consistency": float(100 - main_scores.std()) if main_scores.std() > 0 else 100
                        }

            # Rank departments
            sorted_depts = sorted(dept_performances.items(), key=lambda x: x[1]["avg_score"], reverse=True)
            for rank, (dept_name, metrics) in enumerate(sorted_depts, 1):
                benchmarks["performance_ranking"].append({
                    "department": dept_name,
                    "rank": rank,
                    "avg_score": metrics["avg_score"],
                    "employee_count": metrics["employee_count"],
                    "consistency_score": metrics["performance_consistency"]
                })

            return benchmarks

        except Exception as e:
            logger.error(f"Error calculating benchmarks: {e}")
            return {"status": "error", "message": str(e)}

    @staticmethod
    def analyze_performance_correlations(processed_data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """Analyze correlations between different competencies"""
        try:
            correlations = {
                "competency_correlations": {},
                "skill_interdependencies": {},
                "performance_drivers": []
            }

            for dept_name, df in processed_data.items():
                # Get all score columns
                score_columns = [col for col in df.columns if 'Score per Competency' in col]
                
                if len(score_columns) > 1:
                    # Create correlation matrix
                    score_data = df[score_columns].apply(pd.to_numeric, errors='coerce')
                    corr_matrix = score_data.corr()
                    
                    # Find strongest correlations
                    strong_correlations = []
                    for i in range(len(corr_matrix.columns)):
                        for j in range(i+1, len(corr_matrix.columns)):
                            corr_value = corr_matrix.iloc[i, j]
                            if abs(corr_value) > 0.6:  # Strong correlation threshold
                                strong_correlations.append({
                                    "competency_1": corr_matrix.columns[i],
                                    "competency_2": corr_matrix.columns[j],
                                    "correlation": float(corr_value),
                                    "relationship": "positive" if corr_value > 0 else "negative"
                                })
                    
                    correlations["competency_correlations"][dept_name] = strong_correlations

            return correlations

        except Exception as e:
            logger.error(f"Error analyzing correlations: {e}")
            return {"status": "error", "message": str(e)}

# Enhanced workflow nodes
async def enhanced_data_processing_node(state: DashboardState) -> DashboardState:
    """Enhanced data processing with comprehensive analytics"""
    try:
        logger.info("Performing enhanced data processing...")
        
        # Basic data processing
        processed_data = DataProcessor.process_raw_data(state["raw_data"])
        state["processed_data"] = processed_data
        
        # Generate comprehensive analytics
        statistical_summary = DataProcessor.generate_statistical_summary(processed_data)
        competency_analytics = DataProcessor.analyze_competency_performance(processed_data)
        department_benchmarks = DataProcessor.calculate_department_benchmarks(processed_data)
        performance_correlations = DataProcessor.analyze_performance_correlations(processed_data)
        
        # Store analytics in state
        state["statistical_summary"] = statistical_summary
        state["competency_analytics"] = competency_analytics
        state["department_benchmarks"] = department_benchmarks
        state["performance_correlations"] = performance_correlations
        
        state["messages"].append(AIMessage(content="Enhanced data processing and analytics completed"))
        return state

    except Exception as e:
        error_msg = f"Enhanced data processing failed: {str(e)}"
        logger.error(error_msg)
        state["error_log"].append(error_msg)
        return state

async def enhanced_executive_analysis_node(state: DashboardState) -> DashboardState:
    """Enhanced executive analysis with comprehensive business insights"""
    try:
        logger.info("Performing enhanced executive analysis...")
        stats = state.get("statistical_summary", {})
        benchmarks = state.get("department_benchmarks", {})
        competencies = state.get("competency_analytics", {})
        correlations = state.get("performance_correlations", {})

        legacy = build_legacy_executive_inputs(stats, benchmarks)

        executive_data = {
            # Enhanced variables:
            "statistical_summary": json.dumps(stats, indent=2),
            "department_benchmarks": json.dumps(benchmarks, indent=2),
            "competency_analytics": json.dumps(competencies, indent=2),
            "performance_correlations": json.dumps(correlations, indent=2),
            "total_employees": stats.get("overall_metrics", {}).get("total_employees", 0),
            "department_count": len(state["processed_data"]),
            "performance_distribution": stats.get("distribution_analysis", {}),
            "competency_variance": stats.get("overall_metrics", {}).get("coefficient_of_variation", 0),
            "risk_indicators": {
                "performance_variance": stats.get("overall_metrics", {}).get("performance_variance", 0),
                "low_performers": stats.get("distribution_analysis", {}).get("developing_performers", 0)
            },
            # Legacy compatibility keys:
            **legacy
        }

        result = await _invoke_and_parse(
            EXECUTIVE_PROMPT,
            llm,
            executive_data,
            ExecutiveInsight,
            _ensure_exec_defaults
        )
        state["executive_insights"] = result
        state["current_analysis"] = "executive_completed"
        state["messages"].append(AIMessage(content="Enhanced executive analysis completed"))
        return state
    except Exception as e:
        error_msg = f"Enhanced executive analysis failed: {str(e)}"
        logger.error(error_msg)
        state["error_log"].append(error_msg)
        state["current_analysis"] = "executive_failed"
        return state

async def enhanced_hr_analysis_node(state: DashboardState) -> DashboardState:
    """Enhanced HR analysis with comprehensive workforce insights"""
    try:
        logger.info("Performing enhanced HR analysis...")
        stats = state.get("statistical_summary", {})
        competencies = state.get("competency_analytics", {})
        benchmarks = state.get("department_benchmarks", {})

        employee_demographics = {
            "total_employees": stats.get("overall_metrics", {}).get("total_employees", 0),
            "departments": list(state["processed_data"].keys()),
            "performance_segments": stats.get("distribution_analysis", {})
        }
        performance_segmentation = {
            "high_performers": stats.get("distribution_analysis", {}).get("high_performers", 0),
            "core_performers": stats.get("distribution_analysis", {}).get("core_performers", 0),
            "developing_performers": stats.get("distribution_analysis", {}).get("developing_performers", 0)
        }
        competency_breakdown = competencies.get("department_competencies", {})
        department_analysis = {d: info for d, info in stats.get("department_stats", {}).items()}
        # FIX: iterate list of dicts properly
        consistency_scores = {
            entry["department"]: entry.get("consistency_score", 0)
            for entry in benchmarks.get("performance_ranking", [])
        }
        talent_metrics = {
            "performance_variance": stats.get("overall_metrics", {}).get("coefficient_of_variation", 0),
            "consistency_scores": consistency_scores
        }

        # Legacy keys (in case old prompt still loaded)
        legacy_hr = {
            "hr_data_summary": json.dumps({
                "departments": {
                    dept: {"employee_count": info.get("employee_count", 0),
                           "avg_performance": info.get("avg_performance", 0)}
                    for dept, info in department_analysis.items()
                }
            }, indent=2)
        }

        hr_inputs = {
            "employee_demographics": json.dumps(employee_demographics, indent=2),
            "performance_segmentation": json.dumps(performance_segmentation, indent=2),
            "competency_breakdown": json.dumps(competency_breakdown, indent=2),
            "department_analysis": json.dumps(department_analysis, indent=2),
            "talent_metrics": json.dumps(talent_metrics, indent=2),
            "performance_distributions": f"High:{performance_segmentation['high_performers']} Core:{performance_segmentation['core_performers']} Developing:{performance_segmentation['developing_performers']}",
            **legacy_hr
        }

        result = await _invoke_and_parse(
            HR_PROMPT,
            llm,
            hr_inputs,
            HRInsight,
            _ensure_hr_defaults
        )
        state["hr_insights"] = result
        state["current_analysis"] = "hr_completed"
        state["messages"].append(AIMessage(content="Enhanced HR analysis completed"))
        return state
    except Exception as e:
        error_msg = f"Enhanced HR analysis failed: {str(e)}"
        logger.error(error_msg)
        state["error_log"].append(error_msg)
        state["current_analysis"] = "hr_failed"
        return state

async def enhanced_team_analysis_node(state: DashboardState) -> DashboardState:
    """Enhanced team analysis with comprehensive team insights"""
    try:
        logger.info("Performing enhanced team analysis...")
        stats = state.get("statistical_summary", {})
        benchmarks = state.get("department_benchmarks", {})
        competencies = state.get("competency_analytics", {})
        correlations = state.get("performance_correlations", {})

        leadership_analysis = {}
        collaboration_data = {}
        for dept_name, df in state["processed_data"].items():
            if 'leaders' in dept_name.lower() or 'leader' in dept_name.lower() or 'Leaders' in dept_name:
                leadership_cols = [c for c in df.columns if any(term in c for term in ['قيادة','اتخاذ القرار','التفكير الاستراتيجي','التواصل'])]
                for col in leadership_cols:
                    idx = df.columns.get_loc(col) - 1
                    if idx >= 0 and 'Score per Competency' in df.columns[idx]:
                        vals = pd.to_numeric(df[df.columns[idx]], errors='coerce').dropna()
                        if len(vals) > 0:
                            leadership_analysis[col] = float(vals.mean())
            collab_cols = [c for c in df.columns if any(term in c for term in ['تعاون','جماعي','التواصل','فريق'])]
            dept_collab = {}
            for col in collab_cols:
                idx = df.columns.get_loc(col) - 1
                if idx >= 0 and 'Score per Competency' in df.columns[idx]:
                    vals = pd.to_numeric(df[df.columns[idx]], errors='coerce').dropna()
                    if len(vals) > 0:
                        dept_collab[col] = float(vals.mean())
            if dept_collab:
                collaboration_data[dept_name] = dept_collab

        cross_functional_insights = {
            "department_performance_variance": stats.get("overall_metrics", {}).get("coefficient_of_variation", 0),
            "interdepartmental_correlations": correlations.get("competency_correlations", {})
        }
        team_dynamics_data = {
            "performance_rankings": benchmarks.get("performance_ranking", []),
            "competency_strengths": competencies.get("department_competencies", {})
        }
        team_correlations = correlations.get("competency_correlations", {})
        leadership_effectiveness_data = leadership_analysis

        # Legacy prompt variables mapping
        simple_team_performance = []
        for entry in benchmarks.get("performance_ranking", []):
            simple_team_performance.append({
                "team_name": entry.get("department"),
                "score": entry.get("avg_score"),
                "rank": entry.get("rank")
            })

        legacy_team_payload = {
            "team_data": json.dumps(simple_team_performance, indent=2),
            "leadership_data": json.dumps(leadership_analysis, indent=2),
            "collaboration_metrics": json.dumps(collaboration_data, indent=2)
        }

        team_inputs = {
            "leadership_analysis": json.dumps(leadership_analysis, indent=2),
            "collaboration_data": json.dumps(collaboration_data, indent=2),
            "cross_functional_insights": json.dumps(cross_functional_insights, indent=2),
            "team_dynamics_data": json.dumps(team_dynamics_data, indent=2),
            "team_correlations": json.dumps(team_correlations, indent=2),
            "leadership_effectiveness_data": json.dumps(leadership_effectiveness_data, indent=2),
            **legacy_team_payload
        }

        result = await _invoke_and_parse(
            TEAM_PROMPT,
            llm,
            team_inputs,
            TeamInsight,
            _ensure_team_defaults
        )
        state["team_insights"] = result
        state["current_analysis"] = "team_completed"
        state["messages"].append(AIMessage(content="Enhanced team analysis completed"))
        return state
    except Exception as e:
        error_msg = f"Enhanced team analysis failed: {str(e)}"
        logger.error(error_msg)
        state["error_log"].append(error_msg)
        state["current_analysis"] = "team_failed"
        return state

async def enhanced_skill_analysis_node(state: DashboardState) -> DashboardState:
    """Enhanced skill analysis with comprehensive competency insights"""
    try:
        logger.info("Performing enhanced skill analysis...")
        stats = state.get("statistical_summary", {})
        competencies = state.get("competency_analytics", {})
        benchmarks = state.get("department_benchmarks", {})

        competency_matrix = {
            dept: {skill: data.get("average_score", 0)
                   for skill, data in comp.items()}
            for dept, comp in competencies.get("department_competencies", {}).items()
        }
        # Aggregate competency averages for legacy prompt
        aggregated_competency_analysis = {}
        for dept, comp in competency_matrix.items():
            for skill, val in comp.items():
                aggregated_competency_analysis.setdefault(skill, []).append(val)
        aggregated_competency_analysis = {
            skill: float(np.mean(vals)) for skill, vals in aggregated_competency_analysis.items()
        }

        skill_benchmarks = {
            "department_averages": {
                r["department"]: r["avg_score"]
                for r in benchmarks.get("performance_ranking", [])
            },
            "organization_benchmark": stats.get("overall_metrics", {}).get("organization_average", 0)
        }

        skill_gap_analysis = {}
        for dept, comp in competency_matrix.items():
            gaps = []
            for skill, score in comp.items():
                target = 85.0
                if score < target:
                    gaps.append({
                        "skill": skill,
                        "current": score,
                        "target": target,
                        "gap": target - score
                    })
            skill_gap_analysis[dept] = gaps

        learning_metrics = {
            "consistency_scores": {
                dept: {
                    skill: competencies["department_competencies"][dept][skill]["consistency"]
                    for skill in competencies["department_competencies"][dept]
                } for dept in competencies.get("department_competencies", {})
            }
        }
        future_skills_data = {
            "emerging_skill_needs": ["Digital Transformation", "Remote Collaboration", "Data Analytics"]
        }
        benchmark_comparison_str = f"Org average {skill_benchmarks['organization_benchmark']:.2f}"

        # Legacy variables
        legacy_skill_payload = {
            "competency_data": json.dumps(competency_matrix, indent=2),
            "skill_metrics": f"{len(competency_matrix)} departments analyzed",
            "benchmark_data": benchmark_comparison_str
        }

        skill_inputs = {
            "competency_matrix": json.dumps(competency_matrix, indent=2),
            "skill_benchmarks": json.dumps(skill_benchmarks, indent=2),
            "skill_gap_analysis": json.dumps(skill_gap_analysis, indent=2),
            "learning_metrics": json.dumps(learning_metrics, indent=2),
            "future_skills_data": json.dumps(future_skills_data, indent=2),
            "benchmark_comparison": benchmark_comparison_str,
            **legacy_skill_payload
        }

        result = await _invoke_and_parse(
            SKILL_PROMPT,
            llm,
            skill_inputs,
            SkillInsight,
            _ensure_skill_defaults
        )
        state["skill_insights"] = result
        state["current_analysis"] = "skill_completed"
        state["messages"].append(AIMessage(content="Enhanced skill analysis completed"))
        return state
    except Exception as e:
        error_msg = f"Enhanced skill analysis failed: {str(e)}"
        logger.error(error_msg)
        state["error_log"].append(error_msg)
        state["current_analysis"] = "skill_failed"
        return state

# =============================================================================
# LANGGRAPH NODES
# =============================================================================

async def data_processing_node(state: DashboardState) -> DashboardState:
    """Process raw data into structured format"""
    try:
        logger.info("Processing raw data...")
        processed_data = DataProcessor.process_raw_data(state["raw_data"])

        state["processed_data"] = processed_data
        state["messages"].append(AIMessage(content="Data processing completed successfully"))

        return state

    except Exception as e:
        error_msg = f"Data processing failed: {str(e)}"
        logger.error(error_msg)
        state["error_log"].append(error_msg)
        state["messages"].append(AIMessage(content=error_msg))
        return state

async def executive_analysis_node(state: DashboardState) -> DashboardState:
    """Perform executive level analysis"""
    try:
        logger.info("Performing executive analysis...")

        summary_data = DataProcessor.generate_executive_summary(state["processed_data"])

        # Invoke the executive chain
        result = await executive_chain.ainvoke(summary_data)

        state["executive_insights"] = ExecutiveInsight(**result)
        state["current_analysis"] = "executive_completed"
        state["messages"].append(AIMessage(content="Executive analysis completed"))

        return state

    except Exception as e:
        error_msg = f"Executive analysis failed: {str(e)}"
        logger.error(error_msg)
        state["error_log"].append(error_msg)
        state["current_analysis"] = "executive_failed"
        return state

async def hr_analysis_node(state: DashboardState) -> DashboardState:
    """Perform HR analytics analysis"""
    try:
        logger.info("Performing HR analysis...")

        # Prepare HR-specific data with fallbacks
        hr_data = {}
        if not state["processed_data"]:
            hr_data["sample_department"] = {
                "employee_count": 5,
                "avg_performance": {"total_score": 82.8, "technical": 80.0, "leadership": 78.0},
                "performance_range": {"min": 71.0, "max": 92.0}
            }
        else:
            for sheet_name, df in state["processed_data"].items():
                if 'Name' in df.columns and 'Total Score' in str(df.columns):
                    hr_data[sheet_name] = {
                        "employee_count": len(df),
                        "avg_performance": df.select_dtypes(include=[np.number]).mean().to_dict(),
                        "performance_range": {
                            "min": float(df.select_dtypes(include=[np.number]).min().min()),
                            "max": float(df.select_dtypes(include=[np.number]).max().max())
                        }
                    }

        # Invoke the HR chain
        result = await hr_chain.ainvoke({
            "hr_data_summary": json.dumps(hr_data, indent=2),
            "department_analysis": f"Analysis across {len(hr_data)} departments",
            "performance_distributions": "Performance metrics calculated"
        })

        state["hr_insights"] = HRInsight(**result)
        state["current_analysis"] = "hr_completed"
        state["messages"].append(AIMessage(content="HR analysis completed"))

        return state

    except Exception as e:
        error_msg = f"HR analysis failed: {str(e)}"
        logger.error(error_msg)
        state["error_log"].append(error_msg)
        state["current_analysis"] = "hr_failed"
        return state

async def team_analysis_node(state: DashboardState) -> DashboardState:
    """Perform team management analysis"""
    try:
        logger.info("Performing team analysis...")

        # Prepare team-specific data with fallbacks
        team_data = {}
        leadership_data = {}

        if not state["processed_data"]:
            team_data["sample_team"] = {"collaboration": 85.0, "communication": 88.0}
            leadership_data["sample_leaders"] = {"strategic_thinking": 82.0, "team_development": 87.0}
        else:
            for sheet_name, df in state["processed_data"].items():
                # Look for leadership/team-related competencies
                leadership_cols = [col for col in df.columns if any(
                    term in col.lower() for term in ['قيادة', 'توجيه', 'تعاون', 'جماعي']
                )]

                if leadership_cols:
                    team_metrics = df[leadership_cols].select_dtypes(include=[np.number]).mean()
                    team_data[sheet_name] = team_metrics.to_dict()

                    if 'leader' in sheet_name.lower() or 'قيادة' in sheet_name:
                        leadership_data[sheet_name] = team_metrics.to_dict()

        # Invoke the team chain
        result = await team_chain.ainvoke({
            "team_data": json.dumps(team_data, indent=2),
            "leadership_data": json.dumps(leadership_data, indent=2),
            "collaboration_metrics": "Team collaboration metrics analyzed"
        })

        state["team_insights"] = TeamInsight(**result)
        state["current_analysis"] = "team_completed"
        state["messages"].append(AIMessage(content="Team analysis completed"))

        return state

    except Exception as e:
        error_msg = f"Team analysis failed: {str(e)}"
        logger.error(error_msg)
        state["error_log"].append(error_msg)
        state["current_analysis"] = "team_failed"
        return state

async def skill_analysis_node(state: DashboardState) -> DashboardState:
    """Perform comprehensive skill analysis"""
    try:
        logger.info("Performing skill analysis...")

        # Prepare competency data with fallbacks
        competency_data = {}

        if not state["processed_data"]:
            competency_data["sample_competencies"] = {
                "technical_skills": 80.0,
                "leadership": 78.0,
                "communication": 87.0,
                "problem_solving": 82.0
            }
        else:
            for sheet_name, df in state["processed_data"].items():
                # Find all competency columns (Arabic skill names)
                competency_cols = [col for col in df.columns if any(
                    arabic_char in col for arabic_char in 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'
                )]

                if competency_cols:
                    # Calculate average scores for each competency
                    competency_scores = {}
                    for col in competency_cols:
                        numeric_vals = pd.to_numeric(df[col], errors='coerce').dropna()
                        if len(numeric_vals) > 0:
                            competency_scores[col] = float(numeric_vals.mean())

                    competency_data[sheet_name] = competency_scores

        # Invoke the skill chain
        result = await skill_chain.ainvoke({
            "competency_data": json.dumps(competency_data, indent=2),
            "skill_metrics": f"Analyzed {len(competency_data)} skill domains",
            "benchmark_data": "Industry benchmark comparison available"
        })

        state["skill_insights"] = SkillInsight(**result)
        state["current_analysis"] = "skill_completed"
        state["messages"].append(AIMessage(content="Skill analysis completed"))

        return state

    except Exception as e:
        error_msg = f"Skill analysis failed: {str(e)}"
        logger.error(error_msg)
        state["error_log"].append(error_msg)
        state["current_analysis"] = "skill_failed"
        return state

async def finalization_node(state: DashboardState) -> DashboardState:
    """Finalize the analysis and prepare results"""
    try:
        logger.info("Finalizing dashboard analysis...")

        # Compile final results
        final_message = f"""
Dashboard Analysis Complete:
✓ Executive Overview: {state['executive_insights'] is not None}
✓ HR Analysis: {state['hr_insights'] is not None}
✓ Team Management: {state['team_insights'] is not None}
✓ Skill Analysis: {state['skill_insights'] is not None}

Errors: {len(state['error_log'])} issues logged
"""

        state["messages"].append(AIMessage(content=final_message))
        return state

    except Exception as e:
        error_msg = f"Finalization failed: {str(e)}"
        logger.error(error_msg)
        state["error_log"].append(error_msg)
        return state

# =============================================================================
# LANGGRAPH WORKFLOW CONSTRUCTION
# =============================================================================

def create_dashboard_graph():
    """Create enhanced LangGraph workflow"""
    workflow = StateGraph(DashboardState)

    # Add enhanced nodes
    workflow.add_node("data_processing", enhanced_data_processing_node)
    workflow.add_node("executive_analysis", enhanced_executive_analysis_node)
    workflow.add_node("hr_analysis", enhanced_hr_analysis_node)
    workflow.add_node("team_analysis", enhanced_team_analysis_node)
    workflow.add_node("skill_analysis", enhanced_skill_analysis_node)
    workflow.add_node("finalization", finalization_node)

    # Define the workflow edges - Sequential execution to avoid concurrent updates
    workflow.add_edge(START, "data_processing")
    workflow.add_edge("data_processing", "executive_analysis")
    workflow.add_edge("executive_analysis", "hr_analysis")
    workflow.add_edge("hr_analysis", "team_analysis")
    workflow.add_edge("team_analysis", "skill_analysis")
    workflow.add_edge("skill_analysis", "finalization")
    workflow.add_edge("finalization", END)

    return workflow.compile()

# =============================================================================
# MAIN DASHBOARD PIPELINE CLASS
# =============================================================================

class DashboardPipeline:
    """Main class for running the dashboard analysis pipeline"""

    def __init__(self):
        self.graph = create_dashboard_graph()
        logger.info("Dashboard pipeline initialized successfully")

    async def run_analysis(self, raw_data: Dict[str, Any]) -> DashboardState:
        """Run the complete dashboard analysis pipeline"""
        try:
            # Initialize state
            initial_state: DashboardState = {
                "raw_data": raw_data,
                "processed_data": {},
                "executive_insights": None,
                "hr_insights": None,
                "team_insights": None,
                "skill_insights": None,
                "messages": [HumanMessage(content="Starting dashboard analysis...")],
                "current_analysis": "initialization",
                "error_log": []
            }

            # Run the workflow
            logger.info("Starting dashboard analysis workflow...")
            final_state = await self.graph.ainvoke(initial_state)

            logger.info("Dashboard analysis completed successfully")
            return final_state

        except Exception as e:
            logger.error(f"Dashboard analysis failed: {e}")
            raise

    def get_results_summary(self, state: DashboardState) -> Dict[str, Any]:
        """Extract and format the analysis results"""
        return {
            "executive_overview": state["executive_insights"].model_dump() if state["executive_insights"] else None,
            "hr_analysis": state["hr_insights"].model_dump() if state["hr_insights"] else None,
            "team_management": state["team_insights"].model_dump() if state["team_insights"] else None,
            "skill_analysis": state["skill_insights"].model_dump() if state["skill_insights"] else None,
            "processing_messages": [msg.content for msg in state["messages"]],
            "errors": state["error_log"]
        }

# =============================================================================
# USAGE EXAMPLE
# =============================================================================
async def main():
    """Example usage of the dashboard pipeline"""
    

    # For demo purposes, create sample data structure
    from custom_loader import result
    sample_data = result

    # Initialize and run pipeline
    pipeline = DashboardPipeline()
    results = await pipeline.run_analysis(sample_data)

    # Get formatted results
    summary = pipeline.get_results_summary(results)

    # Display results
    print("=== DASHBOARD ANALYSIS RESULTS ===")
    print(json.dumps(summary, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())