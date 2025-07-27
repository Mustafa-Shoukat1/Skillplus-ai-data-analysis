import logging
import sys
import traceback
from pathlib import Path
from datetime import datetime
from typing import Optional
from core.config import settings

# Create logs directory
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

# Custom formatter with more details
class DetailedFormatter(logging.Formatter):
    def format(self, record):
        # Add extra context
        record.pathname_short = Path(record.pathname).name
        record.funcName_line = f"{record.funcName}:{record.lineno}"
        
        # Format timestamp
        record.timestamp = datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S')
        
        return super().format(record)

# Enhanced formatter for console output
CONSOLE_FORMAT = (
    "%(timestamp)s - %(name)s - %(levelname)s - "
    "[%(pathname_short)s:%(funcName_line)s] - %(message)s"
)

# Enhanced formatter for file output  
FILE_FORMAT = (
    "%(timestamp)s - %(name)s - %(levelname)s - "
    "[%(pathname)s:%(funcName)s:%(lineno)d] - %(message)s"
)

def setup_logger(name: str = "skillspulse") -> logging.Logger:
    """Setup comprehensive logging configuration"""
    
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)
    
    # Clear existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Console handler with enhanced formatting
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_formatter = DetailedFormatter(CONSOLE_FORMAT)
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # File handler for all logs
    file_handler = logging.FileHandler(
        log_dir / f"{name}.log", 
        mode='a', 
        encoding='utf-8'
    )
    file_handler.setLevel(logging.DEBUG)
    file_formatter = DetailedFormatter(FILE_FORMAT)
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)
    
    # Error file handler for errors only
    error_handler = logging.FileHandler(
        log_dir / f"{name}_errors.log", 
        mode='a', 
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_formatter = DetailedFormatter(FILE_FORMAT)
    error_handler.setFormatter(error_formatter)
    logger.addHandler(error_handler)
    
    return logger

def log_exception(logger: logging.Logger, message: str = "Exception occurred", exc_info: Optional[Exception] = None):
    """Enhanced exception logging with full traceback"""
    
    if exc_info is None:
        exc_info = sys.exc_info()[1]
    
    # Log the main error message
    logger.error(f"🚨 {message}")
    
    if exc_info:
        logger.error(f"Exception Type: {type(exc_info).__name__}")
        logger.error(f"Exception Message: {str(exc_info)}")
        logger.error(f"Exception Args: {repr(exc_info.args)}")
    
    # Log full traceback
    tb_lines = traceback.format_exc().split('\n')
    logger.error("Full Traceback:")
    for i, line in enumerate(tb_lines):
        if line.strip():
            logger.error(f"  {i:2d}: {line}")
    
    # Log stack trace from current frame
    logger.error("Current Stack:")
    for i, frame_info in enumerate(traceback.extract_stack()[:-1]):
        logger.error(f"  {i:2d}: {frame_info.filename}:{frame_info.lineno} in {frame_info.name}")
        if frame_info.line:
            logger.error(f"      {frame_info.line.strip()}")

def log_function_entry(logger: logging.Logger, func_name: str, **kwargs):
    """Log function entry with parameters"""
    args_str = ", ".join([f"{k}={repr(v)}" for k, v in kwargs.items()])
    logger.debug(f"🔵 ENTER {func_name}({args_str})")

def log_function_exit(logger: logging.Logger, func_name: str, result=None, duration: Optional[float] = None):
    """Log function exit with result and duration"""
    duration_str = f" ({duration:.3f}s)" if duration else ""
    result_str = f" -> {repr(result)}" if result is not None else ""
    logger.debug(f"🔴 EXIT  {func_name}{duration_str}{result_str}")

def log_data_info(logger: logging.Logger, data, name: str = "data"):
    """Log detailed information about data structures"""
    
    logger.info(f"📊 DATA INFO: {name}")
    logger.info(f"  Type: {type(data).__name__}")
    
    if hasattr(data, 'shape'):
        logger.info(f"  Shape: {data.shape}")
    elif hasattr(data, '__len__'):
        try:
            logger.info(f"  Length: {len(data)}")
        except:
            pass
    
    if hasattr(data, 'dtypes'):
        logger.info(f"  Data Types: {dict(data.dtypes)}")
    elif hasattr(data, 'columns'):
        logger.info(f"  Columns: {list(data.columns)}")
    
    if hasattr(data, 'memory_usage'):
        try:
            memory = data.memory_usage(deep=True).sum()
            logger.info(f"  Memory Usage: {memory:,} bytes ({memory/1024/1024:.2f} MB)")
        except:
            pass

# Create the main logger instance
logger = setup_logger()

# Export commonly used functions
__all__ = ['logger', 'log_exception', 'log_function_entry', 'log_function_exit', 'log_data_info', 'setup_logger']
