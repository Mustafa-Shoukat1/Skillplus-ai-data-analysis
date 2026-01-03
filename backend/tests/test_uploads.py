"""
Tests for file upload endpoints
"""

import io
import pytest
from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


class TestUploadEndpoints:
    """Test file upload API endpoints."""
    
    def test_upload_csv_file(self):
        """Test uploading a valid CSV file."""
        csv_content = b"name,value\ntest1,100\ntest2,200"
        files = {"file": ("test.csv", io.BytesIO(csv_content), "text/csv")}
        
        response = client.post("/api/uploads/", files=files)
        assert response.status_code in [200, 201]
        
        if response.status_code == 200:
            data = response.json()
            assert "file_id" in data
            assert data["file_type"] == ".csv"
    
    def test_upload_invalid_file_type(self):
        """Test uploading an invalid file type fails."""
        txt_content = b"This is a text file"
        files = {"file": ("test.txt", io.BytesIO(txt_content), "text/plain")}
        
        response = client.post("/api/uploads/", files=files)
        assert response.status_code == 400
    
    def test_upload_empty_file(self):
        """Test uploading an empty file fails gracefully."""
        files = {"file": ("empty.csv", io.BytesIO(b""), "text/csv")}
        
        response = client.post("/api/uploads/", files=files)
        # Should fail or succeed with empty data warning
        assert response.status_code in [200, 400, 422]
    
    def test_list_uploaded_files(self):
        """Test listing uploaded files."""
        response = client.get("/api/uploads/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_file_preview_nonexistent(self):
        """Test getting preview for nonexistent file."""
        response = client.get("/api/uploads/nonexistent-id/preview")
        assert response.status_code == 404
    
    def test_upload_large_csv(self):
        """Test uploading a larger CSV file."""
        # Generate CSV with 100 rows
        rows = ["name,department,score"]
        for i in range(100):
            rows.append(f"User{i},Dept{i % 5},{50 + i % 50}")
        csv_content = "\n".join(rows).encode()
        
        files = {"file": ("large.csv", io.BytesIO(csv_content), "text/csv")}
        response = client.post("/api/uploads/", files=files)
        assert response.status_code in [200, 201]
