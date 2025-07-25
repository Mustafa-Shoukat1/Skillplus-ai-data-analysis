import asyncio
import os
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
from agents.graphs.graph import run_analysis
from core.database import get_async_db
from core.logger import logger, log_exception

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
        model_used: str
    ) -> AnalysisResult:
        """Save analysis result to database with improved data extraction"""
        
        logger.info(f"Saving analysis result to database...")
        logger.debug(f"Analysis data structure: {list(analysis_data.keys()) if isinstance(analysis_data, dict) else type(analysis_data)}")
        
        # Helper function to safely extract data from Pydantic objects or dicts
        def safe_extract_dict(obj, default=None):
            if obj is None:
                return default or {}
            if hasattr(obj, 'model_dump'):
                return obj.model_dump()
            elif isinstance(obj, dict):
                return obj
            else:
                logger.warning(f"Unexpected object type for extraction: {type(obj)}")
                return default or {}
        
        # Extract data with improved error handling
        classification_data = safe_extract_dict(analysis_data.get("classification"), {})
        analysis_code_data = safe_extract_dict(analysis_data.get("analysis"), {})
        execution_data = safe_extract_dict(analysis_data.get("execution"), {})
        final_results_data = safe_extract_dict(analysis_data.get("final_results"), {})
        
        # Log what we extracted
        logger.debug(f"Extracted classification: {bool(classification_data)}")
        logger.debug(f"Extracted analysis: {bool(analysis_code_data)}")
        logger.debug(f"Extracted execution: {bool(execution_data)}")
        logger.debug(f"Extracted final_results: {bool(final_results_data)}")
        
        # Handle visualization HTML content - ENHANCED
        visualization_html = None
        
        # Method 1: Check execution results for file paths
        if execution_data.get("visualization_created") and execution_data.get("file_paths"):
            for file_path in execution_data.get("file_paths", []):
                if file_path.endswith('.html'):
                    try:
                        logger.info(f"Attempting to read visualization file: {file_path}")
                        with open(file_path, 'r', encoding='utf-8') as f:
                            visualization_html = f.read()
                        logger.info(f"Successfully read {len(visualization_html)} characters from {file_path}")
                        break
                    except Exception as e:
                        logger.warning(f"Could not read visualization file {file_path}: {e}")
        
        # Method 2: Check standard plots directory
        if not visualization_html:
            plots_dir = os.path.abspath('plots')
            html_file = os.path.join(plots_dir, 'visualization.html')
            if os.path.exists(html_file):
                try:
                    with open(html_file, 'r', encoding='utf-8') as f:
                        visualization_html = f.read()
                    logger.info(f"Read visualization HTML from standard location: {len(visualization_html)} characters")
                except Exception as e:
                    logger.warning(f"Could not read from standard location {html_file}: {e}")
        
        # Create database record with comprehensive data extraction
        db_result = AnalysisResult(
            user_query=user_query,
            success=analysis_data.get("success", False),
            
            # Classification data - with detailed extraction
            query_type=classification_data.get("query_type"),
            classification_reasoning=classification_data.get("reasoning"),
            user_intent=classification_data.get("user_intent"),
            requires_data_filtering=classification_data.get("requires_data_filtering"),
            classification_confidence=classification_data.get("confidence"),
            
            # Code analysis data - with detailed extraction
            query_understanding=analysis_code_data.get("query_understanding"),
            approach=analysis_code_data.get("approach"),
            required_columns=analysis_code_data.get("required_columns", []),
            generated_code=analysis_data.get("generated_code") or analysis_code_data.get("generated_code"),
            expected_output=analysis_code_data.get("expected_output"),
            
            # Execution data - with detailed extraction
            execution_success=execution_data.get("success"),
            execution_output=execution_data.get("output"),
            visualization_created=execution_data.get("visualization_created", False),
            file_paths=execution_data.get("file_paths", []),
            
            # Final results data - with detailed extraction
            final_answer=final_results_data.get("answer"),
            summary=final_results_data.get("summary"),
            visualization_info=final_results_data.get("visualization_info"),
            
            # Visualization HTML content
            visualization_html=visualization_html,
            
            # Metadata
            retry_count=analysis_data.get("retry_count", 0),
            processing_time=processing_time,
            model_used=model_used,
            
            # Foreign keys
            user_id=user_id,
            file_id=file_id,
            completed_at=datetime.now()
        )
        
        # Log what we're saving
        logger.info(f"Saving to DB - Classification: {bool(classification_data)}, Analysis: {bool(analysis_code_data)}, Execution: {bool(execution_data)}")
        logger.info(f"Generated code length: {len(db_result.generated_code) if db_result.generated_code else 0}")
        logger.info(f"Visualization HTML length: {len(visualization_html) if visualization_html else 0}")
        
        try:
            db.add(db_result)
            await db.commit()
            await db.refresh(db_result)
            
            logger.info(f"✅ Analysis result saved to database with ID: {db_result.id}")
            
            # Verify what was saved
            logger.debug(f"Saved classification_reasoning: {bool(db_result.classification_reasoning)}")
            logger.debug(f"Saved query_understanding: {bool(db_result.query_understanding)}")
            logger.debug(f"Saved execution_output: {bool(db_result.execution_output)}")
            logger.debug(f"Saved final_answer: {bool(db_result.final_answer)}")
            
        except Exception as e:
            logger.error(f"❌ Failed to save analysis result: {e}")
            await db.rollback()
            raise
        
        return db_result
    
    @staticmethod
    async def run_background_analysis(
        file_id: str,
        user_id: int,
        request: DataAnalysisRequest,
        result_storage: Dict[str, Any],
        task_id: str  # Make task_id required, not optional
    ) -> str:
        """Run analysis in background task"""
        
        logger.info(f"Starting background analysis for file_id: {file_id}, user_id: {user_id}, task_id: {task_id}")
        
        # Ensure the task_id exists in storage
        if task_id not in result_storage:
            result_storage[task_id] = {"status": "processing", "progress": 0}
        
        try:
            logger.debug(f"Request details - prompt: {request.prompt[:100]}...")
            
            async with get_async_db() as db:
                # Get file (removed user restriction in the service call)
                logger.debug(f"Fetching file with ID: {file_id}")
                file_obj = await DataAnalysisService.get_file_by_id(db, file_id)
                if not file_obj:
                    logger.error(f"File not found: {file_id}")
                    raise HTTPException(status_code=404, detail="File not found")
                
                logger.info(f"File found: {file_obj.original_filename}, path: {file_obj.file_path}")
                
                # Load data
                logger.debug(f"Loading data from: {file_obj.file_path}")
                
                # Handle different file types
                if file_obj.file_type.lower() in ['.xlsx', '.xls']:
                    df = pd.read_excel(file_obj.file_path)
                else:
                    df = pd.read_csv(file_obj.file_path)
                
                logger.info(f"Data loaded successfully. Shape: {df.shape}")
                result_storage[task_id]["progress"] = 25
                
                # Run analysis
                logger.info(f"Starting analysis with prompt: {request.prompt}")
                start_time = time.time()
                
                analysis_result = await asyncio.get_event_loop().run_in_executor(
                    None, run_analysis, df, request.prompt
                )
                
                processing_time = time.time() - start_time
                logger.info(f"Analysis completed in {processing_time:.2f} seconds")
                
                # Debug: Log the analysis result structure
                logger.info(f"Analysis completed successfully")
                logger.debug(f"Analysis result type: {type(analysis_result)}")
                
                result_storage[task_id]["progress"] = 75
                
                # Save to database
                logger.debug("Saving analysis result to database")
                try:
                    db_result = await DataAnalysisService.save_analysis_result(
                        db, user_id, file_obj.id, request.prompt, 
                        analysis_result, processing_time, request.model
                    )
                    logger.info(f"Analysis result saved to database with ID: {db_result.id}")
                except Exception as save_error:
                    logger.error(f"Failed to save to database: {save_error}")
                    # Continue anyway - don't fail the whole analysis
                
                # Simple success determination
                overall_success = False
                if isinstance(analysis_result, dict):
                    # Helper function to safely extract from Pydantic objects or dicts
                    def safe_get(obj, key, default=None):
                        if hasattr(obj, 'model_dump'):
                            return obj.model_dump().get(key, default)
                        elif isinstance(obj, dict):
                            return obj.get(key, default)
                        else:
                            return default
                    
                    # Check various success indicators
                    main_success = analysis_result.get("success", False)
                    has_code = bool(analysis_result.get("generated_code"))
                    
                    # Check execution success
                    execution_success = False
                    if analysis_result.get("execution"):
                        execution_success = safe_get(analysis_result["execution"], "success", False)
                    
                    # Check final results success
                    final_success = False
                    if analysis_result.get("final_results"):
                        final_success = safe_get(analysis_result["final_results"], "success", False)
                    
                    overall_success = main_success or has_code or execution_success or final_success
                    
                    logger.debug(f"Success indicators: main={main_success}, has_code={has_code}, execution={execution_success}, final={final_success}")
                
                logger.info(f"Overall analysis success: {overall_success}")
                
                # Store complete result
                result_storage[task_id] = {
                    "status": "completed",
                    "progress": 100,
                    "result": analysis_result,
                    "analysis_id": db_result.id if 'db_result' in locals() else None,
                    "task_id": task_id,
                    "success": overall_success
                }
                
                logger.info(f"Analysis completed successfully for task_id: {task_id}")
                logger.debug(f"Final result storage keys for task {task_id}: {list(result_storage[task_id].keys())}")
                
        except Exception as e:
            log_exception(logger, f"Background analysis failed for file_id: {file_id}, task_id: {task_id}")
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
