"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, Brain, Calendar, TrendingUp, AlertCircle, Loader2, RefreshCw, ClipboardCheck, BookOpen, Target, BarChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import ComingSoonModal from "./coming-soon-modal"

interface ViewerDashboardProps {
  user: any
}

interface ActiveAnalysis {
  analysis_id: string
  user_query: string
  summary: string
  query_type: string
  success: boolean
  visualization_created: boolean
  visualization_html: string | null
  created_at: string
  is_active: boolean
}

const VIEWER_DISABLED_FEATURES = [
  {
    id: "conduct_assessment",
    name: "Conduct Assessment",
    icon: <ClipboardCheck className="h-5 w-5" />,
    description:
      "Create and manage comprehensive skill assessments for your team members. Design custom evaluation criteria and track assessment results over time.",
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "training_plan",
    name: "Training Plan",
    icon: <BookOpen className="h-5 w-5" />,
    description:
      "Generate personalized training plans based on skill gaps and career goals. Access curated learning resources and track training progress.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "performance_tracking",
    name: "Performance Tracking",
    icon: <TrendingUp className="h-5 w-5" />,
    description:
      "Monitor employee performance metrics in real-time. Set goals, track milestones, and generate detailed performance reports.",
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "skill_analysis",
    name: "Skill Analysis",
    icon: <Target className="h-5 w-5" />,
    description:
      "Analyze skill distributions and competency levels across your organization. Identify skill gaps and development opportunities.",
    color: "from-orange-500 to-red-500",
  },
  {
    id: "gap_analysis",
    name: "Gap Analysis",
    icon: <BarChart className="h-5 w-5" />,
    description:
      "Perform comprehensive gap analysis to identify areas for improvement. Compare current performance against desired targets.",
    color: "from-indigo-500 to-purple-500",
  },
]

// Enhanced Visualization Display Component
const VisualizationDisplay = ({ 
  analysisId, 
  visualizationHtml 
}: { 
  analysisId: string
  visualizationHtml: string | null
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [htmlContent, setHtmlContent] = useState<string | null>(visualizationHtml)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (visualizationHtml) {
      setHtmlContent(visualizationHtml)
      setError(null)
    } else if (analysisId) {
      fetchVisualizationFromAPI()
    }
  }, [analysisId, visualizationHtml])

  const fetchVisualizationFromAPI = async () => {
    if (!analysisId || analysisId === "unknown") return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`http://localhost:8000/api/analysis/visualization/${analysisId}`)
      
      if (response.ok) {
        const content = await response.text()
        if (content && content.trim().length > 100) {
          setHtmlContent(content)
        } else {
          setError("Empty visualization content")
        }
      } else {
        setError(`Failed to fetch visualization (${response.status})`)
      }
    } catch (err) {
      console.error("Failed to fetch visualization:", err)
      setError("Network error while fetching visualization")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading visualization...</p>
        </div>
      </div>
    )
  }

  if (error || !htmlContent) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded">
        <div className="text-center text-gray-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>📊 Visualization not available</p>
          <p className="text-sm mt-1">{error || "No visualization data found"}</p>
          {analysisId && (
            <Button 
              onClick={fetchVisualizationFromAPI} 
              size="sm"
              className="mt-2 bg-purple-500 text-white hover:bg-purple-600"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry Load
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Expanded view (full screen)
  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 bg-white">
        {/* Header bar for expanded view */}
        <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Visualization - {analysisId}</h3>
          <Button
            onClick={() => setExpanded(false)}
            size="sm"
            className="bg-gray-700 text-white hover:bg-gray-600"
          >
            <Eye className="h-4 w-4 mr-2" />
            Exit Full Screen
          </Button>
        </div>
        
        {/* Full screen iframe */}
        <iframe
          srcDoc={htmlContent}
          className="w-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title={`Full Screen Visualization for ${analysisId}`}
          style={{ height: 'calc(100vh - 80px)', background: 'white' }}
        />
      </div>
    )
  }

  // Normal view
  return (
    <div className="w-full bg-white rounded overflow-hidden relative">
      <iframe
        srcDoc={htmlContent}
        className="w-full h-64 border-0"
        sandbox="allow-scripts allow-same-origin"
        title={`Visualization for ${analysisId}`}
        style={{ minHeight: '256px', background: 'white' }}
      />
      <Button
        onClick={() => setExpanded(true)}
        size="sm"
        className="absolute top-2 right-2 z-10 bg-purple-500 text-white hover:bg-purple-600"
      >
        <Eye className="h-4 w-4 mr-1" />
        Expand
      </Button>
    </div>
  )
}

export default function ViewerDashboard({ user }: ViewerDashboardProps) {
  const [activeAnalyses, setActiveAnalyses] = useState<ActiveAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeModal, setActiveModal] = useState<string | null>(null)

  // Fetch active analyses from the API
  const fetchActiveAnalyses = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log("🔍 Fetching active analyses from API...")
      const response = await fetch('http://localhost:8000/api/analysis/active')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log("✅ Active analyses response:", result)
      
      if (result.success && Array.isArray(result.data)) {
        setActiveAnalyses(result.data)
        console.log(`📊 Loaded ${result.data.length} active analyses`)
      } else {
        console.warn("⚠️ Unexpected response format:", result)
        setActiveAnalyses([])
      }
    } catch (err) {
      console.error("❌ Failed to fetch active analyses:", err)
      setError(err instanceof Error ? err.message : 'Failed to load analyses')
      setActiveAnalyses([])
    } finally {
      setLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    fetchActiveAnalyses()
  }, [])

  const handleFeatureClick = (featureId: string) => {
    setActiveModal(featureId)
  }

  const getActiveModalData = () => {
    return VIEWER_DISABLED_FEATURES.find((feature) => feature.id === activeModal)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="animated-bg"></div>
        <div className="relative z-10">
          <div className="w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-white mt-4">Loading analyses...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen relative overflow-hidden flex">
        {/* Sidebar */}
        <aside className="w-80 bg-slate-50 border-r border-gray-200 overflow-y-auto">
          {/* Advanced Features for Viewer */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Advanced Features</h3>
            <div className="space-y-3">
              {VIEWER_DISABLED_FEATURES.map((feature) => (
                <div
                  key={feature.id}
                  onClick={() => handleFeatureClick(feature.id)}
                  className="relative group cursor-pointer"
                >
                  <div className="p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-300 transition-all duration-200 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-purple-50 hover:to-blue-50">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2 rounded-lg bg-gradient-to-r ${feature.color} text-white shadow-md group-hover:scale-110 transition-transform`}
                      >
                        {feature.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 group-hover:text-purple-700 transition-colors">
                          {feature.name}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs px-2 py-0 border-red-300 text-red-600">
                            Disabled for now
                          </Badge>
                          <div className="flex space-x-1">
                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-100" />
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse delay-200" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-400/10 to-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                </div>
              ))}
            </div>
          </div>

          {/* Viewer Notice */}
          <div className="p-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl mb-2">👁️</div>
                  <div className="text-sm font-medium text-blue-800">Viewer Mode</div>
                  <div className="text-xs text-blue-600 mt-1">
                    You have read-only access to view charts and analytics
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 relative overflow-hidden">
          {/* Animated Background */}
          <div className="animated-bg"></div>

          <div className="relative z-10 p-6">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white gradient-text-visible">
                    Analysis Dashboard
                  </h1>
                  <p className="text-gray-300 mt-2">
                    Welcome back, {user?.name || user?.username}! View latest AI-powered insights.
                  </p>
                </div>
                
                {/* Refresh Button */}
                <Button
                  onClick={fetchActiveAnalyses}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
                  <p className="text-white">Loading active analyses...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <Card className="glass border-red-500/30 bg-red-500/10">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3 text-red-300">
                    <AlertCircle className="h-5 w-5" />
                    <div>
                      <span className="font-medium">Failed to load analyses</span>
                      <p className="text-red-200 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Content */}
            {!loading && !error && (
              <>
                {activeAnalyses.length === 0 ? (
                  <Card className="glass border-white/20">
                    <CardContent className="pt-6">
                      <div className="text-center py-12 text-gray-400">
                        <Brain className="h-12 w-12 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No Active Analyses</h3>
                        <p>No analyses are currently active for viewing. Check back later!</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {activeAnalyses.map((analysis) => {
                      const displayId = analysis.analysis_id.includes("analysis_") 
                        ? analysis.analysis_id.substr(-8) 
                        : analysis.analysis_id

                      // Enhanced: For visualization, use a two-column layout inside the card
                      if (analysis.query_type === 'visualization') {
                        return (
                          <Card key={analysis.analysis_id} className="glass border-white/20">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-white text-lg">
                                  AI Analysis
                                </CardTitle>
                                <div className="flex items-center space-x-2">
                                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 font-mono text-xs">
                                    {displayId}
                                  </Badge>
                                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                                    📊 Visualization
                                  </Badge>
                                  {analysis.success && (
                                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                                      ✅ Success
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-4 pb-2">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left: Query & Results */}
                                <div className="space-y-4">
                                  <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                    <h4 className="font-semibold text-blue-300 mb-2 text-sm">
                                      📝 Query
                                    </h4>
                                    <p className="text-blue-200 text-sm">
                                      {analysis.user_query}
                                    </p>
                                  </div>
                                  {analysis.summary && (
                                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                      <h4 className="font-semibold text-green-300 mb-2 text-sm flex items-center">
                                        <Brain className="h-4 w-4 mr-1" />
                                        Analysis Results
                                      </h4>
                                      <p className="text-green-200 text-sm">
                                        {analysis.summary}
                                      </p>
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-400 pt-2 border-t border-gray-700">
                                    <div className="flex items-center justify-between">
                                      <span>
                                        Created: {new Date(analysis.created_at).toLocaleString()}
                                      </span>
                                      <span className="flex items-center">
                                        {analysis.visualization_created ? (
                                          <span className="text-purple-400">📊 Has Chart</span>
                                        ) : (
                                          <span className="text-gray-500">📝 Text Only</span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {/* Right: Visualization */}
                                <div>
                                  <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20 h-full flex flex-col">
                                    <h4 className="font-semibold text-purple-300 mb-2 text-sm flex items-center">
                                      <TrendingUp className="h-4 w-4 mr-1" />
                                      Visualization
                                    </h4>
                                    <div className="flex-1">
                                      <VisualizationDisplay 
                                        analysisId={analysis.analysis_id}
                                        visualizationHtml={analysis.visualization_html}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      }

                      // Non-visualization: keep original layout
                      return (
                        <Card key={analysis.analysis_id} className="glass border-white/20">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-white text-lg">
                                AI Analysis
                              </CardTitle>
                              <div className="flex items-center space-x-2">
                                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 font-mono text-xs">
                                  {displayId}
                                </Badge>
                                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                                  📈 Analysis
                                </Badge>
                                {analysis.success && (
                                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                                    ✅ Success
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Query */}
                            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                              <h4 className="font-semibold text-blue-300 mb-2 text-sm">
                                📝 Query
                              </h4>
                              <p className="text-blue-200 text-sm">
                                {analysis.user_query}
                              </p>
                            </div>
                            {/* Analysis Results */}
                            {analysis.summary && (
                              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                <h4 className="font-semibold text-green-300 mb-2 text-sm flex items-center">
                                  <Brain className="h-4 w-4 mr-1" />
                                  Analysis Results
                                </h4>
                                <p className="text-green-200 text-sm">
                                  {analysis.summary}
                                </p>
                              </div>
                            )}
                            {/* Metadata */}
                            <div className="text-xs text-gray-400 pt-2 border-t border-gray-700">
                              <div className="flex items-center justify-between">
                                <span>
                                  Created: {new Date(analysis.created_at).toLocaleString()}
                                </span>
                                <span className="flex items-center">
                                  {analysis.visualization_created ? (
                                    <span className="text-purple-400">📊 Has Chart</span>
                                  ) : (
                                    <span className="text-gray-500">📝 Text Only</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Coming Soon Modal */}
      {activeModal && (
        <ComingSoonModal
          isOpen={!!activeModal}
          onClose={() => setActiveModal(null)}
          title={getActiveModalData()?.name || ""}
          description={getActiveModalData()?.description || ""}
          icon={getActiveModalData()?.icon || <ClipboardCheck className="h-5 w-5" />}
        />
      )}
    </>
  )
}