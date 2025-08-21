"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Bot, Users, FileText, Brain, CheckCircle, TrendingUp, Eye, EyeOff, ToggleLeft, ToggleRight, Settings, Expand, X, RefreshCw, BarChart3, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import FileUpload from "./file-upload"
import UserManagement from "./user-management"
import AIAnalysisGenerator from "./ai-analysis-generator"
import AdvancedAnalysisForm from "./advanced-analysis-form"
import VisualizationLoader from "./visualization-loader"
import EChartsRenderer from "./echarts-renderer"
import EnhancedAdminPanel from "./enhanced-admin-panel"
import DashboardAnalysis from "./dashboard-analysis"
import { toggleAnalysisVisibility } from "@/lib/api"
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

interface AdminDashboardProps {
  user: any
  csvData: any[]
  onDataLoaded: (data: any[], departments: string[], analytics: any) => void
  analyses: any[]
  onAnalysisGenerated: (analysis: any) => void
  users: any[]
  onAddUser: (user: any) => void
  onDeleteUser: (userId: string) => void
}

// Add modal interface
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

export default function AdminDashboard({
  user,
  csvData,
  onDataLoaded,
  analyses: initialAnalyses,
  onAnalysisGenerated,
  users,
  onAddUser,
  onDeleteUser,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("upload")
  const [uploadedFileId, setUploadedFileId] = useState<string>("")
  const [analyses, setAnalyses] = useState<any[]>(initialAnalyses)
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([])
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null)
  const [analysisDetails, setAnalysisDetails] = useState<any>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Load file ID from localStorage on component mount
  useEffect(() => {
    const savedFileId = localStorage.getItem("uploadedFileId")
    if (savedFileId) {
      setUploadedFileId(savedFileId)
    }
  }, [])

  // Load analysis history on component mount
  useEffect(() => {
    loadAnalysisHistory()
  }, [])

  // Load analysis details when selectedAnalysisId changes
  useEffect(() => {
    if (selectedAnalysisId) {
      loadAnalysisDetails(selectedAnalysisId)
    }
  }, [selectedAnalysisId])

  const handleDataLoaded = (data: any[], departments: string[], analytics: any, fileId?: string) => {
    onDataLoaded(data, departments, analytics)
    if (fileId) {
      setUploadedFileId(fileId)
      localStorage.setItem("uploadedFileId", fileId)
    }
  }

  const loadAnalysisHistory = async () => {
    setLoadingHistory(true)
    try {
      const response = await fetch(`${API_BASE_URL}/analysis/history`)
      const data = await response.json()
      
      if (data.success) {
        setAnalysisHistory(data.data || [])
        // Auto-select the most recent analysis
        if (data.data && data.data.length > 0) {
          setSelectedAnalysisId(data.data[0].analysis_id)
        }
      }
    } catch (error) {
      console.error("Failed to load analysis history:", error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const loadAnalysisDetails = async (analysisId: string) => {
    setLoadingDetails(true)
    try {
      const response = await fetch(`${API_BASE_URL}/analysis/result/db/${encodeURIComponent(analysisId)}`)
      const data = await response.json()
      
      if (data.success) {
        setAnalysisDetails(data.data)
        // Store the current analysis_id for viewer dashboard
        localStorage.setItem('currentAnalysisId', analysisId)
      }
    } catch (error) {
      console.error("Failed to load analysis details:", error)
      setAnalysisDetails(null)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleDashboardAnalysisComplete = (dashboardData: any, analysisId?: string) => {
    console.log("Dashboard analysis completed:", dashboardData)
    // Store the analysis_id globally for viewer access if provided
    if (analysisId) {
      localStorage.setItem('currentAnalysisId', analysisId)
    } else {
      console.warn('handleDashboardAnalysisComplete called without an analysisId')
    }
    // Refresh analysis history
    loadAnalysisHistory()
  }

  const getTabIcon = (tabId: string) => {
    switch (tabId) {
      case "upload":
        return <Upload className="h-4 w-4" />
      case "ai-analysis":
        return <Bot className="h-4 w-4" />
      case "advanced-analysis":
        return <Settings className="h-4 w-4" />
      case "users":
        return <Users className="h-4 w-4" />
      case "reports":
        return <FileText className="h-4 w-4" />
      case "dashboard-analysis":
        return <BarChart3 className="h-4 w-4" />
      default:
        return null
    }
  }

  const getAnalysisStats = () => {
    const total = analyses.length
    const recent = analyses.filter((a) => {
      const analysisDate = new Date(a.timestamp)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return analysisDate > dayAgo
    }).length

    return { total, recent }
  }

  // Enhanced helper function for downloading charts with better error handling
  const handleDownloadChart = (analysis: any) => {
    let htmlContent = analysis.visualizationHtml

    // Get consistent analysis ID for download filename
    const analysisId = analysis.analysis_id || analysis.analysisId || analysis.id?.toString() || "unknown"
    const displayId = analysisId.includes('analysis_') ? analysisId.substr(-8) : analysisId

    // If stored separately, try to get from localStorage
    if (htmlContent === "stored_separately") {
      const vizKey = `viz_${analysis.visualizationId || analysis.analysisId}`
      htmlContent = localStorage.getItem(vizKey)
      
      if (!htmlContent) {
        // Try to fetch from backend
        fetch(`${API_BASE_URL}/analysis/visualization/${analysisId}`)
          .then(response => response.text())
          .then(content => {
            const blob = new Blob([content], { type: 'text/html' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${analysis.title.replace(/\s+/g, '_')}_${displayId}.html`
            a.click()
            URL.revokeObjectURL(url)
          })
          .catch(error => {
            console.error("Failed to download from backend:", error)
            alert("Visualization download failed. The file may be too large or temporarily unavailable.")
          })
        return
      }
    }

    if (htmlContent && htmlContent !== "stored_separately") {
      try {
        const blob = new Blob([htmlContent], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${analysis.title.replace(/\s+/g, '_')}_${displayId}.html`
        a.click()
        URL.revokeObjectURL(url)
      } catch (downloadError) {
        console.error("Download error:", downloadError)
        alert("Download failed due to file size limitations.")
      }
    } else {
      alert("Visualization not available for download. It may have been too large to store locally.")
    }
  }

  // Enhanced visibility toggle with better state management
  const handleToggleVisibility = async (analysisId: string, newVisibility: boolean) => {
    try {
      const response = await toggleAnalysisVisibility(analysisId, newVisibility)
      
      if (response.success) {
        // Update local state immediately for better UX
        setAnalyses(prev => prev.map(analysis => {
          const currentId = analysis.analysis_id || analysis.analysisId || analysis.id?.toString()
          if (currentId === analysisId) {
            return { ...analysis, is_visible: newVisibility }
          }
          return analysis
        }))
        
        console.log(`Analysis ${analysisId} visibility updated to: ${newVisibility}`)
      } else {
        console.error('Failed to update visibility:', response.error)
        alert('Failed to update visibility. Please try again.')
      }
    } catch (error) {
      console.error('Error updating visibility:', error)
      alert('Error updating visibility. Please try again.')
    }
  }

  // Add modal state
  const [fullScreenModal, setFullScreenModal] = useState({
    isOpen: false,
    title: '',
    echartCode: ''
  })

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

  // Add history visibility toggle function if not already present
  const handleHistoryVisibilityToggle = async (analysisId: string, currentActive: boolean) => {
    try {
      const response = await toggleAnalysisVisibility(analysisId, !currentActive)
      
      if (response.success) {
        // Update any history state if you have it
        console.log(`History analysis ${analysisId} visibility updated to: ${!currentActive}`)
        
        // Show brief feedback
        const action = !currentActive ? 'public' : 'private'
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

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="animated-bg"></div>

      <div className="relative z-10 flex">
        {/* Sidebar for Analysis History */}
        <div className="w-80 bg-black/30 backdrop-blur-sm border-r border-white/10 h-screen overflow-y-auto">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-white font-semibold flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Analysis History</span>
            </h2>
            <Button
              onClick={loadAnalysisHistory}
              size="sm"
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          <div className="p-4">
            {loadingHistory ? (
              <div className="text-center text-gray-400">
                <Activity className="h-6 w-6 mx-auto mb-2 animate-spin" />
                Loading...
              </div>
            ) : analysisHistory.length === 0 ? (
              <div className="text-center text-gray-400">
                <Brain className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No analyses yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {analysisHistory.map((analysis) => (
                  <div
                    key={analysis.analysis_id}
                    onClick={() => setSelectedAnalysisId(analysis.analysis_id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedAnalysisId === analysis.analysis_id
                        ? 'bg-blue-500/20 border border-blue-500/30'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                        {analysis.analysis_id.substr(-8)}
                      </Badge>
                      <Badge className={`text-xs ${
                        analysis.is_active 
                          ? 'bg-green-500/20 text-green-300 border-green-500/30'
                          : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                      }`}>
                        {analysis.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="text-white text-sm font-medium mb-1">
                      Dashboard Analysis
                    </div>
                    <div className="text-gray-400 text-xs">
                      {new Date(analysis.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white gradient-text-visible">Admin Control Center</h1>
                <p className="text-gray-300 mt-2">Manage data, generate AI insights, and control user access</p>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center space-x-4">
                <div className="glass px-4 py-3 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">{csvData.length}</div>
                      <div className="text-xs text-gray-300">CSV Records</div>
                    </div>
                  </div>
                </div>

                <div className="glass px-4 py-3 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <Brain className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">{analysisHistory.length}</div>
                      <div className="text-xs text-gray-300">Analyses</div>
                    </div>
                  </div>
                </div>

                <div className="glass px-4 py-3 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">
                        {users.filter((u) => u.role === "viewer").length}
                      </div>
                      <div className="text-xs text-gray-300">Viewers</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="glass border-white/20 bg-white/5 p-1">
              <TabsTrigger
                value="upload"
                className="flex items-center space-x-2 data-[state=active]:bg-blue-500/20 data-[state=active]:text-white text-gray-300"
              >
                {getTabIcon("upload")}
                <span>Data Upload</span>
              </TabsTrigger>

              <TabsTrigger
                value="dashboard-analysis"
                className="flex items-center space-x-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-white text-gray-300"
              >
                {getTabIcon("dashboard-analysis")}
                <span>Dashboard Analysis</span>
              </TabsTrigger>

              <TabsTrigger
                value="users"
                className="flex items-center space-x-2 data-[state=active]:bg-green-500/20 data-[state=active]:text-white text-gray-300"
              >
                {getTabIcon("users")}
                <span>User Management</span>
              </TabsTrigger>

              <TabsTrigger
                value="analysis-details"
                className="flex items-center space-x-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-white text-gray-300"
              >
                {getTabIcon("reports")}
                <span>Analysis Details</span>
              </TabsTrigger>
            </TabsList>

            {/* Data Upload Tab */}
            <TabsContent value="upload" className="space-y-6">
              <Card className="glass border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Upload className="h-5 w-5" />
                    <span>File Upload & Management</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FileUpload onDataLoaded={handleDataLoaded} />

                  {/* Display file ID info */}
                  {uploadedFileId && (
                    <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <p className="text-green-300 text-sm">
                        File uploaded successfully (ID: {uploadedFileId.substring(0, 8)}...)
                      </p>
                    </div>
                  )}

                
                </CardContent>
              </Card>
            </TabsContent>

            {/* Dashboard Analysis Tab */}
            <TabsContent value="dashboard-analysis" className="space-y-6">
              <DashboardAnalysis
                uploadedFileId={uploadedFileId}
                onAnalysisComplete={(dashboardData, analysisId) => {
                  handleDashboardAnalysisComplete(dashboardData, analysisId)
                }}
              />
            </TabsContent>

            {/* User Management Tab */}
            <TabsContent value="users" className="space-y-6">
              <UserManagement currentUser={user} users={users} onAddUser={onAddUser} onDeleteUser={onDeleteUser} />
            </TabsContent>

            {/* Analysis Details Tab */}
            <TabsContent value="analysis-details" className="space-y-6">
              {selectedAnalysisId ? (
                <Card className="glass border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Settings className="h-5 w-5" />
                        <span>Analysis Details</span>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                        {selectedAnalysisId.substr(-8)}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingDetails ? (
                      <div className="text-center py-8">
                        <Activity className="h-8 w-8 mx-auto mb-2 animate-spin text-blue-500" />
                        <p className="text-gray-400">Loading analysis details...</p>
                      </div>
                    ) : analysisDetails ? (
                      <div className="space-y-6">
                        {/* Analysis Metadata */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-blue-500/10 rounded-lg">
                            <h4 className="text-blue-300 font-medium mb-1">Analysis ID</h4>
                            <p className="text-white font-mono text-sm">{analysisDetails.analysis_id}</p>
                          </div>
                          <div className="p-3 bg-green-500/10 rounded-lg">
                            <h4 className="text-green-300 font-medium mb-1">Created</h4>
                            <p className="text-white text-sm">
                              {new Date(analysisDetails.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Dashboard Results Summary */}
                        {analysisDetails.dashboard_results && (
                          <div className="space-y-4">
                            <h3 className="text-white font-semibold text-lg">Dashboard Results Summary</h3>
                            
                            {/* Executive Overview */}
                            {analysisDetails.dashboard_results.executive_overview && (
                              <div className="p-4 bg-white/5 rounded-lg">
                                <h4 className="text-white font-medium mb-3">Executive Overview</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-400">Total Employees:</span>
                                    <span className="text-white ml-2">
                                      {analysisDetails.dashboard_results.executive_overview.total_employees || 0}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Avg Performance:</span>
                                    <span className="text-white ml-2">
                                      {analysisDetails.dashboard_results.executive_overview.average_performance || 0}%
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Top Department:</span>
                                    <span className="text-white ml-2">
                                      {analysisDetails.dashboard_results.executive_overview.top_performing_department || 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Trend:</span>
                                    <span className="text-white ml-2 capitalize">
                                      {analysisDetails.dashboard_results.executive_overview.trend_analysis || 'stable'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Set as Active for Viewers */}
                            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-green-300 font-medium">Viewer Access</h4>
                                  <p className="text-green-200 text-sm">Make this analysis visible to viewers</p>
                                </div>
                                <Button
                                  onClick={() => {
                                    localStorage.setItem('currentAnalysisId', selectedAnalysisId)
                                    alert('Analysis set as active for viewers!')
                                  }}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  Set as Active
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <Brain className="h-8 w-8 mx-auto mb-2" />
                        <p>Failed to load analysis details</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="glass border-white/20">
                  <CardContent className="text-center py-12">
                    <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-white text-lg font-medium mb-2">No Analysis Selected</h3>
                    <p className="text-gray-400">Select an analysis from the sidebar to view details</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
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
       