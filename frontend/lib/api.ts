const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

console.log("API Base URL:", API_BASE_URL) // Debug line

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// File Upload APIs
export const uploadFile = async (file: File): Promise<ApiResponse> => {
  try {
    console.log("🚀 Starting file upload to:", `${API_BASE_URL}/uploads/`)
    console.log("📁 File details:", {
      name: file.name,
      size: file.size,
      type: file.type
    })

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE_URL}/uploads/`, {
      method: 'POST',
      body: formData,
    })

    console.log("📡 Response status:", response.status)
    console.log("📡 Response headers:", Object.fromEntries(response.headers.entries()))

    const data = await response.json()
    console.log("📦 Response data:", data)
    
    if (!response.ok) {
      throw new Error(data.detail || 'Upload failed')
    }

    console.log("✅ Upload successful!")
    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error('❌ Upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

export const getFilePreview = async (fileId: string, rows: number = 10): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/uploads/${fileId}/preview?rows=${rows}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to get preview')
    }

    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error('Preview error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get preview'
    }
  }
}

export const listFiles = async (): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/uploads/`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to list files')
    }

    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error('List files error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list files'
    }
  }
}

// Analysis APIs
export const startAnalysis = async (fileId: string, prompt: string): Promise<ApiResponse> => {
  try {
    console.log("API: Starting analysis request...")
    console.log("API: File ID:", fileId)
    console.log("API: Prompt length:", prompt.length)
    console.log("API: Prompt preview:", prompt.substring(0, 100) + "...")
    
    const response = await fetch(`${API_BASE_URL}/analysis/analyze/${fileId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        prompt: prompt,
        model: "claude-3-opus-20240229",
        enable_code_review: true
      }),
    })

    console.log("API: Analysis request response status:", response.status)

    if (!response.ok) {
      let errorDetail = 'Failed to start analysis'
      try {
        const errorData = await response.json()
        errorDetail = errorData.detail || errorDetail
      } catch {
        errorDetail = `HTTP ${response.status}: ${response.statusText}`
      }
      throw new Error(errorDetail)
    }

    const data = await response.json()
    console.log("API: Analysis started successfully:", data)

    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error('API: Analysis start error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start analysis'
    }
  }
}

export const getAnalysisStatus = async (taskId: string): Promise<ApiResponse> => {
  try {
    console.log("API: Checking status for task:", taskId)
    
    const response = await fetch(`${API_BASE_URL}/analysis/status/${taskId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    })

    console.log("API: Status response status:", response.status)

    if (!response.ok) {
      let errorDetail = 'Failed to get analysis status'
      try {
        const errorData = await response.json()
        errorDetail = errorData.detail || errorDetail
      } catch {
        errorDetail = `HTTP ${response.status}: ${response.statusText}`
      }
      throw new Error(errorDetail)
    }

    const data = await response.json()
    console.log("API: Status data received:", data)

    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error('API: Status check error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get analysis status'
    }
  }
}

export const getAnalysisResult = async (taskId: string): Promise<ApiResponse> => {
  try {
    console.log("API: Fetching result for task:", taskId)
    
    const response = await fetch(`${API_BASE_URL}/analysis/result/${taskId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    })

    console.log("API: Result response status:", response.status)

    if (!response.ok) {
      let errorDetail = 'Failed to get analysis result'
      try {
        const errorData = await response.json()
        errorDetail = errorData.detail || errorDetail
      } catch {
        errorDetail = `HTTP ${response.status}: ${response.statusText}`
      }
      throw new Error(errorDetail)
    }

    const data = await response.json()
    console.log("API: Result data received:", data)

    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error('API: Result fetch error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get analysis result'
    }
  }
}

// Analysis visibility management
export const toggleAnalysisVisibility = async (analysisId: string, isVisible: boolean): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/analysis/visibility/${analysisId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        is_visible: isVisible
      }),
    })

    if (!response.ok) {
      let errorDetail = 'Failed to update visibility'
      try {
        const errorData = await response.json()
        errorDetail = errorData.detail || errorDetail
      } catch {
        errorDetail = `HTTP ${response.status}: ${response.statusText}`
      }
      throw new Error(errorDetail)
    }

    const data = await response.json()
    return {
      success: true,
      data: data
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update visibility'
    }
  }
}

export const getVisibleAnalyses = async (): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/analysis/visible`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      success: true,
      data: data
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch visible analyses'
    }
  }
}

// Enhanced getAnalysisHistory with visibility filter
export const getAnalysisHistory = async (visibleOnly: boolean = false): Promise<ApiResponse> => {
  try {
    const url = visibleOnly 
      ? `${API_BASE_URL}/analysis/history?visible_only=true`
      : `${API_BASE_URL}/analysis/history`
      
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      success: true,
      data: data
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch analysis history'
    }
  }
}

// Template APIs
export const getTemplates = async (includeDefaults: boolean = true, category?: string): Promise<ApiResponse> => {
  try {
    const params = new URLSearchParams({
      include_defaults: includeDefaults.toString()
    })
    if (category) params.append('category', category)

    const response = await fetch(`${API_BASE_URL}/templates/?${params}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to get templates')
    }

    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error('Get templates error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get templates'
    }
  }
}

export const createTemplate = async (templateData: {
  title: string
  description?: string
  prompt: string
  category?: string
  icon?: string
  color_scheme?: string
}): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/templates/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templateData),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to create template')
    }

    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error('Create template error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create template'
    }
  }
}

export const updateTemplate = async (templateId: number, templateData: {
  title?: string
  description?: string
  prompt?: string
  category?: string
  icon?: string
  color_scheme?: string
  is_active?: boolean
}): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/templates/${templateId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templateData),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to update template')
    }

    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error('Update template error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update template'
    }
  }
}

export const deleteTemplate = async (templateId: number): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/templates/${templateId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.detail || 'Failed to delete template')
    }

    return {
      success: true,
      data: { message: 'Template deleted successfully' }
    }
  } catch (error) {
    console.error('Delete template error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete template'
    }
  }
}

export const bulkAnalyzeWithTemplates = async (fileId: string, templateIds: number[]): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/templates/bulk-analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_id: fileId,
        template_ids: templateIds,
        model: 'claude-3-opus-20240229',
        enable_code_review: true
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to start bulk analysis')
    }

    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error('Bulk analysis error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start bulk analysis'
    }
  }
}

export const getTemplateCategories = async (): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/templates/categories`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to get categories')
    }

    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error('Get categories error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get categories'
    }
  }
}
