"""
Custom exception classes for SkillsPulse
"""

from typing import Any, Dict, Optional


class SkillsPulseException(Exception):
    """Base exception for SkillsPulse application."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class FileUploadError(SkillsPulseException):
    """Exception raised for file upload errors."""
    pass


class FileProcessingError(SkillsPulseException):
    """Exception raised for file processing errors."""
    pass


class AnalysisError(SkillsPulseException):
    """Exception raised for analysis errors."""
    pass


class AIModelError(SkillsPulseException):
    """Exception raised for AI model errors."""
    pass


class AuthenticationError(SkillsPulseException):
    """Exception raised for authentication errors."""
    pass


class AuthorizationError(SkillsPulseException):
    """Exception raised for authorization errors."""
    pass


class DatabaseError(SkillsPulseException):
    """Exception raised for database errors."""
    pass


class ValidationError(SkillsPulseException):
    """Exception raised for validation errors."""
    pass


class RateLimitError(SkillsPulseException):
    """Exception raised when rate limit is exceeded."""
    pass


class ConfigurationError(SkillsPulseException):
    """Exception raised for configuration errors."""
    pass
