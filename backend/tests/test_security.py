"""
Security tests for SkillsPulse Backend.
"""
import pytest
from core.security import (
    RateLimiter,
    InputSanitizer,
    TokenGenerator,
    IPBlocklist,
    SecurityHeaders
)


class TestRateLimiter:
    """Tests for rate limiter functionality."""
    
    @pytest.mark.unit
    def test_allows_requests_under_limit(self):
        """Test that requests under limit are allowed."""
        limiter = RateLimiter(requests_per_minute=10)
        client_id = "test_client"
        
        for _ in range(5):
            assert limiter.is_allowed(client_id) is True
    
    @pytest.mark.unit
    def test_blocks_requests_over_limit(self):
        """Test that requests over limit are blocked."""
        limiter = RateLimiter(requests_per_minute=5)
        client_id = "test_client"
        
        # Make 5 requests (limit)
        for _ in range(5):
            limiter.is_allowed(client_id)
        
        # 6th request should be blocked
        assert limiter.is_allowed(client_id) is False
    
    @pytest.mark.unit
    def test_get_remaining_requests(self):
        """Test remaining requests calculation."""
        limiter = RateLimiter(requests_per_minute=10)
        client_id = "test_client"
        
        # Make 3 requests
        for _ in range(3):
            limiter.is_allowed(client_id)
        
        remaining = limiter.get_remaining(client_id)
        assert remaining == 7
    
    @pytest.mark.unit
    def test_different_clients_tracked_separately(self):
        """Test that different clients have separate limits."""
        limiter = RateLimiter(requests_per_minute=5)
        
        # Exhaust client1's limit
        for _ in range(5):
            limiter.is_allowed("client1")
        
        # client2 should still have requests available
        assert limiter.is_allowed("client2") is True
        assert limiter.is_allowed("client1") is False


class TestInputSanitizer:
    """Tests for input sanitization."""
    
    @pytest.mark.unit
    def test_sanitize_html_characters(self):
        """Test HTML character sanitization."""
        dangerous = "<script>alert('xss')</script>"
        sanitized = InputSanitizer.sanitize_string(dangerous)
        
        assert "<" not in sanitized
        assert ">" not in sanitized
    
    @pytest.mark.unit
    def test_detect_sql_injection(self):
        """Test SQL injection detection."""
        sql_attacks = [
            "'; DROP TABLE users; --",
            "1 OR 1=1",
            "UNION SELECT * FROM passwords",
            "'; DELETE FROM users WHERE '1'='1"
        ]
        
        for attack in sql_attacks:
            assert InputSanitizer.check_sql_injection(attack) is True
    
    @pytest.mark.unit
    def test_safe_strings_pass_sql_check(self):
        """Test that safe strings pass SQL check."""
        safe_strings = [
            "Hello World",
            "This is a normal query",
            "Show me sales data for 2024"
        ]
        
        for safe in safe_strings:
            assert InputSanitizer.check_sql_injection(safe) is False
    
    @pytest.mark.unit
    def test_detect_xss_patterns(self):
        """Test XSS pattern detection."""
        xss_attacks = [
            "<script>alert('xss')</script>",
            "javascript:void(0)",
            "<img onerror=alert('xss')>",
            "<iframe src='evil.com'>",
        ]
        
        for attack in xss_attacks:
            assert InputSanitizer.check_xss(attack) is True
    
    @pytest.mark.unit
    def test_validate_safe_filename(self):
        """Test filename validation for safe names."""
        safe_names = [
            "data.csv",
            "my_file.csv",
            "report-2024.csv",
            "Sales Data.csv"
        ]
        
        for name in safe_names:
            assert InputSanitizer.validate_filename(name) is True
    
    @pytest.mark.unit
    def test_reject_dangerous_filename(self):
        """Test filename validation rejects dangerous names."""
        dangerous_names = [
            "../etc/passwd",
            "..\\windows\\system32",
            "file\x00.csv",
            "/root/secret",
        ]
        
        for name in dangerous_names:
            assert InputSanitizer.validate_filename(name) is False


class TestTokenGenerator:
    """Tests for token generation utilities."""
    
    @pytest.mark.unit
    def test_generate_token_length(self):
        """Test token generation with specified length."""
        token = TokenGenerator.generate_token(32)
        # URL-safe base64 is ~1.33x the byte length
        assert len(token) >= 32
    
    @pytest.mark.unit
    def test_generate_unique_tokens(self):
        """Test that generated tokens are unique."""
        tokens = [TokenGenerator.generate_token() for _ in range(100)]
        assert len(tokens) == len(set(tokens))
    
    @pytest.mark.unit
    def test_generate_api_key_format(self):
        """Test API key format."""
        api_key = TokenGenerator.generate_api_key()
        assert api_key.startswith("sk_")
        assert len(api_key) > 10
    
    @pytest.mark.unit
    def test_hash_and_verify_token(self):
        """Test token hashing and verification."""
        token = TokenGenerator.generate_token()
        hashed = TokenGenerator.hash_token(token)
        
        assert TokenGenerator.verify_token(token, hashed) is True
        assert TokenGenerator.verify_token("wrong_token", hashed) is False
    
    @pytest.mark.unit
    def test_hash_is_deterministic(self):
        """Test that same token produces same hash."""
        token = "test_token_123"
        hash1 = TokenGenerator.hash_token(token)
        hash2 = TokenGenerator.hash_token(token)
        
        assert hash1 == hash2


class TestIPBlocklist:
    """Tests for IP blocklist functionality."""
    
    @pytest.mark.unit
    def test_new_ip_not_blocked(self):
        """Test that new IPs are not blocked."""
        blocklist = IPBlocklist()
        assert blocklist.is_blocked("192.168.1.1") is False
    
    @pytest.mark.unit
    def test_block_after_threshold(self):
        """Test IP is blocked after threshold suspicious activities."""
        blocklist = IPBlocklist()
        blocklist.threshold = 5
        ip = "192.168.1.1"
        
        # Record suspicious activities up to threshold
        for _ in range(5):
            blocklist.record_suspicious_activity(ip)
        
        assert blocklist.is_blocked(ip) is True
    
    @pytest.mark.unit
    def test_unblock_ip(self):
        """Test unblocking an IP."""
        blocklist = IPBlocklist()
        ip = "192.168.1.1"
        
        blocklist.blocked_ips.add(ip)
        assert blocklist.is_blocked(ip) is True
        
        blocklist.unblock(ip)
        assert blocklist.is_blocked(ip) is False
    
    @pytest.mark.unit
    def test_suspicious_count_tracks_per_ip(self):
        """Test suspicious activity is tracked per IP."""
        blocklist = IPBlocklist()
        blocklist.threshold = 3
        
        blocklist.record_suspicious_activity("ip1")
        blocklist.record_suspicious_activity("ip2")
        blocklist.record_suspicious_activity("ip1")
        
        assert blocklist.suspicious_activity["ip1"] == 2
        assert blocklist.suspicious_activity["ip2"] == 1


class TestSecurityHeaders:
    """Tests for security headers configuration."""
    
    @pytest.mark.unit
    def test_all_security_headers_defined(self):
        """Test that all important security headers are defined."""
        required_headers = [
            "X-Content-Type-Options",
            "X-Frame-Options",
            "X-XSS-Protection",
            "Strict-Transport-Security",
            "Content-Security-Policy",
        ]
        
        for header in required_headers:
            assert header in SecurityHeaders.HEADERS
    
    @pytest.mark.unit
    def test_x_frame_options_deny(self):
        """Test X-Frame-Options is set to DENY."""
        assert SecurityHeaders.HEADERS["X-Frame-Options"] == "DENY"
    
    @pytest.mark.unit
    def test_content_type_options_nosniff(self):
        """Test X-Content-Type-Options is set to nosniff."""
        assert SecurityHeaders.HEADERS["X-Content-Type-Options"] == "nosniff"
