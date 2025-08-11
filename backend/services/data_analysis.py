import asyncio
import os
import re
from langchain_anthropic.chat_models import ChatAnthropic
import pandas as pd
import time
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, BackgroundTasks
import uuid
from pathlib import Path

from models.database import UploadedFile, AnalysisResult, User
from models.data_analysis import DataAnalysisRequest, ChartGenerationResponse
# Replaced legacy graph with new LCEL workflow in route/service implementations
from core.database import get_async_db
from core.logger import logger, log_exception, log_function_entry, log_function_exit, log_data_info

class DataAnalysisService:
    
    @staticmethod
    async def get_file_by_id(db: AsyncSession, file_id: str, user_id: int = None) -> Optional[UploadedFile]:
        """Get uploaded file by ID (user_id now optional)"""
        if user_id:
            result = await db.execute(
                select(UploadedFile).where(
                    UploadedFile.file_id == file_id,
                    UploadedFile.user_id == user_id
                )
            )
        else:
            result = await db.execute(
                select(UploadedFile).where(UploadedFile.file_id == file_id)
            )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def save_analysis_result(
        db: AsyncSession,
        user_id: int,
        file_id: int,
        user_query: str,
        analysis_data: Dict[str, Any],
        processing_time: float,
        model_used: str,
        analysis_id: str = None
    ) -> AnalysisResult:
        """Save analysis result to database with simplified model"""
        
        logger.info(f"Saving analysis result to database...")
        
        # Use provided analysis_id or generate one
        if analysis_id:
            logger.info(f"Using provided analysis_id: {analysis_id}")
        else:
            import uuid
            import time
            timestamp = int(time.time())
            unique_suffix = str(uuid.uuid4())[:8]
            analysis_id = f"analysis_{timestamp}_{unique_suffix}"
            logger.info(f"Generated new analysis_id: {analysis_id}")
        
        # Extract essential data from analysis_data
        echart_code = analysis_data.get("echart_code")
        designed_echart_code = analysis_data.get("designed_echart_code")
        response_df = analysis_data.get("response_df")
        
        # Convert DataFrame to JSON if it's a DataFrame
        response_df_json = None
        if response_df is not None:
            if hasattr(response_df, 'to_dict'):
                # Always convert to records (list of dicts)
                response_df_json = response_df.to_dict('records')
            elif isinstance(response_df, dict):
                # Convert dict-of-columns to list of dicts (records)
                import pandas as pd
                response_df_json = pd.DataFrame(response_df).to_dict('records')
            elif isinstance(response_df, list):
                response_df_json = response_df
        
        try:
            db_result = AnalysisResult(
                analysis_id=analysis_id,
                user_id=user_id,
                file_id=file_id,
                query=user_query,
                echart_code=echart_code,
                designed_echart_code=designed_echart_code,
                response_df=response_df_json,
                is_active=True
            )
            
            db.add(db_result)
            await db.commit()
            await db.refresh(db_result)
            
            logger.info(f"Analysis result saved successfully with ID: {analysis_id}")
            return db_result
            
        except Exception as e:
            logger.error(f"Failed to save analysis result: {e}")
            await db.rollback()
            raise e

    @staticmethod
    async def get_analysis_by_analysis_id(
        db: AsyncSession, 
        analysis_id: str
    ) -> Optional[AnalysisResult]:
        """Get analysis result by analysis_id"""
        result = await db.execute(
            select(AnalysisResult).where(AnalysisResult.analysis_id == analysis_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_analysis_history_by_analysis_id(
        db: AsyncSession, 
        user_id: int, 
        limit: int = 50, 
        offset: int = 0
    ) -> list[AnalysisResult]:
        """Get user's analysis history using analysis_id"""
        result = await db.execute(
            select(AnalysisResult)
            .where(AnalysisResult.user_id == user_id)
            .order_by(AnalysisResult.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()

    @staticmethod
    async def run_background_analysis(
        file_id: str,
        user_id: int,
        request: DataAnalysisRequest,
        result_storage: Dict[str, Any],
        task_id: str,
        analysis_id: str = None  # Accept pre-generated analysis_id
    ) -> str:
        """Run analysis in background task with enhanced multi-DataFrame support"""
        
        log_function_entry(logger, "run_background_analysis", 
                          file_id=file_id, user_id=user_id, task_id=task_id, 
                          prompt_length=len(request.prompt) if request.prompt else 0)
        
        start_time = time.time()
        
        if task_id not in result_storage:
            result_storage[task_id] = {"status": "processing", "progress": 0}
        
        try:
            async with get_async_db() as db:
                # Get file with detailed logging
                logger.info(f"🔍 Looking up file_id: {file_id}")
                file_obj = await DataAnalysisService.get_file_by_id(db, file_id)
                if not file_obj:
                    logger.error(f"❌ File not found in database: {file_id}")
                    raise HTTPException(status_code=404, detail="File not found")
                
                logger.info(f"✅ File found: {file_obj.original_filename}, path: {file_obj.file_path}")
                
                # Verify file exists on disk with detailed logging
                if not os.path.exists(file_obj.file_path):
                    logger.error(f"❌ Physical file not found at path: {file_obj.file_path}")
                    logger.error(f"📁 Current working directory: {os.getcwd()}")
                    logger.error(f"📁 Directory contents: {os.listdir('.')}")
                    raise HTTPException(status_code=404, detail="Physical file not found")
                
                # Load data with enhanced logging and error handling
                logger.info(f"📂 Loading data from: {file_obj.file_path}")
                
                try:
                    sheets = pd.read_excel(file_obj.file_path, sheet_name=None, skiprows=4)

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

                    loading_data={
                        "sheets": sheets,
                        "selected_sheets": selected_sheets,
                        "dfs_list": dfs_list,
                        "sheets_metadata": sheets_metadata,
                        "total_sheets": total_sheets,
                        "columns": columns,
                        "shapes": shapes,
                        "data_types": data_types
                    }
                    logger.info(f"✅ Data loaded successfully. Total DataFrames: {len(dfs_list)}")  
                    
                except Exception as file_load_error:
                    logger.error(f"❌ Failed to load file {file_obj.file_path}")
                    log_exception(logger, "File loading error", file_load_error)
                    raise HTTPException(status_code=400, detail=f"Failed to load file: {str(file_load_error)}")
                
                result_storage[task_id]["progress"] = 25
                
                # Run analysis using LCEL workflow with initial state from frontend-compatible inputs
                logger.info(f"🤖 Starting LCEL workflow analysis with primary DataFrame...")
                analysis_start_time = time.time()

                if not request.prompt or len(request.prompt.strip()) < 10:
                    logger.error(f"❌ Invalid prompt: '{request.prompt}' (length: {len(request.prompt) if request.prompt else 0})")
                    raise HTTPException(status_code=400, detail="Prompt is too short or empty")

                try:
                    from agents.graphs.lcel_workflow import DataAnalysisWorkflow

                    # Build initial AgentState-compatible dict
                    initial_state = {
                        "messages": [request.prompt],
                        "analysis_type": "",
                        "sheet": request.sheet,
                        "graph_type": request.graph_type,
                        "code_snippet": "",
                        "review_feedback": "",
                        "review_approved": False,
                        "response": {},
                        "review_attempts": 0,
                        "max_review_attempts": 3,
                        "echart_sample_code": request.echart_sample_code,
                        **loading_data
                    }
                    llm=ChatAnthropic(model_name='claude-3-7-sonnet-20250219',max_tokens=60000)
                    # llm=ChatAnthropic(model_name='claude-3-5-sonnet-20240620')
                    workflow = DataAnalysisWorkflow(llm=llm)
                    final_state = await asyncio.get_event_loop().run_in_executor(None, workflow.run, initial_state)
                    designed_echart_code = final_state.get("designed_echart_code")
                    # clean code by removing ``` ``` and word option
                    designed_echart_code = re.sub(r"^```|```$", "", designed_echart_code.strip(), flags=re.MULTILINE)

                    # Remove "option =" and any leading/trailing spaces or semicolons
                    designed_echart_code = re.sub(r"^\s*option\s*=\s*", "", designed_echart_code.strip())
                    designed_echart_code = designed_echart_code.rstrip(";").strip()

                    analysis_result = {
                        "success":True,
                        "analysis_prompt":request.prompt,
                        "analysis_id":analysis_id,
                        "response_df":final_state.get("response_df").to_dict(),
                        "echart_code":final_state.get("echart_code"),
                        "designed_echart_code": designed_echart_code,
                        "analysis_duration":time.time() - analysis_start_time,
                        
                    }
                    # Normalize output to the expected analysis_result dict including minimal payload
                   

                    analysis_duration = time.time() - analysis_start_time
                    logger.info(f"✅ LCEL workflow completed in {analysis_duration:.2f} seconds")

                except Exception as workflow_error:
                    logger.error("❌ LCEL workflow execution failed")
                    log_exception(logger, "LCEL workflow error", workflow_error)
                    raise HTTPException(status_code=500, detail=f"AI workflow failed: {str(workflow_error)}")
                
                processing_time = time.time() - start_time
                logger.info(f"⏱️ Total analysis completed in {processing_time:.2f} seconds")
                
                result_storage[task_id]["progress"] = 75
                
                # Determine overall success with detailed logging
                overall_success = False
               
                # Save to database with enhanced error handling
                try:
                    logger.info("💾 Saving analysis result to database...")
                    db_result = await DataAnalysisService.save_analysis_result(
                        db, user_id, file_obj.id, request.prompt, 
                        analysis_result, processing_time, request.model,
                        analysis_id  # Pass the analysis_id
                    )
                    logger.info(f"✅ Analysis saved with ID: {db_result.analysis_id}")
                    
                    result_storage[task_id] = {
                        "status": "completed",
                        "progress": 100,
                        "result": analysis_result,
                        "analysis_id": db_result.analysis_id,
                        "database_id": db_result.id,
                        "task_id": task_id,
                        "success": overall_success,
                        # Snapshot of agent final state for frontend rendering (response_df, echarts, etc.)
                        "final_state": final_state,
                        
                    }
                    
                    total_duration = time.time() - start_time
                    log_function_exit(logger, "run_background_analysis", 
                                    result=f"success={overall_success}, analysis_id={db_result.analysis_id}", 
                                    duration=total_duration)
                    
                except Exception as save_error:
                    logger.error("❌ Failed to save to database")
                    log_exception(logger, "Database save error", save_error)
                    
                    result_storage[task_id] = {
                        "status": "completed",
                        "progress": 100,
                        "result": analysis_result,
                        "analysis_id": None,
                        "database_id": None,
                        "task_id": task_id,
                        "success": overall_success,
                        # Even on failed save, expose the final_state for frontend consumption
                        "final_state": final_state,
                        
                    }
            
        except Exception as e:
            logger.error("❌ Background analysis failed")
            log_exception(logger, "Background analysis error", e)
            
            result_storage[task_id] = {
                "status": "failed",
                "progress": 0,
                "error": str(e),
                "task_id": task_id,
                "success": False
            }
        
        return task_id

    @staticmethod
    async def get_user_analysis_history(
        db: AsyncSession, 
        user_id: int, 
        limit: int = 50, 
        offset: int = 0
    ) -> list[AnalysisResult]:
        """Get user's analysis history"""
        result = await db.execute(
            select(AnalysisResult)
            .where(AnalysisResult.user_id == user_id)
            .order_by(AnalysisResult.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()
        
        return task_id

    @staticmethod
    async def get_user_analysis_history(
        db: AsyncSession, 
        user_id: int, 
        limit: int = 50, 
        offset: int = 0
    ) -> list[AnalysisResult]:
        """Get user's analysis history"""
        result = await db.execute(
            select(AnalysisResult)
            .where(AnalysisResult.user_id == user_id)
            .order_by(AnalysisResult.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()
