"""
Security middleware and utilities for SkillsPulse Backend.
"""
import re
import time
import hashlib
import secrets
from collections import defaultdict
from typing import Optional, Callable
from functools import wraps

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse


class RateLimiter:
    """
    Simple in-memory rate limiter.
    For production, use Redis-based rate limiting.
    """
    
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests: dict[str, list[float]] = defaultdict(list)
    
    def is_allowed(self, client_id: str) -> bool:
        """Check if request is allowed based on rate limit."""
        now = time.time()
        minute_ago = now - 60
        
        # Clean old requests
        self.requests[client_id] = [
            req_time for req_time in self.requests[client_id]
            if req_time > minute_ago
        ]
        
        # Check limit
        if len(self.requests[client_id]) >= self.requests_per_minute:
            return False
        
        # Record request
        self.requests[client_id].append(now)
        return True
    
    def get_remaining(self, client_id: str) -> int:
        """Get remaining requests for client."""
        now = time.time()
        minute_ago = now - 60
        
        current_requests = len([
            req_time for req_time in self.requests[client_id]
            if req_time > minute_ago
        ])
        
        return max(0, self.requests_per_minute - current_requests)


class SecurityHeaders:
    """Security headers middleware configuration."""
    
    HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Security-Policy": "default-src 'self'",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
    }
    
    @classmethod
    async def middleware(cls, request: Request, call_next: Callable):
        """Add security headers to response."""
        response = await call_next(request)
        
        for header, value in cls.HEADERS.items():
            response.headers[header] = value
        
        return response


class InputSanitizer:
    """Input sanitization utilities."""
    
    # Patterns that might indicate injection attempts
    SQL_PATTERNS = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)",
        r"(--)|(;)|(\*)",
        r"('|\"|`)",
    ]
    
    XSS_PATTERNS = [
        r"<script[^>]*>",
        r"javascript:",
        r"on\w+\s*=",
        r"<iframe",
        r"<object",
    ]
    
    @classmethod
    def sanitize_string(cls, value: str) -> str:
        """Sanitize string input."""
        if not isinstance(value, str):
            return value
        
        # HTML encode special characters
        sanitized = (
            value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&#x27;")
        )
        
        return sanitized
    
    @classmethod
    def check_sql_injection(cls, value: str) -> bool:
        """Check for potential SQL injection patterns."""
        if not isinstance(value, str):
            return False
        
        combined_pattern = "|".join(cls.SQL_PATTERNS)
        return bool(re.search(combined_pattern, value, re.IGNORECASE))
    
    @classmethod
    def check_xss(cls, value: str) -> bool:
        """Check for potential XSS patterns."""
        if not isinstance(value, str):
            return False
        
        combined_pattern = "|".join(cls.XSS_PATTERNS)
        return bool(re.search(combined_pattern, value, re.IGNORECASE))
    
    @classmethod
    def validate_filename(cls, filename: str) -> bool:
        """Validate filename for path traversal attacks."""
        if not filename:
            return False
        
        # Check for path traversal patterns
        dangerous_patterns = ["..", "/", "\\", "\x00"]
        
        for pattern in dangerous_patterns:
            if pattern in filename:
                return False
        
        # Only allow safe characters
        safe_pattern = r"^[\w\-. ]+$"
        return bool(re.match(safe_pattern, filename))


class TokenGenerator:
    """Secure token generation utilities."""
    
    @staticmethod
    def generate_token(length: int = 32) -> str:
        """Generate a cryptographically secure random token."""
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def generate_api_key() -> str:
        """Generate an API key."""
        prefix = "sk_"
        token = secrets.token_hex(24)
        return f"{prefix}{token}"
    
    @staticmethod
    def hash_token(token: str) -> str:
        """Hash a token for storage."""
        return hashlib.sha256(token.encode()).hexdigest()
    
    @staticmethod
    def verify_token(token: str, hashed: str) -> bool:
        """Verify a token against its hash."""
        return secrets.compare_digest(
            hashlib.sha256(token.encode()).hexdigest(),
            hashed
        )


def require_https(func: Callable) -> Callable:
    """Decorator to require HTTPS in production."""
    @wraps(func)
    async def wrapper(request: Request, *args, **kwargs):
        # Skip check in development
        if request.base_url.scheme == "http" and "localhost" not in str(request.base_url):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HTTPS required"
            )
        return await func(request, *args, **kwargs)
    
    return wrapper


class IPBlocklist:
    """IP address blocklist management."""
    
    def __init__(self):
        self.blocked_ips: set[str] = set()
        self.suspicious_activity: dict[str, int] = defaultdict(int)
        self.threshold = 10  # Block after 10 suspicious activities
    
    def is_blocked(self, ip: str) -> bool:
        """Check if IP is blocked."""
        return ip in self.blocked_ips
    
    def record_suspicious_activity(self, ip: str) -> None:
        """Record suspicious activity from IP."""
        self.suspicious_activity[ip] += 1
        
        if self.suspicious_activity[ip] >= self.threshold:
            self.blocked_ips.add(ip)
    
    def unblock(self, ip: str) -> None:
        """Remove IP from blocklist."""
        self.blocked_ips.discard(ip)
        self.suspicious_activity.pop(ip, None)


# Global instances
rate_limiter = RateLimiter()
ip_blocklist = IPBlocklist()
