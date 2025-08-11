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
export const startAnalysis = async (
  fileId: string,
  prompt: string,
  options?: {
    graphType?: string
    sheet?: string
    echartSampleCode?: string
    model?: string
  }
): Promise<ApiResponse> => {
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
        prompt,
        model: options?.model,
        graph_type: options?.graphType,
        sheet: options?.sheet,
        echart_sample_code: options?.echartSampleCode,
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
export const toggleAnalysisVisibility = async (analysisId: string, isActive: boolean): Promise<ApiResponse> => {
  try {
    console.log("API: Toggling visibility for analysis:", analysisId, "to:", isActive)
    
    const response = await fetch(`${API_BASE_URL}/analysis/visibility/${analysisId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        is_active: isActive  // Changed from is_visible to is_active
      }),
    })

    console.log("API: Visibility toggle response status:", response.status)

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
    console.log("API: Visibility updated successfully:", data)
    
    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error("API: Visibility toggle error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update visibility'
    }
  }
}

export const getVisibleAnalyses = async (): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/analysis/active`, {  // Changed endpoint name
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
      error: error instanceof Error ? error.message : 'Failed to fetch active analyses'
    }
  }
}

// Enhanced getAnalysisHistory with visibility filter
export const getAnalysisHistory = async (): Promise<ApiResponse<any[]>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/analysis/history`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        data: data.data || [],
      };
    } else {
      return {
        success: false,
        error: data.detail || 'Failed to fetch analysis history',
      };
    }
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

export const getAnalysisResultFromDB = async (analysisId: string): Promise<ApiResponse<any>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/analysis/result/db/${analysisId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        data: data,
      };
    } else {
      return {
        success: false,
        error: data.detail || 'Failed to fetch analysis result',
      };
    }
  } catch (error) {
    console.error('Error fetching analysis result:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

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
        enable_code_review: true,
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

// Sheet and Graph Type APIs - UPDATED
export const getAvailableSheets = async (fileId: string): Promise<ApiResponse> => {
  try {
    console.log("API: Getting sheets for file:", fileId)
    
    const response = await fetch(`${API_BASE_URL}/uploads/${fileId}/sheets`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    })

    console.log("API: Sheets response status:", response.status)

    if (!response.ok) {
      let errorDetail = 'Failed to get available sheets'
      try {
        const errorData = await response.json()
        errorDetail = errorData.detail || errorDetail
      } catch {
        errorDetail = `HTTP ${response.status}: ${response.statusText}`
      }
      throw new Error(errorDetail)
    }

    const data = await response.json()
    console.log("API: Sheets data received:", data)

    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error('API: Get sheets error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get sheets'
    }
  }
}

export const getAvailableGraphTypes = async (): Promise<ApiResponse> => {
  try {
    console.log("API: Getting available graph types")
    
    const response = await fetch(`${API_BASE_URL}/analysis/graph-types`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    })

    console.log("API: Graph types response status:", response.status)

    if (!response.ok) {
      let errorDetail = 'Failed to get graph types'
      try {
        const errorData = await response.json()
        errorDetail = errorData.detail || errorDetail
      } catch {
        errorDetail = `HTTP ${response.status}: ${response.statusText}`
      }
      throw new Error(errorDetail)
    }

    const data = await response.json()
    console.log("API: Graph types data received:", data)

    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error('API: Get graph types error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get graph types'
    }
  }
}

// New metadata APIs
export const getAnalysisTypes = async (): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/metadata/analysis-types`, {
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
      error: error instanceof Error ? error.message : 'Failed to get analysis types'
    }
  }
}

export const getAvailableModels = async (): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/metadata/models`, {
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
      error: error instanceof Error ? error.message : 'Failed to get models'
    }
  }
}

// Enhanced analysis API with new parameters
export const startAdvancedAnalysis = async (
  fileId: string,
  prompt: string,
  options: {
    sheet?: string
    graphType?: string
    analysisType?: 'skill' | 'gap'
    echartSampleCode?: string
    model?: string
  }
): Promise<ApiResponse> => {
  try {
    console.log("API: Starting advanced analysis request...")
    
    const response = await fetch(`${API_BASE_URL}/analysis/analyze/${fileId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        prompt,
        model: options?.model || 'claude-3-7-sonnet-20250219',
        graph_type: options?.graphType,
        sheet: options?.sheet,
        echart_sample_code: options?.echartSampleCode,
        analysis_type: options?.analysisType,
      }),
    })

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
    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error('API: Advanced analysis error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start analysis'
    }
  }
}
