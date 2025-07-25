import logging
import sys
from pathlib import Path
from typing import Optional
import traceback
import inspect
from core.config import settings

class AdvancedFormatter(logging.Formatter):
    """Custom formatter that includes file, line, and function information"""
    
    def format(self, record):
        # Get the calling frame info
        frame = inspect.currentframe()
        try:
            # Go up the stack to find the actual calling location
            caller_frame = frame.f_back.f_back.f_back
            if caller_frame:
                filename = caller_frame.f_code.co_filename
                line_number = caller_frame.f_lineno
                function_name = caller_frame.f_code.co_name
                
                # Extract just the filename without full path
                short_filename = Path(filename).name
                
                # Add location info to the record
                record.location = f"{short_filename}:{line_number}:{function_name}()"
            else:
                record.location = "unknown"
        except:
            record.location = "unknown"
        finally:
            del frame
        
        # Format the message with location info
        original_format = self._style._fmt
        self._style._fmt = "%(asctime)s - %(name)s - %(levelname)s - [%(location)s] - %(message)s"
        
        formatted = super().format(record)
        
        # Restore original format
        self._style._fmt = original_format
        
        return formatted

def setup_logger(
    name: str = "skillspulse",
    level: str = "INFO",
    log_file: Optional[str] = None
) -> logging.Logger:
    """Setup centralized logger with console and file handlers"""
    
    logger = logging.getLogger(name)
    
    # Clear existing handlers to avoid duplication
    logger.handlers.clear()
    
    # Set log level
    log_level = getattr(logging, level.upper(), logging.INFO)
    logger.setLevel(log_level)
    
    # Create advanced formatter
    formatter = AdvancedFormatter(
        fmt="%(asctime)s - %(name)s - %(levelname)s - [%(location)s] - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler (optional)
    if log_file:
        log_path = Path("logs")
        log_path.mkdir(exist_ok=True)
        
        file_handler = logging.FileHandler(log_path / log_file)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger

def log_exception(logger: logging.Logger, message: str = "Exception occurred"):
    """Log detailed exception information with traceback"""
    exc_type, exc_value, exc_traceback = sys.exc_info()
    if exc_traceback:
        # Get the full traceback
        tb_lines = traceback.format_exception(exc_type, exc_value, exc_traceback)
        full_traceback = ''.join(tb_lines)
        
        # Get the specific error location
        tb = exc_traceback
        while tb.tb_next:
            tb = tb.tb_next
        
        error_file = Path(tb.tb_frame.f_code.co_filename).name
        error_line = tb.tb_lineno
        error_function = tb.tb_frame.f_code.co_name
        
        logger.error(f"{message} - Error in {error_file}:{error_line}:{error_function}()")
        logger.error(f"Exception details: {exc_type.__name__}: {exc_value}")
        logger.error(f"Full traceback:\n{full_traceback}")
    else:
        logger.error(f"{message} - No traceback available")

# Global logger instance
logger = setup_logger("skillspulse", "DEBUG" if settings.DEBUG else "INFO", "app.log")
