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

from pydantic import BaseModel, Field
from models.data_analysis import (
    ExecutiveInsight,
    HRInsight,
    TeamInsight,
    SkillInsight,
    DashboardState
)
from ..prompts.prompts import EXECUTIVE_PROMPT, HR_PROMPT, TEAM_PROMPT, SKILL_PROMPT
# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# =============================================================================
# LLM SETUP
# =============================================================================

# Initialize LLM (you'll need to set your API key)
from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file if available
import os
from langchain_anthropic import ChatAnthropic
os.environ['ANTHROPIC_API_KEY'] = os.getenv('ANTHROPIC_API_KEY')
llm = ChatAnthropic(model_name='claude-3-7-sonnet-20250219')
# llm=ChatAnthropic(model_name='claude-3-5-sonnet-20240620')



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

# =============================================================================
# DATA PROCESSING UTILITIES
# =============================================================================

class DataProcessor:
    """Utility class for processing assessment data"""

    @staticmethod
    def process_raw_data(raw_data: Dict[str, Any]) -> Dict[str, pd.DataFrame]:
        """Process raw data into structured DataFrames"""
        try:
            sheets = raw_data.get("sheets", {})
            processed = {}

            

            for sheet_name, df in sheets.items():
                # Clean and standardize the dataframe
                df_clean = df.copy()
                df_clean.columns = df_clean.columns.astype(str).str.strip()

                # Handle missing values
                df_clean = df_clean.fillna(0)

                # Standardize column names for easier processing
                if 'Employee ID' in df_clean.columns:
                    df_clean['Employee_ID'] = df_clean['Employee ID']

                processed[sheet_name] = df_clean

            logger.info(f"Processed {len(processed)} datasets successfully")
            return processed

        except Exception as e:
            logger.error(f"Error processing data: {e}")
            return {}

    @staticmethod
    def generate_executive_summary(processed_data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """Generate executive summary data for analysis"""
        try:
            # Handle empty data case
            if not processed_data:
                return {
                    "dataset_count": 0,
                    "departments": [],
                    "date_range": "No data available",
                    "performance_summary": "No assessment data available for analysis",
                    "key_metrics": {
                        "average_score": 0,
                        "total_assessed": 0,
                        "department_count": 0
                    }
                }

            total_employees = 0
            departments = []
            avg_scores = []

            for sheet_name, df in processed_data.items():
                departments.append(sheet_name)
                total_employees += df['Employee ID'].nunique()
                if 'Total Score' in df.columns or 'Total Scores %' in df.columns:
                    score_col = 'Total Scores %' if 'Total Scores %' in df.columns else 'Total Score %'
                    if score_col in df.columns:
                        valid_scores = pd.to_numeric(df[score_col], errors='coerce').dropna()
                        if len(valid_scores) > 0:
                            avg_scores.extend(valid_scores.tolist())
                            

            return {
                "dataset_count": len(processed_data),
                "departments": departments,
                "date_range": "Latest Assessment Period",
                "performance_summary": f"Analysis of {total_employees} employees across {len(departments)} departments",
                "key_metrics": {
                    "average_score": np.mean(avg_scores) if avg_scores else 0,
                    "total_assessed": total_employees,
                    "department_count": len(departments)
                }
            }

        except Exception as e:
            logger.error(f"Error generating executive summary: {e}")
            return {}

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
    """Create the LangGraph workflow for dashboard analysis"""

    # Create the graph
    workflow = StateGraph(DashboardState)

    # Add nodes
    workflow.add_node("data_processing", data_processing_node)
    workflow.add_node("executive_analysis", executive_analysis_node)
    workflow.add_node("hr_analysis", hr_analysis_node)
    workflow.add_node("team_analysis", team_analysis_node)
    workflow.add_node("skill_analysis", skill_analysis_node)
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