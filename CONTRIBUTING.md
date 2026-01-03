# Contributing to SkillsPulse

First off, thank you for considering contributing to SkillsPulse! It's people like you that make SkillsPulse such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples to demonstrate the steps**
* **Describe the behavior you observed after following the steps**
* **Explain which behavior you expected to see instead and why**
* **Include screenshots and animated GIFs** if possible
* **Include your environment details** (OS, Python version, Node.js version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a step-by-step description of the suggested enhancement**
* **Provide specific examples to demonstrate the steps**
* **Describe the current behavior and explain the expected behavior**
* **Explain why this enhancement would be useful**

### Pull Requests

1. Fork the repo and create your branch from `master`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Development Process

### Setting Up Development Environment

```bash
# Clone your fork
git clone https://github.com/your-username/Skillplus-ai-data-analysis.git
cd Skillplus-ai-data-analysis

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend setup
cd ../frontend
pnpm install
```

### Code Style

**Python (Backend):**
- Follow PEP 8 guidelines
- Use type hints for function arguments and return values
- Use docstrings for all public functions and classes
- Maximum line length: 100 characters

**TypeScript (Frontend):**
- Follow the existing ESLint configuration
- Use TypeScript strict mode
- Prefer functional components with hooks
- Use meaningful variable and function names

### Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### Branch Naming

- `feature/` - for new features
- `fix/` - for bug fixes
- `docs/` - for documentation changes
- `refactor/` - for code refactoring
- `test/` - for adding tests

## Project Structure

```
Skillplus-ai-data-analysis/
├── backend/           # FastAPI backend
│   ├── agents/        # AI agents (LangGraph)
│   ├── core/          # Core configuration
│   ├── models/        # Data models
│   ├── routes/        # API routes
│   └── services/      # Business logic
└── frontend/          # Next.js frontend
    ├── app/           # Next.js app router
    ├── components/    # React components
    └── lib/           # Utilities
```

## Testing

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

## Documentation

- Keep README.md up to date
- Document all public APIs
- Add inline comments for complex logic
- Update TypeScript/Python type definitions

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

Thank you for contributing! 🎉
