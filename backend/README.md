# SkillsPulse Backend

This is the FastAPI backend for the SkillsPulse AI-Powered Data Analysis Platform.

## Quick Start

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Add your API keys to .env

# Run server
python main.py
```

## API Endpoints

- **Health Check**: `GET /health`
- **Authentication**: `/api/auth/*`
- **File Upload**: `/api/uploads/*`
- **Data Analysis**: `/api/analysis/*`
- **Templates**: `/api/templates/*`

## Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
