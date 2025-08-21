from typing import Dict,Any
import pandas as pd
import numpy as np
import json
import logging
# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
def load_comprehensive_data(file_path: str) -> Dict[str, Any]:
    try:
        all_sheets = pd.read_excel(file_path, sheet_name=None, skiprows=4)
        sheet_names = list(all_sheets.keys())

        if len(sheet_names) >= 5:
            selected_sheets = {
                sheet_names[1]: all_sheets[sheet_names[1]],
                sheet_names[2]: all_sheets[sheet_names[2]],
                sheet_names[3]: all_sheets[sheet_names[3]],
                sheet_names[4]: all_sheets[sheet_names[4]]
            }
        else:
            selected_sheets = all_sheets

        sheets_metadata = []
        for name, df in selected_sheets.items():
            # Clean column names
            df.columns = df.columns.astype(str).str.strip()

            # Convert data types to avoid JSON serialization issues
            clean_dtypes = {}
            clean_counts = {}

            for col in df.columns:
                clean_dtypes[col] = str(df[col].dtype)
                clean_counts[col] = int(df[col].count())

            metadata = {
                "sheet_name": name,
                "shape": df.shape,
                "columns": df.columns.tolist(),
                "data_types": clean_dtypes,
                "non_null_counts": clean_counts,
            }
            sheets_metadata.append(metadata)

        return {
            "sheets": selected_sheets,

        }
    except Exception as e:
        logger.error(f"Error loading data: {e}")
        return {"sheets": {}, "sheets_metadata": [], "total_sheets": 0, "total_records": 0, "all_columns": []}


result=load_comprehensive_data('backend/agents/Tanmeya Assessments Results Report by Function V06 (2).xlsx')
