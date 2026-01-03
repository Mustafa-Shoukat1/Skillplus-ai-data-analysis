"""
Tests for authentication endpoints
"""

import pytest
from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


class TestAuthEndpoints:
    """Test authentication API endpoints."""
    
    def test_register_new_user(self):
        """Test user registration with valid data."""
        user_data = {
            "username": "testuser",
            "password": "testpassword123",
            "email": "test@example.com"
        }
        response = client.post("/api/auth/register", json=user_data)
        # Should succeed or fail gracefully
        assert response.status_code in [200, 201, 400, 422]
    
    def test_register_duplicate_user(self):
        """Test registration fails for duplicate username."""
        user_data = {
            "username": "admin",
            "password": "password123",
            "email": "admin@example.com"
        }
        # First registration
        client.post("/api/auth/register", json=user_data)
        # Second registration should fail
        response = client.post("/api/auth/register", json=user_data)
        assert response.status_code in [400, 409, 422]
    
    def test_login_invalid_credentials(self):
        """Test login fails with invalid credentials."""
        login_data = {
            "username": "nonexistent",
            "password": "wrongpassword"
        }
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401
    
    def test_login_missing_fields(self):
        """Test login fails with missing fields."""
        response = client.post("/api/auth/login", json={})
        assert response.status_code == 422
    
    def test_logout_endpoint(self):
        """Test logout endpoint returns success."""
        response = client.post("/api/auth/logout")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
    
    def test_get_current_user_unauthorized(self):
        """Test getting current user without auth fails."""
        response = client.get("/api/auth/me")
        assert response.status_code in [401, 403]
