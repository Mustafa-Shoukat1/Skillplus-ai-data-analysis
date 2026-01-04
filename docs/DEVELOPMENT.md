# Development Guide

This guide covers the development workflow for SkillsPulse AI Data Analysis Platform.

## Prerequisites

- **Python** 3.12+
- **Node.js** 18+ (LTS recommended)
- **pnpm** 8+ (for frontend package management)
- **Docker** and Docker Compose (optional, for containerized development)
- **Git** for version control

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Mustafa-Shoukat1/Skillplus-ai-data-analysis.git
cd Skillplus-ai-data-analysis
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env  # or use your preferred editor
```

Required environment variables:
```env
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
SECRET_KEY=your_secret_key_for_jwt
DEBUG=true
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Edit environment
nano .env.local
```

Required environment variables:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Running the Application

### Development Mode

**Option 1: Run separately**

Terminal 1 (Backend):
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

Terminal 2 (Frontend):
```bash
cd frontend
pnpm dev
```

**Option 2: Using Makefile**

```bash
# From project root
make dev  # Starts both services
```

**Option 3: Using Docker**

```bash
docker-compose up --build
```

### Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI application entry
│   ├── routes/              # API endpoint handlers
│   ├── services/            # Business logic layer
│   ├── models/              # Pydantic models
│   ├── core/                # Core utilities
│   ├── agents/              # LangGraph AI agents
│   └── tests/               # Test files
│
├── frontend/
│   ├── app/                 # Next.js App Router
│   ├── components/          # React components
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilities
│   └── styles/              # CSS files
│
└── docs/                    # Documentation
```

## Development Workflow

### Creating a New Feature

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

3. **Run tests:**
   ```bash
   # Backend tests
   cd backend && pytest
   
   # Frontend type check
   cd frontend && pnpm type-check
   ```

4. **Commit with conventional commits:**
   ```bash
   git commit -m "feat: add new feature description"
   ```

5. **Push and create PR:**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks
- `ci:` - CI/CD changes
- `build:` - Build system changes

Examples:
```
feat: add user authentication
fix: resolve file upload timeout issue
docs: update API reference
test: add unit tests for analysis service
```

## Testing

### Backend Testing

```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_auth.py

# Run with verbose output
pytest -v
```

### Frontend Testing

```bash
cd frontend

# Type checking
pnpm type-check

# Lint
pnpm lint

# Build test
pnpm build
```

## Code Quality

### Backend (Python)

We use:
- **ruff** for linting and formatting
- **mypy** for type checking (optional)

```bash
# Format code
ruff format .

# Check linting
ruff check .

# Fix auto-fixable issues
ruff check --fix .
```

### Frontend (TypeScript)

We use:
- **ESLint** for linting
- **Prettier** for formatting

```bash
# Lint
pnpm lint

# Format (if prettier is configured)
pnpm prettier --write .
```

## Database Management

### SQLite (Development)

The database file is located at `backend/database/db.sqlite`.

To reset the database:
```bash
rm backend/database/db.sqlite
# Restart the backend - tables will be recreated
```

### Migrations

Currently using SQLAlchemy with auto-create. For production, consider using Alembic.

## Debugging

### Backend Debugging

1. **Enable debug logging:**
   ```env
   DEBUG=true
   LOG_LEVEL=DEBUG
   ```

2. **Use VS Code debugger:**
   - Add breakpoints in code
   - Use "Python: FastAPI" debug configuration

3. **View logs:**
   ```bash
   tail -f backend/logs/app.log
   ```

### Frontend Debugging

1. **Use React DevTools** browser extension
2. **Enable verbose logging** in browser console
3. **Use VS Code debugger** with Chrome debugging

## Common Issues

### Backend Issues

**Issue: ModuleNotFoundError**
```bash
# Ensure virtual environment is activated
source venv/bin/activate
pip install -r requirements.txt
```

**Issue: Database locked**
```bash
# SQLite concurrent access issue
# Ensure only one instance is running
```

**Issue: API key errors**
```bash
# Check .env file has valid API keys
cat .env | grep API_KEY
```

### Frontend Issues

**Issue: Module not found**
```bash
# Clear node_modules and reinstall
rm -rf node_modules .next
pnpm install
```

**Issue: Port already in use**
```bash
# Find and kill process on port 3000
lsof -i :3000
kill -9 <PID>
```

## IDE Setup

### VS Code Extensions

Recommended extensions:
- Python
- Pylance
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- GitLens

### Settings

Recommended `.vscode/settings.json`:
```json
{
  "python.defaultInterpreterPath": "./backend/venv/bin/python",
  "python.formatting.provider": "none",
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff"
  },
  "editor.formatOnSave": true
}
```

## Performance Tips

1. **Use async operations** where possible
2. **Implement caching** for repeated queries
3. **Optimize DataFrame operations** using vectorized operations
4. **Lazy load** frontend components

## Getting Help

- Check existing issues on GitHub
- Read the API documentation at `/docs`
- Review the architecture documentation
- Ask in discussions or create an issue
