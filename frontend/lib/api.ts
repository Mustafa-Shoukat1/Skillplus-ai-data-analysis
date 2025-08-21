const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

export interface ApiResponse {
  success: boolean
  data?: any
  error?: string
  message?: string
}

async function safeJson(res: Response) {
  try { return await res.json() } catch { return null }
}

// --- Basic helpers ---
export const getActiveDashboardAnalysis = async (): Promise<ApiResponse> => {
  try {
    const res = await fetch(`${API_BASE_URL}/analysis/dashboard/active`, { credentials: 'include' })
    const json = await safeJson(res)
    if (!res.ok) return { success: false, error: json?.detail || res.statusText }
    return { success: true, data: json }
  } catch (error: any) {
    return { success: false, error: error?.message || "Network error" }
  }
}

export const getAnalysisResultFromDB = async (analysisId: string): Promise<ApiResponse> => {
  try {
    const res = await fetch(`${API_BASE_URL}/analysis/result/db/${encodeURIComponent(analysisId)}`, { credentials: 'include' })
    const json = await safeJson(res)
    if (!res.ok) return { success: false, error: json?.detail || res.statusText }
    return { success: true, data: json }
  } catch (error: any) {
    return { success: false, error: error?.message || "Network error" }
  }
}

// File upload helpers (kept minimal — adapt as needed)
export const uploadFile = async (file: File): Promise<ApiResponse> => {
  try {
    const form = new FormData()
    form.append("file", file)
    const res = await fetch(`${API_BASE_URL}/uploads/`, {
      method: "POST",
      body: form,
      credentials: 'include'
    })
    const json = await safeJson(res)
    if (!res.ok) return { success: false, error: json?.detail || res.statusText }
    return { success: true, data: json }
  } catch (error: any) {
    return { success: false, error: error?.message || "Upload failed" }
  }
}

export const getFilePreview = async (fileId: string, rows: number = 10): Promise<ApiResponse> => {
  try {
    const res = await fetch(`${API_BASE_URL}/uploads/${encodeURIComponent(fileId)}/preview?rows=${rows}`, { credentials: 'include' })
    const json = await safeJson(res)
    if (!res.ok) return { success: false, error: json?.detail || res.statusText }
    return { success: true, data: json }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to get preview" }
  }
}

export const listFiles = async (): Promise<ApiResponse> => {
  try {
    const res = await fetch(`${API_BASE_URL}/uploads/`, { credentials: 'include' })
    const json = await safeJson(res)
    if (!res.ok) return { success: false, error: json?.detail || res.statusText }
    return { success: true, data: json }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to list files" }
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
    const response = await fetch(`${API_BASE_URL}/analysis/analyze/${encodeURIComponent(fileId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        prompt,
        model: options?.model,
        graph_type: options?.graphType,
        sheet: options?.sheet,
        echart_sample_code: options?.echartSampleCode,
      }),
    })
    const data = await safeJson(response)
    if (!response.ok) return { success: false, error: data?.detail || response.statusText }
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to start analysis' }
  }
}

export const getAnalysisStatus = async (taskId: string): Promise<ApiResponse> => {
  try {
    const res = await fetch(`${API_BASE_URL}/analysis/status/${encodeURIComponent(taskId)}`, { credentials: 'include' })
    const json = await safeJson(res)
    if (!res.ok) return { success: false, error: json?.detail || res.statusText }
    return { success: true, data: json }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to get analysis status' }
  }
}

export const getAnalysisResult = async (taskId: string): Promise<ApiResponse> => {
  try {
    const res = await fetch(`${API_BASE_URL}/analysis/result/${encodeURIComponent(taskId)}`, { credentials: 'include' })
    const json = await safeJson(res)
    if (!res.ok) return { success: false, error: json?.detail || res.statusText }
    return { success: true, data: json }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to get analysis result' }
  }
}

export const toggleAnalysisVisibility = async (analysisId: string, isActive: boolean): Promise<ApiResponse> => {
  try {
    const res = await fetch(`${API_BASE_URL}/analysis/visibility/${encodeURIComponent(analysisId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ is_active: isActive })
    })
    const json = await safeJson(res)
    if (!res.ok) return { success: false, error: json?.detail || res.statusText }
    return { success: true, data: json }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to update visibility' }
  }
}

export const getVisibleAnalyses = async (analysisType?: string): Promise<ApiResponse> => {
  try {
    const url = analysisType
      ? `${API_BASE_URL}/analysis/active?analysis_type=${encodeURIComponent(analysisType)}`
      : `${API_BASE_URL}/analysis/active`
    const res = await fetch(url, { credentials: 'include' })
    const json = await safeJson(res)
    if (!res.ok) return { success: false, error: json?.detail || res.statusText }
    return { success: true, data: json }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to fetch active analyses' }
  }
}

export const getAnalysisHistory = async (): Promise<ApiResponse> => {
  try {
    const res = await fetch(`${API_BASE_URL}/analysis/history`, { credentials: 'include' })
    const json = await safeJson(res)
    if (!res.ok) return { success: false, error: json?.detail || res.statusText }
    return { success: true, data: json?.data || json }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to fetch analysis history' }
  }
}

// Templates, graph types, dashboard helpers (kept — adapt if you need)
// Note: keep or re-implement additional helpers (templates, graph-templates, dashboard analysis) as needed in same style.

export const getAvailableSheets = async (fileId: string): Promise<ApiResponse> => {
  try {
    const res = await fetch(`${API_BASE_URL}/uploads/${encodeURIComponent(fileId)}/sheets`, { credentials: 'include' })
    const json = await safeJson(res)
    if (!res.ok) return { success: false, error: json?.detail || res.statusText }
    return { success: true, data: json?.data || json }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to get sheets' }
  }
}

export const getGraphTemplates = async (): Promise<ApiResponse> => {
  try {
    const res = await fetch(`${API_BASE_URL}/graph-templates/?page=1&page_size=50&is_active=true`, { credentials: 'include' })
    const json = await safeJson(res)
    if (!res.ok) return { success: false, error: json?.detail || res.statusText }
    return { success: true, data: json }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to get graph templates' }
  }
}

export const getAvailableGraphTypes = async (): Promise<ApiResponse> => {
  try {
    const resp = await getGraphTemplates()
    if (!resp.success) return { success: false, error: resp.error || 'Failed to get graph templates' }
    const templates = resp.data?.graph_templates || resp.data?.graph_templates || []
    const graphTypes = templates.map((t: any) => ({
      value: t.graph_type,
      name: t.graph_name,
      description: t.description,
      echart_code: t.echart_code,
      category: t.category
    }))
    return { success: true, data: { graph_types: graphTypes, total_types: graphTypes.length } }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to get graph types' }
  }
}

// Dashboard APIs
export const startDashboardAnalysis = async (fileId: string): Promise<ApiResponse> => {
  try {
    const res = await fetch(`${API_BASE_URL}/analysis/analyze/${encodeURIComponent(fileId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        prompt: "Perform comprehensive dashboard analysis covering executive overview, HR analytics, team management, and skill analysis",
        model: 'claude-3-7-sonnet-20250219',
        analysis_type: 'dashboard'
      })
    })
    const json = await safeJson(res)
    if (!res.ok) return { success: false, error: json?.detail || res.statusText }
    return { success: true, data: json }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to start dashboard analysis' }
  }
}

export const getDashboardResult = async (taskId: string): Promise<ApiResponse> => {
  try {
    const res = await fetch(`${API_BASE_URL}/analysis/dashboard/${encodeURIComponent(taskId)}`, { credentials: 'include' })
    const json = await safeJson(res)
    if (!res.ok) return { success: false, error: json?.detail || res.statusText }
    return { success: true, data: json }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to get dashboard result' }
  }
}

export const getTemplates = async (includeDefaults: boolean = true, category?: string): Promise<ApiResponse> => {
  try {
    const params = new URLSearchParams()
    params.append("include_defaults", includeDefaults ? "true" : "false")
    if (category) params.append("category", category)

    const res = await fetch(`${API_BASE_URL}/templates/?${params.toString()}`, { credentials: 'include' })
    const json = await safeJson(res)
    if (!res.ok) return { success: false, error: json?.detail || res.statusText }
    // API returns list — normalize
    return { success: true, data: json }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to get templates' }
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
    const res = await fetch(`${API_BASE_URL}/templates/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: templateData.title,
        description: templateData.description,
        prompt: templateData.prompt,
        category: templateData.category,
        icon: templateData.icon,
        color_scheme: templateData.color_scheme
      })
    })
    const json = await safeJson(res)
    if (!res.ok) return { success: false, error: json?.detail || res.statusText }
    return { success: true, data: json }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to create template' }
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
    const res = await fetch(`${API_BASE_URL}/templates/${encodeURIComponent(templateId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(templateData)
    })
    const json = await safeJson(res)
    if (!res.ok) return { success: false, error: json?.detail || res.statusText }
    return { success: true, data: json }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to update template' }
  }
}

export const deleteTemplate = async (templateId: number): Promise<ApiResponse> => {
  try {
    const res = await fetch(`${API_BASE_URL}/templates/${encodeURIComponent(templateId)}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (!res.ok) {
      const json = await safeJson(res)
      return { success: false, error: json?.detail || res.statusText }
    }
    return { success: true, data: { message: 'Template deleted successfully' } }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to delete template' }
  }
}

export const startAdvancedAnalysis = async (
  fileId: string,
  prompt: string,
  options: {
    sheet?: string
    graphType?: string
    analysisType?: 'skill' | 'gap' | 'dashboard'
    echartSampleCode?: string
    model?: string
  }
): Promise<ApiResponse> => {
  try {
    console.log("API: Starting advanced analysis request...")
    console.log("API: File ID:", fileId)
    console.log("API: Options:", options)
    
    const response = await fetch(`${API_BASE_URL}/analysis/analyze/${encodeURIComponent(fileId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        prompt,
        model: options?.model || 'claude-3-7-sonnet-20250219',
        graph_type: options?.graphType,
        sheet: options?.sheet,
        echart_sample_code: options?.echartSampleCode,
        analysis_type: options?.analysisType || 'dashboard',
      }),
    })
    const data = await safeJson(response)
    if (!response.ok) return { success: false, error: data?.detail || response.statusText }
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to start advanced analysis' }
  }
}
