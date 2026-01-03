# 🚀 SkillsPulse - AI-Powered Data Analysis Platform

<div align="center">

![SkillsPulse Logo](https://img.shields.io/badge/SkillsPulse-AI%20Data%20Analysis-blue?style=for-the-badge)

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.116+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![LangChain](https://img.shields.io/badge/LangChain-0.3+-121212?style=flat-square)](https://langchain.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**A comprehensive AI-powered data analysis platform that transforms raw data into actionable insights through intelligent automation and beautiful visualizations.**

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [API Reference](#-api-reference) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage Guide](#-usage-guide)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

SkillsPulse is a cutting-edge data analysis platform that leverages the power of AI (powered by Anthropic Claude and OpenAI GPT models) combined with LangGraph workflows to provide:

- **Intelligent Data Analysis**: Automatically analyze CSV and Excel files with natural language queries
- **Dynamic Visualizations**: Generate interactive ECharts-based visualizations from your data
- **Multi-User Support**: Role-based access control for admins and viewers
- **Real-time Processing**: Background task processing with status tracking
- **Enterprise Ready**: Secure authentication, comprehensive logging, and scalable architecture

---

## ✨ Features

### 🤖 AI-Powered Analysis
- **Natural Language Queries**: Ask questions about your data in plain English
- **Intelligent Classification**: Automatically determines if your query needs data extraction, visualization, or direct answers
- **Multi-Model Support**: Supports Claude (Anthropic) and GPT-4 (OpenAI) models
- **Context-Aware Responses**: Understands your data structure and provides relevant insights

### 📊 Data Visualization
- **ECharts Integration**: Beautiful, interactive charts powered by Apache ECharts
- **Multiple Chart Types**: Bar, Line, Pie, Scatter, Heatmap, and more
- **Responsive Design**: Charts adapt to any screen size
- **Export Capabilities**: Download visualizations as HTML files

### 📁 File Management
- **Multi-Format Support**: CSV, XLSX, XLS file formats
- **Smart Processing**: Automatic data cleaning and preprocessing
- **Excel Multi-Sheet**: Process multiple sheets from Excel files
- **Large File Support**: Handle files up to 10MB

### 👥 User Management
- **Role-Based Access**: Admin and Viewer roles
- **JWT Authentication**: Secure token-based authentication
- **User Administration**: Create, manage, and delete users
- **Session Management**: Persistent login sessions

### 📈 Analytics Dashboard
- **Real-time Stats**: Track analysis counts and trends
- **Visibility Controls**: Toggle analysis visibility for viewers
- **History Tracking**: Complete analysis history with timestamps
- **Performance Metrics**: Processing time and model usage stats

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js 14)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Login     │  │   Admin     │  │   Viewer    │  │   Charts    │ │
│  │   Form      │  │  Dashboard  │  │  Dashboard  │  │   Display   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ REST API
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Backend (FastAPI)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │    Auth     │  │   Upload    │  │  Analysis   │  │  Templates  │ │
│  │   Routes    │  │   Routes    │  │   Routes    │  │   Routes    │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │                │         │
│         └────────────────┴────────┬───────┴────────────────┘         │
│                                   ▼                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Services Layer                               │ │
│  │   AuthService  │  DataAnalysisService  │  TemplateService      │ │
│  └────────────────────────────────┬───────────────────────────────┘ │
└───────────────────────────────────┼─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AI Analysis Engine (LangGraph)                    │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │   Query Classification → Data Extraction → Code Generation      ││
│  │         ↓                      ↓                   ↓            ││
│  │   Code Review → Code Rewrite → Code Execution → Final Results  ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│  ┌───────────────────────────┴───────────────────────────────────┐  │
│  │           LLM Providers (Claude / GPT-4)                       │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Database (SQLite/PostgreSQL)                 │
│   Users  │  UploadedFiles  │  AnalysisResults  │  Templates         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.12+ | Core runtime |
| FastAPI | 0.116+ | Web framework |
| LangChain | 0.3+ | AI orchestration |
| LangGraph | 0.5+ | Workflow graphs |
| SQLAlchemy | 2.0+ | ORM |
| Pandas | 2.3+ | Data processing |
| Plotly | 6.2+ | Visualization backend |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2 | React framework |
| TypeScript | 5.0+ | Type safety |
| Tailwind CSS | 3.4+ | Styling |
| Radix UI | Latest | UI components |
| Recharts | 2.15 | Charts |

### AI/ML
| Provider | Model | Use Case |
|----------|-------|----------|
| Anthropic | Claude 3 Opus | Primary analysis |
| OpenAI | GPT-4 | Alternative model |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- pnpm (recommended) or npm

### 1. Clone Repository
```bash
git clone https://github.com/Mustafa-Shoukat1/Skillplus-ai-data-analysis.git
cd Skillplus-ai-data-analysis
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your API keys

# Run backend
python main.py
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
pnpm install  # or: npm install

# Configure environment
cp .env.example .env.local

# Run frontend
pnpm dev  # or: npm run dev
```

### 4. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Default Credentials
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| viewer1 | viewer123 | Viewer |

---

## 📦 Installation

### Backend Installation (Detailed)

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# OR
.\venv\Scripts\activate  # Windows

# Upgrade pip
pip install --upgrade pip

# Install from requirements.txt
pip install -r requirements.txt

# OR install from pyproject.toml using uv
pip install uv
uv sync
```

### Frontend Installation (Detailed)

```bash
# Navigate to frontend directory
cd frontend

# Install with pnpm (recommended)
pnpm install

# OR with npm
npm install

# OR with yarn
yarn install
```

---

## ⚙️ Configuration

### Backend Configuration

Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=true

# Database Configuration
DATABASE_TYPE=sqlite
DATABASE_URL=sqlite:///./database/db.sqlite

# AI API Keys (Required)
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key

# File Upload Settings
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
OUTPUT_DIR=generated_charts
```

### Frontend Configuration

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HOST` | No | 0.0.0.0 | Server host address |
| `PORT` | No | 8000 | Server port |
| `DEBUG` | No | false | Enable debug mode |
| `DATABASE_URL` | No | SQLite | Database connection string |
| `ANTHROPIC_API_KEY` | Yes | - | Anthropic Claude API key |
| `OPENAI_API_KEY` | No | - | OpenAI API key (optional) |
| `MAX_FILE_SIZE` | No | 10MB | Maximum upload file size |

---

## 📖 Usage Guide

### 1. File Upload

1. Login as admin
2. Navigate to **Upload** tab
3. Drag & drop or click to upload CSV/Excel file
4. Wait for processing to complete
5. Preview your data in the table view

### 2. AI Analysis

1. After uploading data, go to **AI Analysis** tab
2. Enter your question in natural language:
   - "Show me a bar chart of sales by region"
   - "What is the average score by department?"
   - "Create a pie chart showing distribution of categories"
3. Click **Generate Analysis**
4. View results and interactive charts

### 3. User Management (Admin Only)

1. Navigate to **Users** tab
2. Add new users with username, password, and role
3. Delete existing users
4. View user creation dates

### 4. Viewing Reports (Viewer Role)

1. Login as viewer
2. See all public analyses shared by admins
3. View interactive charts
4. Access analysis history

---

## 🔌 API Reference

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "newuser",
  "password": "securepassword",
  "email": "user@example.com"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### File Upload

#### Upload File
```http
POST /api/uploads/
Content-Type: multipart/form-data

file: <binary>
```

Response:
```json
{
  "file_id": "uuid-string",
  "filename": "data.csv",
  "file_type": ".csv",
  "file_size": 1024,
  "columns": ["col1", "col2"],
  "shape": [100, 5],
  "upload_timestamp": "2026-01-03T10:00:00Z"
}
```

#### Get File Preview
```http
GET /api/uploads/{file_id}/preview?rows=10
```

### Data Analysis

#### Start Analysis
```http
POST /api/analysis/analyze/{file_id}
Content-Type: application/json

{
  "prompt": "Create a bar chart showing sales by region",
  "model": "claude-3-opus"
}
```

#### Get Analysis Status
```http
GET /api/analysis/status/{task_id}
```

#### Get Analysis History
```http
GET /api/analysis/history
```

#### Toggle Visibility
```http
PUT /api/analysis/visibility/{analysis_id}
Content-Type: application/json

{
  "is_visible": true
}
```

### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "SkillsPulse",
  "version": "1.0.0"
}
```

---

## 📁 Project Structure

```
Skillplus-ai-data-analysis/
├── backend/
│   ├── agents/                 # LangGraph AI agents
│   │   ├── edges/             # Graph edge functions
│   │   ├── graphs/            # Workflow graph definitions
│   │   ├── nodes/             # Processing nodes
│   │   └── prompts/           # LLM prompts
│   ├── core/                   # Core configuration
│   │   ├── config.py          # Settings management
│   │   ├── database.py        # Database connections
│   │   └── logger.py          # Logging configuration
│   ├── models/                 # Pydantic models
│   │   ├── auth.py            # Authentication models
│   │   ├── data_analysis.py   # Analysis models
│   │   └── database.py        # SQLAlchemy models
│   ├── routes/                 # API routes
│   │   ├── auth.py            # Auth endpoints
│   │   ├── data_analysis.py   # Analysis endpoints
│   │   ├── templates.py       # Template endpoints
│   │   └── uploads.py         # Upload endpoints
│   ├── services/               # Business logic
│   │   ├── auth.py            # Auth service
│   │   ├── data_analysis.py   # Analysis service
│   │   └── template_service.py
│   ├── uploads/                # Uploaded files
│   ├── plots/                  # Generated visualizations
│   ├── database/               # SQLite database
│   ├── logs/                   # Application logs
│   ├── main.py                 # FastAPI application
│   ├── requirements.txt        # Python dependencies
│   └── pyproject.toml          # Project configuration
│
├── frontend/
│   ├── app/                    # Next.js app router
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Main page
│   │   └── globals.css        # Global styles
│   ├── components/             # React components
│   │   ├── ui/                # Shadcn UI components
│   │   ├── admin-dashboard.tsx
│   │   ├── viewer-dashboard.tsx
│   │   ├── login-form.tsx
│   │   ├── file-upload.tsx
│   │   ├── ai-analysis-generator.tsx
│   │   └── ...
│   ├── lib/                    # Utilities
│   │   ├── api.ts             # API client
│   │   ├── storage.ts         # Local storage
│   │   └── utils.ts           # Helper functions
│   ├── hooks/                  # Custom hooks
│   ├── package.json           # Dependencies
│   └── tailwind.config.ts     # Tailwind config
│
└── README.md                   # This file
```

---

## 🔧 Development

### Running in Development Mode

**Backend:**
```bash
cd backend
source venv/bin/activate
DEBUG=true python main.py
```

**Frontend:**
```bash
cd frontend
pnpm dev
```

### Code Style

**Backend:**
- Follow PEP 8 guidelines
- Use type hints
- Format with Black
- Lint with Ruff

**Frontend:**
- ESLint configuration included
- Prettier for formatting
- TypeScript strict mode

### Making Changes

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Submit a pull request

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v
```

### Frontend Tests
```bash
cd frontend
pnpm test
```

### API Testing
Use the interactive Swagger UI at `http://localhost:8000/docs`

---

## 🚢 Deployment

### Docker Deployment

```dockerfile
# Backend Dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```

### Production Checklist

- [ ] Set `DEBUG=false`
- [ ] Use PostgreSQL instead of SQLite
- [ ] Configure proper CORS origins
- [ ] Set up SSL/TLS
- [ ] Configure rate limiting
- [ ] Set up monitoring
- [ ] Configure log rotation

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines.

### How to Contribute

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code of Conduct

Please read our Code of Conduct before contributing.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Modern web framework
- [LangChain](https://langchain.com/) - AI orchestration
- [Next.js](https://nextjs.org/) - React framework
- [Shadcn/ui](https://ui.shadcn.com/) - UI components
- [Apache ECharts](https://echarts.apache.org/) - Visualization library

---

## 📞 Support

- 📧 Email: support@skillspulse.com
- 🐛 Issues: [GitHub Issues](https://github.com/Mustafa-Shoukat1/Skillplus-ai-data-analysis/issues)
- 📖 Documentation: [Wiki](https://github.com/Mustafa-Shoukat1/Skillplus-ai-data-analysis/wiki)

---

<div align="center">

**Made with ❤️ by [Mustafa Shoukat](https://github.com/Mustafa-Shoukat1)**

⭐ Star this repo if you find it helpful!

</div>
