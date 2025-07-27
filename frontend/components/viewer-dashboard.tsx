"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, Brain, Calendar, TrendingUp, AlertCircle } from "lucide-react"
import { getVisibleAnalyses } from "@/lib/api"
import VisualizationLoader from "./visualization-loader"

interface ViewerDashboardProps {
  user: any
}

export default function ViewerDashboard({ user }: ViewerDashboardProps) {
  const [visibleAnalyses, setVisibleAnalyses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadActiveAnalyses()
  }, [])

  const loadActiveAnalyses = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await getVisibleAnalyses()

      if (response.success) {
        const analysesData = response.data?.data || response.data || []
        const analysesArray = Array.isArray(analysesData) ? analysesData : []
        setVisibleAnalyses(analysesArray)
        console.log("Loaded active analyses:", analysesArray)
      } else {
        setError(response.error || "Failed to load analyses")
      }
    } catch (error) {
      console.error("Error loading active analyses:", error)
      setError("Failed to load analyses")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="animated-bg"></div>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading visualizations...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="animated-bg"></div>

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white gradient-text-visible">
            Data Insights Dashboard
          </h1>
          <p className="text-gray-300 mt-2">
            Welcome {user?.full_name || user?.username || "Viewer"}! Explore the
            latest data analysis and visualizations.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="glass border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {Array.isArray(visibleAnalyses) ? visibleAnalyses.length : 0}
                  </div>
                  <div className="text-sm text-gray-300">
                    Available Analyses
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {Array.isArray(visibleAnalyses) ? visibleAnalyses.filter((a) => a.success).length : 0}
                  </div>
                  <div className="text-sm text-gray-300">
                    Successful Analyses
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {Array.isArray(visibleAnalyses) ? visibleAnalyses.filter((a) => {
                      const analysisDate = new Date(a.created_at)
                      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      return analysisDate > weekAgo
                    }).length : 0}
                  </div>
                  <div className="text-sm text-gray-300">This Week</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analysis Cards */}
        {error ? (
          <Card className="glass border-red-500/30 bg-red-500/10">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 text-red-300">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        ) : !Array.isArray(visibleAnalyses) || visibleAnalyses.length === 0 ? (
          <Card className="glass border-white/20">
            <CardContent className="p-12 text-center">
              <h3 className="text-xl font-medium text-white mb-2">
                No Analyses Available
              </h3>
              <p className="text-gray-400">
                No public analyses have been shared yet. Check back later for
                insights!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {visibleAnalyses.map((analysis, index) => {
              const analysisId = analysis.analysis_id || `temp_${index}`
              const displayId = analysisId.includes("analysis_")
                ? analysisId.substr(-8)
                : analysisId

              return (
                <Card key={analysisId} className="glass border-white/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                          <Brain className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-white">
                            {analysis.template_name || "Data Analysis"}
                          </CardTitle>
                          <p className="text-sm text-gray-400">ID: {displayId}</p>
                        </div>
                      </div>
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                        <Eye className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Query */}
                    <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <h4 className="font-semibold text-blue-300 mb-1 text-sm">
                        Analysis Query
                      </h4>
                      <p className="text-blue-200 text-sm">
                        {analysis.user_query}
                      </p>
                    </div>

                    {/* Summary */}
                    {analysis.summary && (
                      <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                        <h4 className="font-semibold text-green-300 mb-1 text-sm">
                          Summary
                        </h4>
                        <p className="text-green-200 text-sm">
                          {analysis.summary}
                        </p>
                      </div>
                    )}

                    {/* General Analysis Results (for non-visualization queries) */}
                    {!analysis.visualization_created && analysis.summary && (
                      <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <h4 className="font-semibold text-blue-300 mb-2 text-sm flex items-center">
                          <Brain className="h-4 w-4 mr-1" />
                          Analysis Results
                        </h4>
                        <p className="text-blue-200 text-sm">
                          {analysis.summary}
                        </p>
                      </div>
                    )}

                    {/* Visualization - FIXED */}
                    {analysis.visualization_created && (
                      <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <h4 className="font-semibold text-purple-300 mb-2 text-sm flex items-center">
                          <TrendingUp className="h-4 w-4 mr-1" />
                          Visualization
                        </h4>
                        <div className="bg-white rounded-lg overflow-hidden">
                          <VisualizationLoader analysisId={analysisId} />
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Type: {analysis.query_type}</span>
                      <span>
                        {new Date(analysis.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}