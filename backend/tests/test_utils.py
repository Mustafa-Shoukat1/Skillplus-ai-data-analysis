"""
Tests for utility functions
"""

import pytest
from core.utils import (
    sanitize_filename,
    generate_hash,
    format_file_size,
    parse_datetime,
    truncate_string,
    flatten_dict
)


class TestSanitizeFilename:
    """Tests for sanitize_filename function."""
    
    def test_normal_filename(self):
        assert sanitize_filename("test.csv") == "test.csv"
    
    def test_filename_with_path(self):
        result = sanitize_filename("path/to/file.csv")
        assert "/" not in result
    
    def test_filename_with_special_chars(self):
        result = sanitize_filename("file<>:\"|?*.csv")
        assert "<" not in result
        assert ">" not in result


class TestGenerateHash:
    """Tests for generate_hash function."""
    
    def test_sha256_hash(self):
        content = b"test content"
        hash1 = generate_hash(content)
        hash2 = generate_hash(content)
        assert hash1 == hash2
        assert len(hash1) == 64  # SHA256 hex length
    
    def test_different_content(self):
        hash1 = generate_hash(b"content1")
        hash2 = generate_hash(b"content2")
        assert hash1 != hash2


class TestFormatFileSize:
    """Tests for format_file_size function."""
    
    def test_bytes(self):
        assert "B" in format_file_size(500)
    
    def test_kilobytes(self):
        assert "KB" in format_file_size(1500)
    
    def test_megabytes(self):
        assert "MB" in format_file_size(1500000)
    
    def test_gigabytes(self):
        assert "GB" in format_file_size(1500000000)


class TestParseDatetime:
    """Tests for parse_datetime function."""
    
    def test_iso_format(self):
        result = parse_datetime("2026-01-03")
        assert result is not None
        assert result.year == 2026
    
    def test_invalid_format(self):
        result = parse_datetime("invalid")
        assert result is None


class TestTruncateString:
    """Tests for truncate_string function."""
    
    def test_short_string(self):
        assert truncate_string("short", 10) == "short"
    
    def test_long_string(self):
        result = truncate_string("a" * 200, 100)
        assert len(result) == 100
        assert result.endswith("...")


class TestFlattenDict:
    """Tests for flatten_dict function."""
    
    def test_simple_dict(self):
        d = {"a": 1, "b": 2}
        assert flatten_dict(d) == {"a": 1, "b": 2}
    
    def test_nested_dict(self):
        d = {"a": {"b": {"c": 1}}}
        result = flatten_dict(d)
        assert "a.b.c" in result
