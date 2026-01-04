# API Reference

Complete API documentation for SkillsPulse AI Data Analysis Platform.

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Authentication Endpoints

### Register User

Create a new user account.

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "username": "string",
  "email": "user@example.com",
  "password": "string"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "username": "string",
  "email": "user@example.com",
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Errors:**
- `400 Bad Request` - Invalid input data
- `409 Conflict` - Username or email already exists

---

### Login

Authenticate and receive access token.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "expires_in": 3600
}
```

**Errors:**
- `401 Unauthorized` - Invalid credentials

---

### Get Current User

Get the authenticated user's profile.

**Endpoint:** `GET /auth/me`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "username": "string",
  "email": "user@example.com",
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

## File Upload Endpoints

### Upload CSV File

Upload a CSV file for analysis.

**Endpoint:** `POST /uploads/`

**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request Body:** Form data with file field

**Response:** `201 Created`
```json
{
  "file_id": "uuid",
  "filename": "data.csv",
  "size_bytes": 1024,
  "row_count": 100,
  "column_count": 5,
  "columns": ["col1", "col2", "col3", "col4", "col5"],
  "uploaded_at": "2024-01-01T00:00:00Z"
}
```

**Errors:**
- `400 Bad Request` - Invalid file format
- `413 Payload Too Large` - File exceeds size limit

---

### List Uploaded Files

Get all files uploaded by the current user.

**Endpoint:** `GET /uploads/`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "files": [
    {
      "file_id": "uuid",
      "filename": "data.csv",
      "size_bytes": 1024,
      "uploaded_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

---

### Get File Details

Get details of a specific uploaded file.

**Endpoint:** `GET /uploads/{file_id}`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "file_id": "uuid",
  "filename": "data.csv",
  "size_bytes": 1024,
  "row_count": 100,
  "column_count": 5,
  "columns": ["col1", "col2", "col3", "col4", "col5"],
  "preview": [...],
  "uploaded_at": "2024-01-01T00:00:00Z"
}
```

---

### Delete File

Delete an uploaded file.

**Endpoint:** `DELETE /uploads/{file_id}`

**Headers:** `Authorization: Bearer <token>`

**Response:** `204 No Content`

---

## Data Analysis Endpoints

### Run Analysis

Execute AI-powered analysis on uploaded data.

**Endpoint:** `POST /analysis/`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "file_id": "uuid",
  "query": "Analyze sales trends by region",
  "analysis_type": "exploratory"
}
```

**Analysis Types:**
- `exploratory` - General data exploration
- `statistical` - Statistical analysis
- `visualization` - Generate charts
- `predictive` - Predictive modeling

**Response:** `200 OK`
```json
{
  "analysis_id": "uuid",
  "status": "completed",
  "query": "Analyze sales trends by region",
  "results": {
    "summary": "string",
    "insights": ["insight1", "insight2"],
    "statistics": {...},
    "code_executed": "string"
  },
  "visualizations": [
    {
      "type": "bar_chart",
      "title": "Sales by Region",
      "html": "<div>...</div>"
    }
  ],
  "execution_time_ms": 1500,
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### Get Analysis History

Get analysis history for the current user.

**Endpoint:** `GET /analysis/history`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (int, optional): Number of results (default: 10)
- `offset` (int, optional): Pagination offset (default: 0)

**Response:** `200 OK`
```json
{
  "analyses": [
    {
      "analysis_id": "uuid",
      "query": "string",
      "status": "completed",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 50,
  "limit": 10,
  "offset": 0
}
```

---

### Get Analysis Details

Get details of a specific analysis.

**Endpoint:** `GET /analysis/{analysis_id}`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "analysis_id": "uuid",
  "status": "completed",
  "query": "string",
  "results": {...},
  "visualizations": [...],
  "execution_time_ms": 1500,
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

## Template Endpoints

### List Templates

Get available analysis templates.

**Endpoint:** `GET /templates/`

**Response:** `200 OK`
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Sales Analysis",
      "description": "Comprehensive sales data analysis",
      "category": "business",
      "queries": ["Top products", "Revenue trends"]
    }
  ]
}
```

---

### Get Template

Get a specific template.

**Endpoint:** `GET /templates/{template_id}`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "Sales Analysis",
  "description": "string",
  "category": "business",
  "queries": [...],
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

## Health Check

### Health Status

Check API health status.

**Endpoint:** `GET /health`

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {...}
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_INPUT` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

---

## Rate Limiting

API requests are rate limited:
- **Anonymous:** 100 requests/hour
- **Authenticated:** 1000 requests/hour
- **Analysis:** 50 requests/hour

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1704067200
```
