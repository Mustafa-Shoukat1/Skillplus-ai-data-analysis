import os
import uuid
import pandas as pd
from pathlib import Path
from typing import List
import json
import numpy as np
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.database import UploadedFile, User
from models.data_analysis import FileUploadResponse, DataPreviewResponse
from core.database import get_async_db_dependency
from core.config import settings
from core.logger import logger

router = APIRouter(prefix="/uploads", tags=["File Upload"])

def convert_numpy_types(obj):
    """Convert numpy types to JSON serializable Python types"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(convert_numpy_types(item) for item in obj)
    return obj

@router.post("/", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Upload and process a data file"""
    
    # For now, use a default user_id = 1 (you can change this logic later)
    default_user_id = 1
    
    # Validate file type
    if not file.filename.lower().endswith(tuple(settings.ALLOWED_EXTENSIONS)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Supported: {settings.ALLOWED_EXTENSIONS}"
        )
    
    # Validate file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE / (1024*1024):.1f}MB"
        )
    
    try:
        # Generate unique file ID and path
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix
        file_path = Path(settings.UPLOAD_DIR) / f"{file_id}{file_extension}"
        
        # Ensure upload directory exists
        file_path.parent.mkdir(exist_ok=True)
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Process file and extract metadata
        sheets = []
        total_sheets = 1
        columns = []
        shape = (0, 0)
        data_types = {}
        summary = {}
        
        try:
            if file_extension.lower() in ['.xlsx', '.xls']:
                # Handle Excel files
                excel_file = pd.ExcelFile(file_path)
                sheets = excel_file.sheet_names
                total_sheets = len(sheets)
                
                # Read first sheet for preview
                df = pd.read_excel(file_path, sheet_name=sheets[0])
            else:
                # Handle CSV files
                df = pd.read_csv(file_path)
            
            # Extract metadata
            columns = df.columns.tolist()
            shape = df.shape
            data_types = {col: str(dtype) for col, dtype in df.dtypes.items()}
            
            # Generate summary - convert numpy types to JSON serializable
            summary = {
                "rows": int(shape[0]),
                "columns": int(shape[1]),
                "memory_usage": int(df.memory_usage(deep=True).sum()),
                "null_counts": convert_numpy_types(df.isnull().sum().to_dict()),
                "numeric_columns": df.select_dtypes(include=['number']).columns.tolist(),
                "categorical_columns": df.select_dtypes(include=['object']).columns.tolist()
            }
            
        except Exception as e:
            logger.error(f"Failed to process file {file.filename}: {e}")
            # Clean up file
            os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to process file: {str(e)}"
            )
        
        # Save to database - ensure all data is JSON serializable
        db_file = UploadedFile(
            file_id=file_id,
            original_filename=file.filename,
            file_path=str(file_path),
            file_type=file_extension,
            file_size=file_size,
            sheets=sheets,
            total_sheets=total_sheets,
            columns=columns,
            shape=convert_numpy_types(shape),
            data_types=data_types,
            summary=summary,
            user_id=default_user_id
        )
        
        db.add(db_file)
        await db.commit()
        await db.refresh(db_file)
        
        logger.info(f"File uploaded successfully: {file.filename}")
        
        return FileUploadResponse(
            success=True,
            filename=file.filename,
            file_id=file_id,
            file_type=file_extension,
            message="File uploaded and processed successfully",
            sheets=sheets,
            total_sheets=total_sheets,
            summary=summary
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed for {file.filename}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="File upload failed"
        )

@router.get("/{file_id}/preview", response_model=DataPreviewResponse)
async def get_file_preview(
    file_id: str,
    rows: int = 10,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get preview of uploaded file"""
    
    # Get file from database (removed user restriction)
    result = await db.execute(
        select(UploadedFile).where(UploadedFile.file_id == file_id)
    )
    file_obj = result.scalar_one_or_none()
    
    if not file_obj:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        # Load and preview data
        if file_obj.file_type.lower() in ['.xlsx', '.xls']:
            df = pd.read_excel(file_obj.file_path, nrows=rows)
        else:
            df = pd.read_csv(file_obj.file_path, nrows=rows)
        
        # Convert to dict for JSON response
        preview_data = {
            "data": df.to_dict(orient="records"),
            "columns": df.columns.tolist(),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()}
        }
        
        return DataPreviewResponse(
            success=True,
            data_preview=preview_data,
            columns=file_obj.columns,
            shape=file_obj.shape,
            data_types=file_obj.data_types
        )
        
    except Exception as e:
        logger.error(f"Failed to preview file {file_id}: {e}")
        return DataPreviewResponse(
            success=False,
            error_message=f"Failed to preview file: {str(e)}"
        )

@router.get("/", response_model=List[FileUploadResponse])
async def list_user_files(
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """List all uploaded files"""
    
    result = await db.execute(
        select(UploadedFile).order_by(UploadedFile.created_at.desc())
    )
    files = result.scalars().all()
    
    return [
        FileUploadResponse(
            success=True,
            filename=file.original_filename,
            file_id=file.file_id,
            file_type=file.file_type,
            message="File available",
            sheets=file.sheets or [],
            total_sheets=file.total_sheets,
            summary=file.summary or {}
        )
        for file in files
    ]

@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Delete uploaded file"""
    
    result = await db.execute(
        select(UploadedFile).where(UploadedFile.file_id == file_id)
    )
    file_obj = result.scalar_one_or_none()
    
    if not file_obj:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        # Delete physical file
        if os.path.exists(file_obj.file_path):
            os.remove(file_obj.file_path)
        
        # Delete from database
        await db.delete(file_obj)
        await db.commit()
        
        logger.info(f"File {file_id} deleted")
        
        return {"message": "File deleted successfully"}
        
    except Exception as e:
        logger.error(f"Failed to delete file {file_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete file"
        )
