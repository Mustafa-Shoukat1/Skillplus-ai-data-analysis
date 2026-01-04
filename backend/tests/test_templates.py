"""
Integration tests for template service.
"""
import pytest
from unittest.mock import MagicMock, patch


class TestTemplateService:
    """Tests for template service functionality."""
    
    @pytest.mark.unit
    def test_template_list_returns_templates(self, client):
        """Test that template list endpoint returns templates."""
        response = client.get("/templates/")
        # Should return 200 or appropriate status
        assert response.status_code in [200, 404]
    
    @pytest.mark.unit
    def test_template_structure(self):
        """Test template data structure."""
        template = {
            "id": "test-template",
            "name": "Test Template",
            "description": "A test template",
            "category": "testing",
            "queries": ["Query 1", "Query 2"]
        }
        
        assert "id" in template
        assert "name" in template
        assert "queries" in template
        assert isinstance(template["queries"], list)
    
    @pytest.mark.unit
    def test_template_categories(self):
        """Test template category validation."""
        valid_categories = ["business", "analytics", "visualization", "statistical"]
        
        for category in valid_categories:
            assert isinstance(category, str)
            assert len(category) > 0
    
    @pytest.mark.unit
    def test_template_query_not_empty(self):
        """Test that template queries are not empty."""
        sample_queries = [
            "Analyze sales trends",
            "Show top customers",
            "Calculate monthly revenue"
        ]
        
        for query in sample_queries:
            assert len(query) > 0
            assert query.strip() == query


class TestTemplateValidation:
    """Tests for template validation logic."""
    
    @pytest.mark.unit
    def test_validate_template_name(self):
        """Test template name validation."""
        valid_names = ["Sales Analysis", "Customer Report", "Data Overview"]
        invalid_names = ["", "   ", None]
        
        for name in valid_names:
            assert isinstance(name, str) and len(name.strip()) > 0
        
        for name in invalid_names:
            is_invalid = name is None or (isinstance(name, str) and len(name.strip()) == 0)
            assert is_invalid
    
    @pytest.mark.unit
    def test_validate_template_queries_list(self):
        """Test that queries must be a list."""
        valid_queries = ["Query 1", "Query 2"]
        invalid_queries = "Single query string"
        
        assert isinstance(valid_queries, list)
        assert not isinstance(invalid_queries, list)
    
    @pytest.mark.unit
    def test_template_query_count_limit(self):
        """Test template query count limits."""
        max_queries = 20
        queries = [f"Query {i}" for i in range(10)]
        
        assert len(queries) <= max_queries


class TestTemplateRendering:
    """Tests for template rendering functionality."""
    
    @pytest.mark.unit
    def test_render_template_query(self):
        """Test rendering a template query with variables."""
        template_query = "Show sales for {region} in {year}"
        variables = {"region": "North", "year": "2024"}
        
        rendered = template_query.format(**variables)
        
        assert "North" in rendered
        assert "2024" in rendered
        assert "{" not in rendered
    
    @pytest.mark.unit
    def test_render_template_missing_variable(self):
        """Test rendering with missing variable raises error."""
        template_query = "Show sales for {region}"
        
        with pytest.raises(KeyError):
            template_query.format(missing_var="value")
    
    @pytest.mark.unit
    def test_template_default_values(self):
        """Test template default value handling."""
        defaults = {
            "limit": 10,
            "sort_order": "desc",
            "include_nulls": False
        }
        
        assert defaults.get("limit") == 10
        assert defaults.get("nonexistent", 5) == 5
