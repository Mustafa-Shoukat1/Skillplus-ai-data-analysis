import asyncio
import os
import re

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

# Replace LCEL with custom workflow
from agents.graphs.lcel_workflow import DashboardPipeline
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
        analysis_data: Dict[str, Any],
        analysis_id: str = None
    ) -> AnalysisResult:
        """Save analysis result to database with custom workflow results"""
        
        logger.info(f"Saving custom workflow analysis result to database...")
        
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
        
        # Extract data from custom workflow results
        dashboard_results = analysis_data.get("dashboard_results", {})

        try:
            db_result = AnalysisResult(
                dashboard_results=dashboard_results,
                analysis_type='dashboard',
                analysis_id=analysis_id,
                user_id=user_id,
                file_id=file_id,
                is_active=True
            )
            
            db.add(db_result)
            await db.commit()
            await db.refresh(db_result)
            
            logger.info(f"Custom workflow analysis result saved successfully with ID: {analysis_id}")
            return db_result
            
        except Exception as e:
            logger.error(f"Failed to save custom workflow analysis result: {e}")
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
        result_storage: Dict[str, Any],
        task_id: str,
        analysis_id: str = None
    ) -> str:
        """Run custom workflow analysis in background task"""
        
        log_function_entry(logger, "run_background_analysis", 
                          file_id=file_id, user_id=user_id, task_id=task_id, 
        )
        
        start_time = time.time()
        
        if task_id not in result_storage:
            result_storage[task_id] = {"status": "processing", "progress": 0}
        
        try:
            async with get_async_db() as db:
                # Get file with detailed logging - FIXED: Remove user_id restriction initially
                logger.info(f"🔍 Looking up file_id: {file_id}")
                file_obj = await DataAnalysisService.get_file_by_id(db, file_id, user_id=None)
                if not file_obj:
                    logger.error(f"❌ File not found in database: {file_id}")
                    # Try alternative query to debug
                    from sqlalchemy import select
                    from models.database import UploadedFile
                    debug_result = await db.execute(select(UploadedFile))
                    all_files = debug_result.scalars().all()
                    logger.error(f"Available files: {[f.file_id for f in all_files]}")
                    raise HTTPException(status_code=404, detail=f"File not found: {file_id}")
                
                logger.info(f"✅ File found: {file_obj.original_filename}, path: {file_obj.file_path}")
                
                # Verify file exists on disk
                if not os.path.exists(file_obj.file_path):
                    logger.error(f"❌ Physical file not found at path: {file_obj.file_path}")
                    raise HTTPException(status_code=404, detail="Physical file not found")
                
                # Load data using the same structure as uploads.py
                logger.info(f"📂 Loading data from: {file_obj.file_path}")
                
                try:
                    # Check file extension to determine loading method
                    file_extension = Path(file_obj.file_path).suffix.lower()
                    
                    if file_extension in ['.xlsx', '.xls']:
                        # Load comprehensive data similar to uploads.py
                        sheets = pd.read_excel(file_obj.file_path, sheet_name=None, skiprows=4)
                        sheet_names = list(sheets.keys())

                        # Select sheets 2, 3, 4, and 5 (index 1 to 4) like in uploads.py
                        if len(sheet_names) >= 5:
                            selected_sheets = {name: sheets[name] for name in sheet_names[1:5]}
                        else:
                            selected_sheets = sheets

                        # Prepare raw_data in the format expected by custom workflow
                        raw_data = {
                            "sheets": selected_sheets
                        }

                        logger.info(f"✅ Excel data loaded successfully. Total sheets: {len(selected_sheets)}")
             
                except Exception as file_load_error:
                    logger.error(f"❌ Failed to load file {file_obj.file_path}")
                    log_exception(logger, "File loading error", file_load_error)
                    raise HTTPException(status_code=400, detail=f"Failed to load file: {str(file_load_error)}")
                
                result_storage[task_id]["progress"] = 25
                
                # Run custom workflow analysis
                logger.info(f"🤖 Starting custom workflow analysis...")
                analysis_start_time = time.time()

                try:
                    # Initialize custom workflow pipeline
                    pipeline = DashboardPipeline()
                    
                    # Run the analysis
                    dashboard_state = await pipeline.run_analysis(raw_data)
                    
                    # Get formatted results
                    dashboard_results = pipeline.get_results_summary(dashboard_state)
                    
                    analysis_result = {
                        "success": True,
                        "analysis_id": analysis_id,
                        "dashboard_results": dashboard_results,
                        "analysis_duration": time.time() - analysis_start_time,
                    }

                    analysis_duration = time.time() - analysis_start_time
                    logger.info(f"✅ Custom workflow completed in {analysis_duration:.2f} seconds")

                except Exception as workflow_error:
                    logger.error("❌ Custom workflow execution failed")
                    log_exception(logger, "Custom workflow error", workflow_error)
                    raise HTTPException(status_code=500, detail=f"Custom workflow failed: {str(workflow_error)}")
                
                processing_time = time.time() - start_time
                logger.info(f"⏱️ Total analysis completed in {processing_time:.2f} seconds")
                
                result_storage[task_id]["progress"] = 75
                
                # Save to database
                try:
                    logger.info("💾 Saving custom workflow analysis result to database...")
                    db_result = await DataAnalysisService.save_analysis_result(
                        db, user_id, file_obj.id,
                        analysis_result,
                        analysis_id
                    )
                    logger.info(f"✅ Analysis saved with ID: {db_result.analysis_id}")
                    
                    result_storage[task_id] = {
                        "status": "completed",
                        "progress": 100,
                        "result": analysis_result,
                        "analysis_id": db_result.analysis_id,
                        "database_id": db_result.id,
                        "task_id": task_id,
                        "success": True,
                        "dashboard_results": dashboard_results
                    }
                    
                    total_duration = time.time() - start_time
                    log_function_exit(logger, "run_background_analysis", 
                                    result=f"success=True, analysis_id={db_result.analysis_id}", 
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
                        "success": True,
                        "dashboard_results": dashboard_results
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


