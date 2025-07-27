import os
import uuid
import pandas as pd
from pathlib import Path
from typing import List, Optional
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
    """Convert numpy types and pandas timestamps to JSON serializable Python types"""
    import pandas as pd
    
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    elif isinstance(obj, pd.Series):
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
    """Upload and process a data file with list of DataFrames - NO CONCATENATION"""
    
    # For now, use a default user_id = 1
    default_user_id = 1
    
    # Validate file type
    if not file.filename.lower().endswith(tuple(settings.ALLOWED_EXTENSIONS)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Supported: {settings.ALLOWED_EXTENSIONS}"
        )
    
    # Validate file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
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
        
        # Process file and extract metadata with ALL SHEETS processing
        dfs_list = []  # List of DataFrames to return
        sheets_metadata = []  # Metadata for each DataFrame
        total_sheets = 1
        columns = []
        shape = (0, 0)
        data_types = {}
        summary = {}
        sheets = None  # Initialize sheets variable for both CSV and Excel
        
        try:
            # Enhanced Excel processing with skiprows=4
            if file_extension in ['.xlsx', '.xls']:
                logger.info(f"Processing Excel file with skiprows=4: {file.filename}")
                
                # Read all sheets with skiprows=4
                sheets = pd.read_excel(file_path, sheet_name=None, skiprows=4)
                
                if not sheets:
                    raise ValueError("No readable sheets found in Excel file")
                
                # Process each sheet individually - MINIMAL PREPROCESSING ONLY
                sheets_info = {}
                all_columns = set()
                total_rows = 0
                
                for sheet_name, sheet_df in sheets.items():
                    try:
                        logger.info(f"Processing sheet '{sheet_name}': {sheet_df.shape}")
                        
                        # MINIMAL preprocessing - only remove completely empty rows/columns
                        original_shape = sheet_df.shape
                        sheet_df = sheet_df.dropna(how='all').dropna(axis=1, how='all')
                        logger.info(f"Sheet '{sheet_name}' after minimal cleanup: {sheet_df.shape} (was {original_shape})")
                        
                        if not sheet_df.empty:
                            # Add to DataFrames list - NO CONCATENATION
                            dfs_list.append(sheet_df)
                            all_columns.update(sheet_df.columns.tolist())
                            total_rows += len(sheet_df)
                            
                            # Create metadata for this DataFrame with JSON serialization
                            df_metadata = {
                                "sheet_name": sheet_name,
                                "sheet_index": len(dfs_list) - 1,
                                "shape": sheet_df.shape,
                                "columns": sheet_df.columns.tolist(),
                                "preview_data": convert_numpy_types(sheet_df.head(5).to_dict('records')) if len(sheet_df) > 0 else [],
                                "data_types": {str(col): str(dtype) for col, dtype in sheet_df.dtypes.items()},
                                "memory_usage": int(sheet_df.memory_usage(deep=True).sum()),
                                "null_counts": convert_numpy_types(sheet_df.isnull().sum().to_dict()),
                                "numeric_columns": sheet_df.select_dtypes(include=['number']).columns.tolist(),
                                "categorical_columns": sheet_df.select_dtypes(include=['object']).columns.tolist(),
                                "file_source": file.filename,
                                "processing_method": "skiprows_4_minimal_cleanup"
                            }
                            
                            sheets_metadata.append(df_metadata)
                            
                            # Store sheet info for backward compatibility
                            sheets_info[sheet_name] = {
                                "shape": sheet_df.shape,
                                "columns": sheet_df.columns.tolist(),
                                "preview_data": convert_numpy_types(sheet_df.head(5).to_dict('records')) if len(sheet_df) > 0 else [],
                                "data_types": {str(col): str(dtype) for col, dtype in sheet_df.dtypes.items()},
                                "memory_usage": int(sheet_df.memory_usage(deep=True).sum()),
                                "null_counts": convert_numpy_types(sheet_df.isnull().sum().to_dict())
                            }
                            
                            logger.info(f"Sheet '{sheet_name}' processed successfully: {sheet_df.shape}")
                        else:
                            logger.warning(f"Sheet '{sheet_name}' is empty after minimal cleanup")
                            
                    except Exception as sheet_error:
                        logger.warning(f"Could not process sheet '{sheet_name}': {sheet_error}")
                        continue
                
                if not dfs_list:
                    raise ValueError("No valid data found in any sheet after processing")
                
                # NO CONCATENATION - Use the largest DataFrame for backward compatibility metadata only
                largest_df = max(dfs_list, key=len)
                shape = largest_df.shape
                columns = largest_df.columns.tolist()
                total_sheets = len(sheets)
                
                logger.info(f"Processed {len(dfs_list)} DataFrames, largest has shape: {shape}")
                
            else:
                # CSV processing - create single DataFrame in list
                logger.info(f"Processing CSV file: {file.filename}")
                df = pd.read_csv(file_path)
                
                # MINIMAL preprocessing - only remove completely empty rows/columns
                original_shape = df.shape
                df = df.dropna(how='all').dropna(axis=1, how='all')
                logger.info(f"CSV after minimal cleanup: {df.shape} (was {original_shape})")
                
                # Add single DataFrame to list
                dfs_list = [df]
                
                # Create metadata for single CSV DataFrame
                csv_metadata = {
                    "sheet_name": "main",
                    "sheet_index": 0,
                    "shape": df.shape,
                    "columns": df.columns.tolist(),
                    "preview_data": convert_numpy_types(df.head(5).to_dict('records')) if len(df) > 0 else [],
                    "data_types": {str(col): str(dtype) for col, dtype in df.dtypes.items()},
                    "memory_usage": int(df.memory_usage(deep=True).sum()),
                    "null_counts": convert_numpy_types(df.isnull().sum().to_dict()),
                    "numeric_columns": df.select_dtypes(include=['number']).columns.tolist(),
                    "categorical_columns": df.select_dtypes(include=['object']).columns.tolist(),
                    "file_source": file.filename,
                    "processing_method": "minimal_cleanup_csv"
                }
                
                sheets_metadata = [csv_metadata]
                
                shape = df.shape
                columns = df.columns.tolist()
                total_sheets = 1
                sheets_info = None
                # For CSV, create a simple dict for sheets variable
                sheets = {"main": df}  # This ensures sheets is defined for CSV files
                
                logger.info(f"CSV file processed: {shape}")
            
            logger.info(f"Extracted metadata - Total DataFrames: {len(dfs_list)}, Reference Shape: {shape}, Columns: {len(columns)}")
            
            # Generate enhanced summary with DataFrame list information - NO CONCATENATION
            summary = {
                "rows": int(shape[0]),  # Reference shape from largest/main DataFrame
                "columns": int(shape[1]),
                "total_sheets": total_sheets,
                "total_dataframes": len(dfs_list),
                "dataframes_metadata": sheets_metadata,
                "sheets_processed": len(sheets_info) if sheets_info else 1,
                "sheets_info": sheets_info,
                "combined_columns": list(all_columns) if file_extension in ['.xlsx', '.xls'] else columns,
                "file_type": file_extension,
                "processing_mode": "separate_dataframes_no_concat",
                "preprocessing_note": "Only empty rows/columns removed, no other modifications"
            }
            
            # Add memory usage if single DataFrame
            if len(dfs_list) == 1:
                summary.update({
                    "memory_usage": int(dfs_list[0].memory_usage(deep=True).sum()),
                    "null_counts": convert_numpy_types(dfs_list[0].isnull().sum().to_dict()),
                    "numeric_columns": dfs_list[0].select_dtypes(include=['number']).columns.tolist(),
                    "categorical_columns": dfs_list[0].select_dtypes(include=['object']).columns.tolist(),
                })
            
            logger.info(f"Generated enhanced summary with {len(dfs_list)} separate DataFrames")
            
        except Exception as e:
            logger.error(f"Failed to process file {file.filename}: {e}")
            # Clean up file
            os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to process file: {str(e)}"
            )
        
        # Save to database with serializable data
        def make_serializable(obj):
            """Recursively convert DataFrames and other non-serializable objects"""
            if isinstance(obj, pd.DataFrame):
                # Convert DataFrame to a limited dict representation
                return {
                    "shape": obj.shape,
                    "columns": obj.columns.tolist(),
                    "preview_data": convert_numpy_types(obj.head(3).to_dict('records')) if len(obj) > 0 else [],
                    "data_types": {str(col): str(dtype) for col, dtype in obj.dtypes.items()},
                    "note": "DataFrame reference - actual data stored separately"
                }
            elif isinstance(obj, dict):
                return {k: make_serializable(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [make_serializable(v) for v in obj]
            elif isinstance(obj, tuple):
                return tuple(make_serializable(v) for v in obj)
            else:
                return convert_numpy_types(obj)

        # Clean the summary to remove DataFrame objects - FIXED RECURSION
        try:
            logger.info("Starting summary serialization...")
            serializable_summary = make_serializable(summary)
            logger.info("Summary serialization completed")
        except Exception as serialization_error:
            logger.error(f"Serialization failed: {serialization_error}", exc_info=True)
            # Fallback to basic summary without complex nested objects
            serializable_summary = {
                "rows": int(shape[0]),
                "columns": int(shape[1]),
                "total_sheets": total_sheets,
                "total_dataframes": len(dfs_list),
                "file_type": file_extension,
                "processing_mode": "separate_dataframes_no_concat",
                "preprocessing_note": "Only empty rows/columns removed, no other modifications",
                "serialization_note": "Complex objects removed due to serialization error"
            }
        
        # Ensure sheets list is serializable - FIXED to handle None case
        serializable_sheets = list(sheets.keys()) if (sheets is not None and isinstance(sheets, dict)) else []

        # Create database record with comprehensive logging
        try:
            logger.info("Creating UploadedFile database record...")
            db_file = UploadedFile(
                file_id=file_id,
                original_filename=file.filename,
                file_path=str(file_path),
                file_type=file_extension,
                file_size=file_size,
                sheets=serializable_sheets,
                total_sheets=total_sheets,
                columns=columns,
                shape=convert_numpy_types(shape),
                data_types=convert_numpy_types(data_types),
                summary=serializable_summary,
                user_id=default_user_id
            )
            
            logger.info("Adding to database session...")
            db.add(db_file)
            
            logger.info("Committing to database...")
            await db.commit()
            
            logger.info("Refreshing database object...")
            await db.refresh(db_file)
            
            logger.info(f"File uploaded successfully: {file.filename} (ID: {file_id})")
            
        except Exception as db_error:
            logger.error(f"Database operation failed: {db_error}", exc_info=True)
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(db_error)}"
            )
        
        # Enhanced response with DataFrames list - SAFE SERIALIZATION
        try:
            logger.info("Creating response summary...")
            response_summary = {
                "rows": int(shape[0]),
                "columns": int(shape[1]),
                "total_sheets": total_sheets,
                "total_dataframes": len(dfs_list),
                "dataframes_count": len(dfs_list),
                "file_type": file_extension,
                "processing_mode": "separate_dataframes_no_concat",
                "preprocessing_note": "Only empty rows/columns removed, no other modifications"
            }
            
            # Add safe metadata about DataFrames without the actual DataFrames
            response_summary["dataframes_info"] = [
                {
                    "sheet_name": meta["sheet_name"],
                    "shape": meta["shape"],
                    "columns_count": len(meta["columns"]),
                    "processing_method": meta["processing_method"]
                }
                for meta in sheets_metadata
            ]
            
            # Add the actual DataFrames list as JSON-safe data (not DataFrames themselves)
            logger.info("Converting DataFrames to JSON-safe format...")
            response_summary["dataframes_list"] = []
            for i, df in enumerate(dfs_list):
                try:
                    df_dict = convert_numpy_types(df.head(10).to_dict('records'))  # Limit to 10 rows
                    response_summary["dataframes_list"].append(df_dict)
                except Exception as df_error:
                    logger.warning(f"Failed to convert DataFrame {i} to dict: {df_error}")
                    response_summary["dataframes_list"].append([])  # Empty list as fallback
            
            # Add detailed sheets info to response for frontend preview
            if sheets_info:
                response_summary["sheets_info"] = sheets_info
            elif file_extension not in ['.xlsx', '.xls']:
                # For CSV files, create preview info
                response_summary["sheets_info"] = {
                    "main": {
                        "shape": shape,
                        "columns": columns,
                        "preview_data": convert_numpy_types(dfs_list[0].head(5).to_dict('records')) if len(dfs_list) > 0 else [],
                        "data_types": {str(col): str(dtype) for col, dtype in dfs_list[0].dtypes.items()} if len(dfs_list) > 0 else {}
                    }
                }
            
            logger.info("Response preparation completed")
            
        except Exception as response_error:
            logger.error(f"Response preparation failed: {response_error}", exc_info=True)
            # Minimal fallback response
            response_summary = {
                "rows": int(shape[0]),
                "columns": int(shape[1]),
                "total_sheets": total_sheets,
                "total_dataframes": len(dfs_list),
                "file_type": file_extension,
                "error_note": "Response data limited due to serialization issues"
            }

        return FileUploadResponse(
            success=True,
            filename=file.filename,
            file_id=file_id,
            file_type=file_extension,
            message=f"File uploaded and processed successfully. Generated {len(dfs_list)} separate DataFrames (no concatenation). Minimal preprocessing: only empty rows/columns removed.",
            sheets=serializable_sheets,
            total_sheets=total_sheets,
            summary=response_summary
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed for {file.filename}: {str(e)}", exc_info=True)
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error details: {repr(e)}")
        
        # Clean up file on error
        try:
            if 'file_path' in locals() and os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Cleaned up file: {file_path}")
        except Exception as cleanup_error:
            logger.error(f"Failed to cleanup file: {cleanup_error}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {str(e)}"
        )

# Add new endpoint for sheet-specific preview
@router.get("/{file_id}/sheet/{sheet_name}/preview")
async def get_sheet_preview(
    file_id: str,
    sheet_name: str,
    rows: int = 10,
    db: AsyncSession = Depends(get_async_db_dependency)
):
    """Get preview of specific Excel sheet"""
    
    result = await db.execute(
        select(UploadedFile).where(UploadedFile.file_id == file_id)
    )
    file_obj = result.scalar_one_or_none()
    
    if not file_obj:
        raise HTTPException(status_code=404, detail="File not found")
    
    if file_obj.file_type.lower() not in ['.xlsx', '.xls']:
        raise HTTPException(status_code=400, detail="File is not an Excel file")
    
    try:
        # Load specific sheet
        df = pd.read_excel(file_obj.file_path, sheet_name=sheet_name, nrows=rows)
        
        # Convert to dict for JSON response
        preview_data = {
            "data": df.to_dict(orient="records"),
            "columns": df.columns.tolist(),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "sheet_name": sheet_name
        }
        
        return DataPreviewResponse(
            success=True,
            data_preview=preview_data,
            columns=df.columns.tolist(),
            shape=df.shape,
            data_types={col: str(dtype) for col, dtype in df.dtypes.items()}
        )
        
    except Exception as e:
        logger.error(f"Failed to preview sheet {sheet_name} in file {file_id}: {e}")
        return DataPreviewResponse(
            success=False,
            error_message=f"Failed to preview sheet: {str(e)}"
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
