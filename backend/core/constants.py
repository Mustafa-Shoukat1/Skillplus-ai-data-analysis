"""
Constants used throughout the application
"""

# File upload constants
MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
ALLOWED_FILE_EXTENSIONS = ['.csv', '.xlsx', '.xls']
ALLOWED_MIME_TYPES = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

# Analysis constants
MAX_ANALYSIS_RETRIES = 3
ANALYSIS_TIMEOUT_SECONDS = 300
DEFAULT_PREVIEW_ROWS = 10
MAX_PREVIEW_ROWS = 100

# AI Model constants
DEFAULT_MODEL = 'claude-3-opus-20240229'
SUPPORTED_MODELS = [
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'gpt-4',
    'gpt-4-turbo'
]
DEFAULT_TEMPERATURE = 0.1
DEFAULT_MAX_TOKENS = 4000

# Authentication constants
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128

# Rate limiting
RATE_LIMIT_REQUESTS = 100
RATE_LIMIT_WINDOW_SECONDS = 60

# Chart types supported
CHART_TYPES = [
    'bar',
    'line',
    'pie',
    'scatter',
    'area',
    'heatmap',
    'radar',
    'funnel',
    'gauge'
]

# Query types
QUERY_TYPES = [
    'visualization',
    'analysis',
    'summary',
    'comparison',
    'trend',
    'correlation'
]

# Status codes
STATUS_PENDING = 'pending'
STATUS_PROCESSING = 'processing'
STATUS_COMPLETED = 'completed'
STATUS_FAILED = 'failed'
STATUS_CANCELLED = 'cancelled'

# User roles
ROLE_ADMIN = 'admin'
ROLE_VIEWER = 'viewer'
USER_ROLES = [ROLE_ADMIN, ROLE_VIEWER]
