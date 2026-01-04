# Architecture Overview

This document describes the architecture of the SkillsPulse AI Data Analysis Platform.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     Next.js Frontend (React)                         │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │    │
│  │  │   Dashboard  │  │  Analysis    │  │  Visualization           │  │    │
│  │  │   Component  │  │  Interface   │  │  Components              │  │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS/REST API
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     FastAPI Backend                                  │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │    │
│  │  │   Routes     │  │  Services    │  │  Middleware              │  │    │
│  │  │   - Auth     │  │  - Auth      │  │  - Authentication        │  │    │
│  │  │   - Uploads  │  │  - Analysis  │  │  - Rate Limiting         │  │    │
│  │  │   - Analysis │  │  - Templates │  │  - Error Handling        │  │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI/AGENT LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                   LangGraph Agent System                             │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │    │
│  │  │   Graphs     │  │    Nodes     │  │       Edges              │  │    │
│  │  │   - Analysis │  │  - Planner   │  │  - Conditional routing   │  │    │
│  │  │   - Code Gen │  │  - Executor  │  │  - State transitions     │  │    │
│  │  │              │  │  - Validator │  │                          │  │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │    │
│  │                                                                      │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │                      LLM Providers                            │   │    │
│  │  │        ┌────────────────┐    ┌────────────────┐              │   │    │
│  │  │        │  Anthropic     │    │    OpenAI      │              │   │    │
│  │  │        │  Claude 3      │    │    GPT-4       │              │   │    │
│  │  │        └────────────────┘    └────────────────┘              │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────────┐   │
│  │     SQLite       │  │   File Storage   │  │    Pandas DataFrames    │   │
│  │   (Users, Auth,  │  │  (CSV Uploads)   │  │   (In-memory Analysis)  │   │
│  │    Sessions)     │  │                  │  │                         │   │
│  └──────────────────┘  └──────────────────┘  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### Frontend (Next.js)

The frontend is built with Next.js 14 using the App Router:

```
frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   └── api/                # API routes (if any)
├── components/             # React components
│   ├── ui/                 # Shadcn/ui components
│   ├── dashboard.tsx       # Main dashboard
│   ├── chart-*.tsx         # Visualization components
│   └── ...
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and helpers
└── styles/                 # CSS/Tailwind styles
```

**Key Technologies:**
- React 18 with Server Components
- TypeScript for type safety
- Tailwind CSS for styling
- Radix UI for accessible components
- Recharts for data visualization

### Backend (FastAPI)

The backend follows a layered architecture:

```
backend/
├── main.py                 # Application entry point
├── routes/                 # API route handlers
│   ├── auth.py             # Authentication routes
│   ├── uploads.py          # File upload routes
│   ├── data_analysis.py    # Analysis routes
│   └── templates.py        # Template routes
├── services/               # Business logic
│   ├── auth.py             # Auth service
│   ├── data_analysis.py    # Analysis service
│   └── template_service.py # Template service
├── models/                 # Pydantic models
│   ├── auth.py             # Auth models
│   ├── data_analysis.py    # Analysis models
│   └── database.py         # DB models
├── core/                   # Core utilities
│   ├── config.py           # Configuration
│   ├── database.py         # Database connection
│   ├── logger.py           # Logging setup
│   └── exceptions.py       # Custom exceptions
└── agents/                 # AI agent system
    ├── graphs/             # LangGraph definitions
    ├── nodes/              # Agent nodes
    ├── edges/              # Conditional edges
    └── prompts/            # LLM prompts
```

### AI Agent System (LangGraph)

The AI system uses LangGraph for orchestrating analysis:

```
┌─────────────┐
│   START     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   PLANNER   │──────────────────────┐
│    Node     │                      │
└──────┬──────┘                      │
       │                             │
       ▼                             │
┌─────────────┐                      │
│   CODER     │                      │
│    Node     │                      │
└──────┬──────┘                      │
       │                             │
       ▼                             │
┌─────────────┐     ┌─────────────┐  │
│  EXECUTOR   │────▶│   ERROR     │──┘
│    Node     │     │   HANDLER   │ (retry)
└──────┬──────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│  VALIDATOR  │
│    Node     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    END      │
└─────────────┘
```

**Agent Nodes:**
1. **Planner**: Analyzes user query and creates execution plan
2. **Coder**: Generates Python/pandas code for analysis
3. **Executor**: Safely executes generated code
4. **Validator**: Validates results and generates insights

## Data Flow

### Analysis Request Flow

```
1. User submits query
        │
        ▼
2. Frontend validates input
        │
        ▼
3. API receives request
        │
        ▼
4. Auth middleware validates token
        │
        ▼
5. Analysis service loads data
        │
        ▼
6. LangGraph agent processes query
   ├── Planner creates strategy
   ├── Coder generates code
   ├── Executor runs code
   └── Validator checks results
        │
        ▼
7. Results formatted & returned
        │
        ▼
8. Frontend renders visualization
```

## Security Architecture

### Authentication Flow

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│   Client   │────▶│   Login    │────▶│  Validate  │
│            │     │  Endpoint  │     │ Credentials│
└────────────┘     └────────────┘     └─────┬──────┘
                                            │
      ┌─────────────────────────────────────┘
      │
      ▼
┌────────────┐     ┌────────────┐     ┌────────────┐
│   Return   │◀────│  Generate  │◀────│   Create   │
│   Token    │     │    JWT     │     │  Session   │
└────────────┘     └────────────┘     └────────────┘
```

### Security Measures
- JWT tokens with expiration
- Password hashing (bcrypt)
- CORS configuration
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection

## Deployment Architecture

### Docker Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Network                           │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │    Frontend     │  │    Backend      │                  │
│  │   Container     │  │   Container     │                  │
│  │   (Next.js)     │  │   (FastAPI)     │                  │
│  │   Port: 3000    │  │   Port: 8000    │                  │
│  └─────────────────┘  └─────────────────┘                  │
│           │                    │                            │
│           │                    │                            │
│           └────────┬───────────┘                            │
│                    │                                        │
│              ┌─────▼─────┐                                  │
│              │  Shared   │                                  │
│              │  Volume   │                                  │
│              │ (uploads) │                                  │
│              └───────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

## Performance Considerations

- **Async I/O**: FastAPI with async/await for non-blocking operations
- **Connection Pooling**: SQLAlchemy async session management
- **Caching**: Response caching for repeated queries
- **Streaming**: Chunked responses for large datasets
- **Lazy Loading**: Frontend component lazy loading
