# Makefile for SkillsPulse Development

.PHONY: help install dev test lint clean docker-build docker-up docker-down

help:
	@echo "SkillsPulse Development Commands"
	@echo "================================"
	@echo "install      - Install all dependencies"
	@echo "dev          - Start development servers"
	@echo "test         - Run all tests"
	@echo "lint         - Run linters"
	@echo "clean        - Clean build artifacts"
	@echo "docker-build - Build Docker images"
	@echo "docker-up    - Start Docker containers"
	@echo "docker-down  - Stop Docker containers"

install:
	cd backend && pip install -r requirements.txt
	cd frontend && pnpm install

dev-backend:
	cd backend && python main.py

dev-frontend:
	cd frontend && pnpm dev

test:
	cd backend && python -m pytest tests/ -v

test-coverage:
	cd backend && python -m pytest tests/ -v --cov=. --cov-report=html

lint-backend:
	cd backend && python -m ruff check .

lint-frontend:
	cd frontend && pnpm lint

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name node_modules -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .next -exec rm -rf {} + 2>/dev/null || true

docker-build:
	docker-compose build

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f
