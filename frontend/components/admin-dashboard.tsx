"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Bot, Users, FileText, Brain, CheckCircle, TrendingUp, Eye, EyeOff, ToggleLeft, ToggleRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import FileUpload from "./file-upload"
import UserManagement from "./user-management"
import AIAnalysisGenerator from "./ai-analysis-generator"
import VisualizationLoader from "./visualization-loader"
import { toggleAnalysisVisibility } from "@/lib/api"

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

  // Load file ID from localStorage on component mount
  useState(() => {
    const savedFileId = localStorage.getItem("uploadedFileId")
    if (savedFileId) {
      setUploadedFileId(savedFileId)
    }
  })

  const handleDataLoaded = (data: any[], departments: string[], analytics: any, fileId?: string) => {
    onDataLoaded(data, departments, analytics)
    if (fileId) {
      setUploadedFileId(fileId)
      localStorage.setItem("uploadedFileId", fileId)
    }
  }

  const getTabIcon = (tabId: string) => {
    switch (tabId) {
      case "upload":
        return <Upload className="h-4 w-4" />
      case "ai-analysis":
        return <Bot className="h-4 w-4" />
      case "users":
        return <Users className="h-4 w-4" />
      case "reports":
        return <FileText className="h-4 w-4" />
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

  const stats = getAnalysisStats()

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
        fetch(`http://localhost:8000/api/analysis/visualization/${analysisId}`)
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

  // NEW: Handle visibility toggle
  const handleToggleVisibility = async (analysisId: string, newVisibility: boolean) => {
    try {
      const response = await toggleAnalysisVisibility(analysisId, newVisibility)
      
      if (response.success) {
        // Update local state
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

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="animated-bg"></div>

      <div className="relative z-10 p-6">
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
                    <div className="text-lg font-bold text-white">{stats.total}</div>
                    <div className="text-xs text-gray-300">AI Analyses</div>
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

        {/* Main Content */}
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
              value="ai-analysis"
              className="flex items-center space-x-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-white text-gray-300"
            >
              {getTabIcon("ai-analysis")}
              <span>AI Analysis</span>
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="flex items-center space-x-2 data-[state=active]:bg-green-500/20 data-[state=active]:text-white text-gray-300"
            >
              {getTabIcon("users")}
              <span>User Management</span>
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="flex items-center space-x-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-white text-gray-300"
            >
              {getTabIcon("reports")}
              <span>Analysis Reports</span>
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
                      ✅ File uploaded successfully (ID: {uploadedFileId.substring(0, 8)}...)
                    </p>
                  </div>
                )}

                {csvData.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Data Preview</h3>
                    <div className="glass rounded-lg overflow-hidden">
                      <div className="overflow-x-auto max-h-96">
                        <table className="min-w-full">
                          <thead className="bg-white/10">
                            <tr>
                              {Object.keys(csvData[0] || {}).map((key) => (
                                <th
                                  key={key}
                                  className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                                >
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {csvData.slice(0, 5).map((row, index) => (
                              <tr key={index} className="hover:bg-white/5">
                                {Object.values(row).map((value: any, i) => (
                                  <td key={i} className="px-4 py-3 text-sm text-gray-300">
                                    {String(value)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {csvData.length > 5 && (
                        <div className="bg-white/5 px-4 py-3 text-sm text-gray-400">
                          Showing 5 of {csvData.length} records
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Analysis Tab */}
          <TabsContent value="ai-analysis" className="space-y-6">
            <AIAnalysisGenerator 
              csvData={csvData} 
              onAnalysisGenerated={onAnalysisGenerated} 
              analyses={analyses}
              uploadedFileId={uploadedFileId}
            />
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <UserManagement currentUser={user} users={users} onAddUser={onAddUser} onDeleteUser={onDeleteUser} />
          </TabsContent>

          {/* Reports Tab - ENHANCED with visibility toggle */}
          <TabsContent value="reports" className="space-y-6">
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Analysis Reports</span>
                </CardTitle>
                <p className="text-gray-400">Manage analysis visibility for viewer dashboard</p>
              </CardHeader>
              <CardContent>
                {analyses.length === 0 ? (
                  <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-white mb-2">No analyses generated yet</h3>
                    <p className="text-gray-400">Use the AI Analysis tab to generate your first report</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analyses.map((analysis, index) => {
                      // Get consistent analysis ID
                      const analysisId = analysis.analysis_id || analysis.analysisId || analysis.id?.toString() || `temp_${index}`
                      const displayId = analysisId.includes('analysis_') ? analysisId.substr(-8) : analysisId
                      const isVisible = analysis.is_visible !== false // Default to true if not set
                      
                      return (
                        <div key={analysisId} className="glass rounded-lg p-4 border-white/10">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-lg font-semibold text-white">{analysis.title}</h3>
                                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 font-mono text-xs">
                                  ID: {displayId}
                                </Badge>
                                {analysis.templateId && (
                                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                                    Template: {analysis.templateName || analysis.templateId}
                                  </Badge>
                                )}
                                {/* NEW: Visibility Toggle */}
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleToggleVisibility(analysisId, !isVisible)}
                                    className={`flex items-center space-x-1 ${isVisible ? 'text-green-400 hover:text-green-300' : 'text-gray-500 hover:text-gray-400'}`}
                                  >
                                    {isVisible ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                                    <span className="text-xs">{isVisible ? 'Visible' : 'Hidden'}</span>
                                  </Button>
                                </div>
                              </div>
                              <p className="text-gray-400 text-sm">{analysis.prompt}</p>
                              
                              {/* Analysis Metadata */}
                              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                <span>Type: {analysis.queryType || analysis.type}</span>
                                <span>Data Points: {analysis.dataPoints}</span>
                                {analysis.hasVisualization && (
                                  <span className="text-purple-400">📊 Has Visualization</span>
                                )}
                                {analysis.executionSuccess && (
                                  <span className="text-green-400">✅ Executed Successfully</span>
                                )}
                                {/* Visibility Status */}
                                <span className={`flex items-center space-x-1 ${isVisible ? 'text-green-400' : 'text-red-400'}`}>
                                  {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                  <span>{isVisible ? 'Public' : 'Private'}</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Generated
                              </Badge>
                              <span className="text-xs text-gray-400">{analysis.timestamp}</span>
                            </div>
                          </div>

                          {/* Only show content if visible or in admin view */}
                          <div className={`${!isVisible ? 'opacity-50' : ''}`}>
                            {/* Analysis Results */}
                            {analysis.insights && (
                              <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <h4 className="font-semibold text-blue-300 mb-1 flex items-center">
                                  <Brain className="h-4 w-4 mr-1" />
                                  AI Insights
                                </h4>
                                <p className="text-blue-200 text-sm">{analysis.insights}</p>
                              </div>
                            )}

                            {/* Show visualization if available */}
                            {analysis.visualizationHtml && (
                              <div className="mt-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                <h4 className="font-semibold text-purple-300 mb-2 flex items-center">
                                  <TrendingUp className="h-4 w-4 mr-1" />
                                  Visualization
                                  {!isVisible && (
                                    <Badge className="ml-2 bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                                      Hidden from Viewers
                                    </Badge>
                                  )}
                                </h4>
                                <div className="bg-white rounded-lg p-2 mb-2">
                                  {analysis.visualizationHtml === "stored_separately" ? (
                                    <VisualizationLoader analysisId={analysis.visualizationId || analysis.analysisId} />
                                  ) : (
                                    <iframe
                                      srcDoc={analysis.visualizationHtml}
                                      className="w-full h-64 border-0 rounded"
                                      sandbox="allow-scripts allow-same-origin"
                                      title={`Visualization for ${analysis.title}`}
                                    />
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleDownloadChart(analysis)}
                                  className="bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Download Chart
                                </Button>
                              </div>
                            )}

                            {/* Generated Code Preview */}
                            {analysis.generatedCode && (
                              <details className="mt-3">
                                <summary className="cursor-pointer text-gray-300 hover:text-white">
                                  View Generated Code
                                </summary>
                                <div className="mt-2 p-3 bg-gray-500/10 rounded-lg border border-gray-500/20">
                                  <pre className="text-gray-300 text-xs overflow-x-auto max-h-32">
                                    <code>{analysis.generatedCode}</code>
                                  </pre>
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
