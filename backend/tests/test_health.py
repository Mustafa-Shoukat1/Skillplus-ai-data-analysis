"""
Tests for health and root endpoints
"""

import pytest
from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


def test_health_check():
    """Test health check endpoint returns healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "SkillsPulse"
    assert "version" in data


def test_root_endpoint():
    """Test root endpoint returns welcome message."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "SkillsPulse" in data["message"]
    assert "version" in data
    assert "docs" in data


def test_docs_endpoint():
    """Test API documentation is accessible."""
    response = client.get("/docs")
    assert response.status_code == 200


def test_redoc_endpoint():
    """Test ReDoc documentation is accessible."""
    response = client.get("/redoc")
    assert response.status_code == 200


def test_openapi_schema():
    """Test OpenAPI schema is generated correctly."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "SkillsPulse"
    assert "paths" in schema
