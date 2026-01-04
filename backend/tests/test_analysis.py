"""
Tests for data analysis endpoints
"""

import pytest
from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


class TestAnalysisEndpoints:
    """Test data analysis API endpoints."""
    
    def test_analysis_without_file(self):
        """Test analysis fails without valid file."""
        response = client.post(
            "/api/analysis/analyze/nonexistent-file-id",
            json={"prompt": "Show me a chart"}
        )
        assert response.status_code in [404, 422]
    
    def test_analysis_status_nonexistent(self):
        """Test status check for nonexistent task."""
        response = client.get("/api/analysis/status/nonexistent-task-id")
        assert response.status_code in [404, 200]
    
    def test_analysis_history_endpoint(self):
        """Test analysis history endpoint returns list."""
        response = client.get("/api/analysis/history")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_public_analyses_endpoint(self):
        """Test public analyses endpoint."""
        response = client.get("/api/analysis/public")
        assert response.status_code == 200
    
    def test_visibility_toggle_nonexistent(self):
        """Test visibility toggle for nonexistent analysis."""
        response = client.put(
            "/api/analysis/visibility/nonexistent-id",
            json={"is_visible": True}
        )
        assert response.status_code in [404, 500]
    
    def test_analysis_request_validation(self):
        """Test analysis request body validation."""
        # Missing required fields
        response = client.post(
            "/api/analysis/analyze/test-file-id",
            json={}
        )
        # Should fail validation or return error
        assert response.status_code in [404, 422, 500]
