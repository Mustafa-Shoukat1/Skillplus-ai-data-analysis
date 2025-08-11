"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  Target, 
  BarChart, 
  FileSpreadsheet, 
  BarChart3, 
  Zap,
  Loader2,
  Code,
  Eye,
  EyeOff,
  CheckCircle,
  TrendingUp,
  Expand,
  X
} from "lucide-react"
import { 
  getAvailableSheets, 
  startAdvancedAnalysis, 
  getAnalysisStatus, 
  getAnalysisResult,
  toggleAnalysisVisibility,
  getVisibleAnalyses
} from "@/lib/api"
import EChartsRenderer from "./echarts-renderer"
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

interface EnhancedAdminPanelProps {
  uploadedFileId?: string
  onAnalysisGenerated: (analysis: any) => void
}

interface GraphTemplate {
  id: number
  graph_type: string
  graph_name: string
  echart_code: string
  category?: string
}

interface GridConfig {
  id: string
  sheet: string
  graphType: string
  echartCode: string
  prompt: string  // Add prompt field
  isGenerating: boolean
  isCompleted: boolean
  analysisId?: string
  analysisResult?: any
  isActive?: boolean
}

interface CompletedAnalysis {
  analysis_id: string
  title: string
  prompt: string
  timestamp: string
  analysis_type: string
  gridId: string
  graphType: string
  sheet: string
  backendResult?: any
  is_active?: boolean
}

// Add new interface for modal
interface FullScreenModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  echartCode: string
}

// Full screen modal component
const FullScreenModal: React.FC<FullScreenModalProps> = ({ isOpen, onClose, title, echartCode }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm">
      <div className="absolute inset-4 bg-white rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <Button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            variant="ghost"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
        
        {/* Chart Container */}
        <div className="flex-1 p-4">
          <EChartsRenderer 
            optionCode={echartCode}
            height="100%"
            width="100%"
          />
        </div>
      </div>
    </div>
  )
}

export default function EnhancedAdminPanel({ uploadedFileId, onAnalysisGenerated }: EnhancedAdminPanelProps) {
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<'skill-analysis' | 'gap-analysis' | null>(null)
  const [graphTemplates, setGraphTemplates] = useState<GraphTemplate[]>([])
  const [availableSheets, setAvailableSheets] = useState<string[]>([])
  const [sheetsLoading, setSheetsLoading] = useState(false)
  const [completedAnalyses, setCompletedAnalyses] = useState<CompletedAnalysis[]>([])
  
  // 2x2 Grid state - Add prompt to initial state
  const [gridConfigs, setGridConfigs] = useState<GridConfig[]>([
    { id: "grid-1", sheet: "", graphType: "", echartCode: "", prompt: "", isGenerating: false, isCompleted: false },
    { id: "grid-2", sheet: "", graphType: "", echartCode: "", prompt: "", isGenerating: false, isCompleted: false },
    { id: "grid-3", sheet: "", graphType: "", echartCode: "", prompt: "", isGenerating: false, isCompleted: false },
    { id: "grid-4", sheet: "", graphType: "", echartCode: "", prompt: "", isGenerating: false, isCompleted: false }
  ])

  // Modal state
  const [fullScreenModal, setFullScreenModal] = useState({
    isOpen: false,
    title: '',
    echartCode: ''
  })

  // History state
  const [recentHistory, setRecentHistory] = useState<CompletedAnalysis[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Fetch graph templates based on selected analysis type
  useEffect(() => {
    if (selectedAnalysisType) {
      fetchGraphTemplates()
    }
  }, [selectedAnalysisType])

  // Fetch available sheets when uploadedFileId changes
  useEffect(() => {
    if (uploadedFileId) {
      fetchAvailableSheets()
    } else {
      setAvailableSheets([])
    }
  }, [uploadedFileId])

  // Fetch recent history on mount
  useEffect(() => {
    fetchRecentHistory()
  }, [])

  const fetchGraphTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/graph-templates/?page=1&page_size=20&is_active=true`)
      if (response.ok) {
        const data = await response.json()
        // Fix: Extract the graph_templates array from the response
        setGraphTemplates(data.graph_templates || [])
      }
    } catch (error) {
      console.error("Failed to fetch graph templates:", error)
      // Set empty array as fallback
      setGraphTemplates([])
    }
  }

  const fetchAvailableSheets = async () => {
    if (!uploadedFileId) return
    
    setSheetsLoading(true)
    try {
      const response = await getAvailableSheets(uploadedFileId)
      
      if (response.success && response.data) {
        const sheetsData = response.data.data || response.data
        const sheets = sheetsData.sheets || []
        setAvailableSheets(sheets)
        
        // Auto-select first sheet for all grids if available
        if (sheets.length > 0) {
          setGridConfigs(prev => prev.map(grid => ({
            ...grid,
            sheet: grid.sheet || sheets[0]
          })))
        }
      }
    } catch (error) {
      console.error("Failed to load sheets:", error)
      setAvailableSheets([])
    } finally {
      setSheetsLoading(false)
    }
  }

  const fetchRecentHistory = async () => {
    setHistoryLoading(true)
    try {
      const response = await getVisibleAnalyses()
      
      if (response.success && response.data?.data) {
        const historyData = response.data.data.map((item: any) => ({
          analysis_id: item.analysis_id,
          title: `Analysis - ${item.analysis_type || 'General'}`,
          prompt: item.query || '',
          timestamp: new Date(item.created_at).toLocaleString(),
          analysis_type: item.analysis_type || 'general',
          gridId: `history-${item.analysis_id}`,
          graphType: 'auto',
          sheet: 'auto',
          backendResult: {
            designed_echart_code: item.designed_echart_code,
            echart_code: item.echart_code,
            response_df: item.response_df
          },
          is_active: item.is_active
        }))
        
        setRecentHistory(historyData)
      }
    } catch (error) {
      console.error("Failed to fetch recent history:", error)
    } finally {
      setHistoryLoading(false)
    }
  }

  const updateGridConfig = (gridId: string, field: keyof GridConfig, value: string | boolean) => {
    setGridConfigs(prev => prev.map(grid => {
      if (grid.id === gridId) {
        const updatedGrid = { ...grid, [field]: value }
        
        // If graph type is changed, update the echart code
        if (field === 'graphType' && typeof value === 'string' && value) {
          const template = graphTemplates.find(t => t.graph_type === value)
          if (template) {
            updatedGrid.echartCode = template.echart_code
          }
        }
        
        return updatedGrid
      }
      return grid
    }))
  }

  const generateAnalysis = async (gridId: string) => {
    const grid = gridConfigs.find(g => g.id === gridId)
    if (!grid || !grid.sheet || !grid.graphType || !grid.prompt.trim() || !uploadedFileId || !selectedAnalysisType) {
      alert("Please fill all required fields (sheet, graph type, prompt) and ensure a file is uploaded")
      return
    }

    // Set generating state
    setGridConfigs(prev => prev.map(g => 
      g.id === gridId ? { ...g, isGenerating: true } : g
    ))

    try {
      // Use the grid's custom prompt instead of a generic one
      const response = await startAdvancedAnalysis(uploadedFileId, grid.prompt, {
        sheet: grid.sheet,
        graphType: grid.graphType,
        analysisType: selectedAnalysisType === 'skill-analysis' ? 'skill' : selectedAnalysisType === 'gap-analysis' ? 'gap' : undefined,
        echartSampleCode: grid.echartCode
      })

      if (response.success) {
        const taskId = response.data.task_id
        const analysisId = response.data.analysis_id
        
        console.log(`Analysis started for ${gridId}:`, { taskId, analysisId })
        
        // Poll for completion
        await pollAnalysisCompletion(taskId, analysisId, gridId, grid)
      } else {
        throw new Error(response.error || 'Analysis failed')
      }
    } catch (error) {
      console.error("Error generating analysis:", error)
      alert(`Failed to generate analysis: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      // Reset generating state
      setGridConfigs(prev => prev.map(g => 
        g.id === gridId ? { ...g, isGenerating: false } : g
      ))
    }
  }

  const pollAnalysisCompletion = async (taskId: string, analysisId: string, gridId: string, grid: GridConfig) => {
    const maxAttempts = 60
    const intervalMs = 3000

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const statusResponse = await getAnalysisStatus(taskId)
        
        if (statusResponse.success) {
          const status = statusResponse.data.status
          
          if (status === "completed") {
            const resultResponse = await getAnalysisResult(taskId)
            
            if (resultResponse.success) {
              const result = resultResponse.data
              
              // Update grid state
              setGridConfigs(prev => prev.map(g => 
                g.id === gridId ? {
                  ...g,
                  isCompleted: true,
                  analysisId: analysisId,
                  analysisResult: result,
                  isActive: true
                } : g
              ))
              
              // Add to completed analyses
              const completedAnalysis: CompletedAnalysis = {
                analysis_id: analysisId,
                title: `${selectedAnalysisType!.replace('-', ' ')} - ${grid.sheet}`,
                prompt: `Generate ${selectedAnalysisType!.replace('-', ' ')} for ${grid.sheet} using ${grid.graphType}`,
                timestamp: new Date().toLocaleString(),
                analysis_type: selectedAnalysisType!,
                gridId: gridId,
                graphType: grid.graphType,
                sheet: grid.sheet,
                backendResult: result,
                is_active: true
              }
              
              setCompletedAnalyses(prev => [...prev, completedAnalysis])
              
              // Call the callback if provided
              if (onAnalysisGenerated) {
                onAnalysisGenerated({
                  id: analysisId,
                  analysis_id: analysisId,
                  title: completedAnalysis.title,
                  prompt: completedAnalysis.prompt,
                  insights: "Analysis completed successfully",
                  timestamp: completedAnalysis.timestamp,
                  type: selectedAnalysisType,
                  queryType: 'visualization',
                  hasVisualization: !!result.designed_echart_code,
                  visualizationHtml: result.designed_echart_code,
                  is_active: true,
                  success: true,
                  executionSuccess: true,
                  backendResult: result,
                  gridId: gridId,
                  graphType: grid.graphType,
                  sheet: grid.sheet
                })
              }
              break
            }
          } else if (status === "failed") {
            throw new Error("Analysis failed")
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, intervalMs))
      } catch (error) {
        console.error("Polling error:", error)
        break
      }
    }
  }

  const handleVisibilityToggle = async (analysisId: string, currentActive: boolean) => {
    try {
      const response = await toggleAnalysisVisibility(analysisId, !currentActive)
      
      if (response.success) {
        // Update grid configs
        setGridConfigs(prev => prev.map(grid => 
          grid.analysisId === analysisId ? { ...grid, isActive: !currentActive } : grid
        ))
        
        // Update completed analyses
        setCompletedAnalyses(prev => prev.map(analysis => 
          analysis.analysis_id === analysisId ? { ...analysis, is_active: !currentActive } : analysis
        ))
        
        console.log(`Analysis ${analysisId} visibility updated to: ${!currentActive}`)
      } else {
        console.error('Failed to update visibility:', response.error)
        alert('Failed to update visibility. Please try again.')
      }
    } catch (error) {
      console.error('Error updating visibility:', error)
      alert('Error updating visibility. Please try again.')
    }
  }

  // Add new function for history visibility toggle
  const handleHistoryVisibilityToggle = async (analysisId: string, currentActive: boolean) => {
    try {
      const response = await toggleAnalysisVisibility(analysisId, !currentActive)
      
      if (response.success) {
        // Update recent history state
        setRecentHistory(prev => prev.map(analysis => 
          analysis.analysis_id === analysisId ? { ...analysis, is_active: !currentActive } : analysis
        ))
        
        console.log(`History analysis ${analysisId} visibility updated to: ${!currentActive}`)
        
        // Show brief feedback
        const action = !currentActive ? 'public' : 'private'
        // You can add a toast notification here if you have a toast system
        console.log(`Analysis is now ${action}`)
      } else {
        console.error('Failed to update history visibility:', response.error)
        alert('Failed to update visibility. Please try again.')
      }
    } catch (error) {
      console.error('Error updating history visibility:', error)
      alert('Error updating visibility. Please try again.')
    }
  }

  const formatEChartCode = (code: string) => {
    try {
      const parsed = JSON.parse(code)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return code
    }
  }

  const getAnalysisTypeColor = (type: string) => {
    return type === 'skill-analysis' 
      ? 'from-blue-500 to-cyan-500' 
      : 'from-purple-500 to-pink-500'
  }

  const getAnalysisTypeIcon = (type: string) => {
    return type === 'skill-analysis' 
      ? <Target className="h-5 w-5" />
      : <BarChart className="h-5 w-5" />
  }

  // Function to open full screen modal
  const openFullScreen = (title: string, echartCode: string) => {
    setFullScreenModal({
      isOpen: true,
      title,
      echartCode
    })
  }

  // Function to close modal
  const closeFullScreen = () => {
    setFullScreenModal({
      isOpen: false,
      title: '',
      echartCode: ''
    })
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="animated-bg"></div>

      <div className="relative z-10 flex">
        {/* Sidebar */}
        <aside className="w-80 bg-slate-50 border-r border-gray-200 overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Analysis Types</h3>
            <div className="space-y-3">
              <div
                onClick={() => setSelectedAnalysisType('skill-analysis')}
                className={`relative group cursor-pointer transition-all duration-200 ${
                  selectedAnalysisType === 'skill-analysis' ? 'transform scale-105' : ''
                }`}
              >
                <div className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedAnalysisType === 'skill-analysis'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-r from-blue-500 to-cyan-500`}>
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Skill Analysis</h4>
                      <p className="text-sm text-gray-600">Analyze skill distributions and competency levels</p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSelectedAnalysisType('gap-analysis')}
                className={`relative group cursor-pointer transition-all duration-200 ${
                  selectedAnalysisType === 'gap-analysis' ? 'transform scale-105' : ''
                }`}
              >
                <div className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedAnalysisType === 'gap-analysis'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500`}>
                      <BarChart className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Gap Analysis</h4>
                      <p className="text-sm text-gray-600">Identify gaps and compare current vs target levels</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* File Status */}
          <div className="p-6 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">File Status</h4>
            <div className={`p-3 rounded-lg ${uploadedFileId ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${uploadedFileId ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`text-sm font-medium ${uploadedFileId ? 'text-green-700' : 'text-red-700'}`}>
                  {uploadedFileId ? 'File Uploaded' : 'No File Uploaded'}
                </span>
              </div>
              {uploadedFileId && (
                <p className="text-xs text-green-600 mt-1">
                  ID: {uploadedFileId.substring(0, 8)}...
                </p>
              )}
            </div>
          </div>

          {/* Recent History Section - ENHANCED */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Recent History
              </h4>
              <Button
                size="sm"
                onClick={fetchRecentHistory}
                disabled={historyLoading}
                className="p-1 bg-blue-500 hover:bg-blue-600 text-white"
              >
                {historyLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <TrendingUp className="h-3 w-3" />
                )}
              </Button>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {historyLoading ? (
                <div className="text-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-gray-400" />
                  <p className="text-xs text-gray-400 mt-1">Loading history...</p>
                </div>
              ) : recentHistory.length > 0 ? (
                recentHistory.slice(0, 5).map((analysis) => (
                  <div key={analysis.analysis_id} className="p-3 border border-gray-200 rounded-lg bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <Badge className={`bg-gradient-to-r ${getAnalysisTypeColor(analysis.analysis_type)} text-white border-0 text-xs`}>
                          {analysis.analysis_type.replace('-', ' ')}
                        </Badge>
                        {/* Truncated prompt with tooltip */}
                        <p 
                          className="text-xs font-medium text-gray-900 mt-1 truncate cursor-help" 
                          title={analysis.prompt}
                        >
                          {analysis.prompt.length > 10 ? `${analysis.prompt.substring(0, 10)}...` : analysis.prompt}
                        </p>
                        <p className="text-xs text-gray-500">{analysis.timestamp}</p>
                      </div>
                      
                      {/* Action buttons container */}
                      <div className="flex items-center space-x-1 ml-2">
                        {/* View button for visualization */}
                        {analysis.backendResult?.designed_echart_code && (
                          <Button
                            size="sm"
                            onClick={() => openFullScreen(analysis.title, analysis.backendResult.designed_echart_code)}
                            className="p-1 bg-purple-500 hover:bg-purple-600 text-white"
                            title="View chart"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                        
                        {/* Public/Private toggle button */}
                        <Button
                          size="sm"
                          onClick={() => handleHistoryVisibilityToggle(analysis.analysis_id, analysis.is_active !== false)}
                          className={`p-1 ${
                            analysis.is_active !== false 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
                          }`}
                          title={analysis.is_active !== false ? 'Make private' : 'Make public'}
                        >
                          {analysis.is_active !== false ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Status indicator */}
                    <div className="flex items-center justify-between">
                      <div className={`text-xs ${analysis.is_active !== false ? 'text-green-600' : 'text-gray-500'}`}>
                        {analysis.is_active !== false ? '🌍 Public' : '🔒 Private'}
                      </div>
                      {analysis.backendResult?.designed_echart_code && (
                        <div className="text-xs text-purple-600">📊 Has Chart</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-gray-400">No recent history</p>
                </div>
              )}
            </div>
          </div>

          {/* Completed Analyses */}
          {completedAnalyses.length > 0 && (
            <div className="p-6">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Current Session ({completedAnalyses.length})
              </h4>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {completedAnalyses.map((analysis) => (
                  <div key={analysis.analysis_id} className="p-3 border border-gray-200 rounded-lg bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <Badge className={`bg-gradient-to-r ${getAnalysisTypeColor(analysis.analysis_type)} text-white border-0 text-xs`}>
                          {analysis.analysis_type.replace('-', ' ')}
                        </Badge>
                        <p className="text-sm font-medium text-gray-900 mt-1">{analysis.sheet}</p>
                        <p className="text-xs text-gray-500">{analysis.timestamp}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleVisibilityToggle(analysis.analysis_id, analysis.is_active !== false)}
                        className={`p-1 ${
                          analysis.is_active !== false 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-gray-600 hover:bg-gray-700'
                        }`}
                      >
                        {analysis.is_active !== false ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {!selectedAnalysisType ? (
            <Card className="glass border-white/20">
              <CardContent className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Select Analysis Type</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  Choose either Skill Analysis or Gap Analysis from the sidebar to begin configuring your charts and generating insights.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 bg-gradient-to-r ${getAnalysisTypeColor(selectedAnalysisType)} rounded-lg flex items-center justify-center`}>
                  {getAnalysisTypeIcon(selectedAnalysisType)}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white gradient-text-visible">
                    {selectedAnalysisType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h1>
                  <p className="text-gray-300">
                    {selectedAnalysisType === 'skill-analysis' 
                      ? 'Analyze current skill levels, distributions, and strengths across your organization.'
                      : 'Identify skill gaps, compare current vs required levels, and track improvement progress.'
                    }
                  </p>
                </div>
              </div>

              {/* 2x2 Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {gridConfigs.map((grid, index) => (
                  <Card key={grid.id} className="glass border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 bg-gradient-to-br ${getAnalysisTypeColor(selectedAnalysisType)} rounded-lg flex items-center justify-center`}>
                            <span className="text-white font-bold text-sm">{index + 1}</span>
                          </div>
                          <span>Custom Chart {index + 1}</span>
                        </div>
                        {grid.isCompleted && (
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                            <Button
                              size="sm"
                              onClick={() => handleVisibilityToggle(grid.analysisId!, grid.isActive !== false)}
                              className={`p-1 ${
                                grid.isActive !== false 
                                  ? 'bg-green-600 hover:bg-green-700' 
                                  : 'bg-gray-600 hover:bg-gray-700'
                              }`}
                            >
                              {grid.isActive !== false ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            </Button>
                          </div>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Sheet Selection */}
                      <div className="space-y-3">
                        <Label className="text-white font-semibold text-sm flex items-center space-x-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          <span>Data Sheet</span>
                          {availableSheets.length > 0 && (
                            <span className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded-full">
                              {availableSheets.length} available
                            </span>
                          )}
                        </Label>
                        <Select 
                          value={grid.sheet} 
                          onValueChange={(value) => updateGridConfig(grid.id, 'sheet', value)}
                          disabled={sheetsLoading || !uploadedFileId || grid.isGenerating}
                        >
                          <SelectTrigger className="glass border-white/30 text-white bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-200 h-12 text-base">
                            <SelectValue 
                              placeholder={
                                !uploadedFileId ? "Upload a file first" :
                                sheetsLoading ? "Loading sheets..." : 
                                availableSheets.length === 0 ? "No sheets available" :
                                "Choose a data sheet"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900/95 border-white/20 backdrop-blur-md shadow-2xl">
                            {availableSheets.map((sheet, sheetIndex) => (
                              <SelectItem 
                                key={sheetIndex} 
                                value={sheet}
                                className="text-white hover:bg-white/10 focus:bg-white/15 py-3 cursor-pointer"
                              >
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                                  <span className="font-medium">{sheet}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Graph Type Selection */}
                      <div className="space-y-3">
                        <Label className="text-white font-semibold text-sm flex items-center space-x-2">
                          <BarChart3 className="h-4 w-4" />
                          <span>Visualization Type</span>
                          {graphTemplates.length > 0 && (
                            <span className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded-full">
                              {graphTemplates.length} types
                            </span>
                          )}
                        </Label>
                        <Select 
                          value={grid.graphType} 
                          onValueChange={(value) => updateGridConfig(grid.id, 'graphType', value)}
                          disabled={grid.isGenerating}
                        >
                          <SelectTrigger className="glass border-white/30 text-white bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-200 h-12 text-base">
                            <SelectValue 
                              placeholder={
                                graphTemplates.length === 0 ? "No graph types available" :
                                "Choose visualization type"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900/95 border-white/20 backdrop-blur-md shadow-2xl max-h-80">
                            {graphTemplates.map((template) => (
                              <SelectItem 
                                key={template.graph_type} 
                                value={template.graph_type}
                                className="text-white hover:bg-white/10 focus:bg-white/15 py-4 cursor-pointer"
                              >
                                <div className="flex flex-col space-y-1 w-full">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-4 h-4 rounded bg-gradient-to-r from-purple-500 to-blue-500"></div>
                                    <span className="font-semibold text-base">{template.graph_name}</span>
                                  </div>
                                  {template.category && (
                                    <span className="text-xs text-gray-400 ml-7 leading-relaxed capitalize">
                                      {template.category.replace('-', ' ')} category
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Prompt Input - NEW */}
                      <div className="space-y-3">
                        <Label className="text-white font-semibold text-sm flex items-center space-x-2">
                          <Code className="h-4 w-4" />
                          <span>Analysis Prompt</span>
                          <span className="text-xs text-red-400 bg-red-500/20 px-2 py-1 rounded-full">
                            Required
                          </span>
                        </Label>
                        <Textarea
                          value={grid.prompt}
                          onChange={(e) => updateGridConfig(grid.id, 'prompt', e.target.value)}
                          placeholder={`Enter your ${selectedAnalysisType?.replace('-', ' ')} prompt for ${grid.sheet || 'selected sheet'}...

Examples:
• "Analyze skill distribution across departments"
• "Identify top performers in communication skills"
• "Show training gaps by department"`}
                          disabled={grid.isGenerating || grid.isCompleted}
                          className="glass border-white/20 text-white placeholder-gray-400 bg-white/5 backdrop-blur-sm min-h-[120px] resize-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                          rows={5}
                        />
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">Be specific about what insights you want</span>
                          <span className={`${grid.prompt.length < 10 ? 'text-red-400' : 'text-green-400'}`}>
                            {grid.prompt.length} chars {grid.prompt.length < 10 ? '(minimum 10)' : ''}
                          </span>
                        </div>
                      </div>

                      {/* EChart Code Display */}
                      {grid.echartCode && (
                        <div className="space-y-2">
                          <Label className="text-white font-semibold text-sm flex items-center space-x-1">
                            <Code className="h-4 w-4" />
                            <span>ECharts Configuration</span>
                          </Label>
                          <Textarea
                            value={formatEChartCode(grid.echartCode)}
                            readOnly
                            className="glass border-white/20 text-gray-300 font-mono text-xs min-h-[150px] resize-none"
                            placeholder="ECharts code will appear here when you select a graph type..."
                          />
                        </div>
                      )}

                      {/* Generate Analysis Button */}
                      <Button
                        onClick={() => generateAnalysis(grid.id)}
                        disabled={!grid.sheet || !grid.graphType || !grid.prompt.trim() || !uploadedFileId || grid.isGenerating || grid.isCompleted}
                        className={`w-full font-medium ${
                          grid.isCompleted 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : `bg-gradient-to-r ${getAnalysisTypeColor(selectedAnalysisType)} hover:opacity-90`
                        }`}
                      >
                        {grid.isGenerating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating Analysis...
                          </>
                        ) : grid.isCompleted ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Analysis Completed
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Generate Analysis
                          </>
                        )}
                      </Button>

                      {/* Status indicator - Updated */}
                      {(!uploadedFileId || !grid.sheet || !grid.graphType || !grid.prompt.trim()) && (
                        <div className="text-center py-2 space-y-1">
                          {!uploadedFileId && (
                            <p className="text-red-400 text-sm">⚠️ Please upload a file first</p>
                          )}
                          {uploadedFileId && !grid.sheet && (
                            <p className="text-yellow-400 text-sm">📋 Please select a data sheet</p>
                          )}
                          {uploadedFileId && !grid.graphType && (
                            <p className="text-yellow-400 text-sm">📊 Please choose a visualization type</p>
                          )}
                          {uploadedFileId && grid.sheet && grid.graphType && !grid.prompt.trim() && (
                            <p className="text-yellow-400 text-sm">✍️ Please enter an analysis prompt</p>
                          )}
                        </div>
                      )}

                      {/* Chart Preview for completed analyses - ENHANCED */}
                      {grid.isCompleted && grid.analysisResult?.designed_echart_code && grid.isActive !== false && (
                        <div className="bg-white rounded-lg p-2">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-800 text-sm">Chart Preview</h4>
                            <div className="flex items-center space-x-2">
                              <Badge className="bg-green-500/20 text-green-600 text-xs">
                                <Eye className="h-3 w-3 mr-1" />
                                Public
                              </Badge>
                              <Button
                                size="sm"
                                onClick={() => openFullScreen(
                                  `Chart ${index + 1} - ${selectedAnalysisType.replace('-', ' ')}`,
                                  grid.analysisResult.designed_echart_code
                                )}
                                className="p-1 bg-purple-500 hover:bg-purple-600 text-white"
                                title="Expand to full screen"
                              >
                                <Expand className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <EChartsRenderer 
                            optionCode={grid.analysisResult.designed_echart_code}
                            height="200px"
                          />
                        </div>
                      )}

                      {grid.isCompleted && grid.isActive === false && (
                        <div className="p-3 bg-gray-500/10 rounded-lg border border-gray-500/20">
                          <div className="flex items-center space-x-2 text-gray-400">
                            <EyeOff className="h-4 w-4" />
                            <span className="font-medium text-sm">Chart Hidden</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            This analysis is private and not visible to viewers.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Screen Modal */}
      <FullScreenModal
        isOpen={fullScreenModal.isOpen}
        onClose={closeFullScreen}
        title={fullScreenModal.title}
        echartCode={fullScreenModal.echartCode}
      />
    </div>
  )
}