-- Migration script to update AnalysisResult table to minimal structure
-- WARNING: This will drop existing columns and data!

-- Step 1: Create a backup table (optional but recommended)
CREATE TABLE analysis_results_backup AS SELECT * FROM analysis_results;

-- Step 2: Drop all the unnecessary columns
ALTER TABLE analysis_results DROP COLUMN IF EXISTS success;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS query_type;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS classification_reasoning;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS user_intent;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS requires_data_filtering;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS classification_confidence;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS query_understanding;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS approach;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS required_columns;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS generated_code;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS expected_output;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS execution_success;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS execution_output;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS visualization_created;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS file_paths;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS final_answer;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS summary;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS visualization_info;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS visualization_html;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS retry_count;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS processing_time;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS model_used;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS created_at;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS completed_at;

-- Step 3: Rename user_query to query if it exists
ALTER TABLE analysis_results RENAME COLUMN user_query TO query;

-- Step 4: Add new columns if they don't exist
ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS echart_code TEXT;
ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS designed_echart_code TEXT;
ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS response_df JSON;
ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS execution_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 5: Update existing records to set execution_date if NULL
UPDATE analysis_results SET execution_date = NOW() WHERE execution_date IS NULL;

-- Step 6: Show the final structure
\d analysis_results;

-- To apply this migration:
-- 1. Connect to your PostgreSQL database
-- 2. Run: \i database_migration.sql
-- 
-- OR if using SQLite:
-- 1. Open sqlite3 with your database file
-- 2. Run: .read database_migration.sql
