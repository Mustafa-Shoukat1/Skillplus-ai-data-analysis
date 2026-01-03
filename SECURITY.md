# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within SkillsPulse, please send an email to security@skillspulse.com. All security vulnerabilities will be promptly addressed.

Please include the following information in your report:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Any suggested fixes (optional)

## Security Best Practices

When deploying SkillsPulse, please ensure:

1. **Environment Variables**: Never commit `.env` files with real API keys
2. **Database**: Use PostgreSQL in production instead of SQLite
3. **CORS**: Configure specific origins instead of wildcards
4. **HTTPS**: Always use SSL/TLS in production
5. **API Keys**: Rotate API keys regularly
6. **Authentication**: Use strong passwords and consider implementing 2FA
