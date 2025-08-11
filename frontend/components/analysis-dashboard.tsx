"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  ArrowLeft, 
  Target, 
  BarChart, 
  TrendingUp, 
  Calendar, 
  RefreshCw,
  Eye,
  Maximize2,
  Download
} from "lucide-react"
import EChartsRenderer from "./echarts-renderer"

interface AnalysisDashboardProps {
  analysisType: string
  analyses: any[]
  onBack: () => void
  loading?: boolean
  error?: string | null
}

export default function AnalysisDashboard({
  analysisType,
  analyses,
  onBack,
  loading = false,
  error = null
}: AnalysisDashboardProps) {
  const [expandedChart, setExpandedChart] = useState<string | null>(null)

  const getAnalysisTypeConfig = () => {
    if (analysisType === 'skill') {
      return {
        title: 'Skill Analysis Dashboard',
        description: 'Analyze skill distributions and competency levels across your organization',
        icon: <Target className="h-6 w-6" />,
        color: 'from-blue-500 to-cyan-500',
        bgColor: 'from-blue-500/10 to-cyan-500/10',
        borderColor: 'border-blue-500/20'
      }
    } else if (analysisType === 'gap') {
      return {
        title: 'Gap Analysis Dashboard',
        description: 'Identify skill gaps and compare current vs target performance levels',
        icon: <BarChart className="h-6 w-6" />,
        color: 'from-purple-500 to-pink-500',
        bgColor: 'from-purple-500/10 to-pink-500/10',
        borderColor: 'border-purple-500/20'
      }
    }
    return {
      title: 'Analysis Dashboard',
      description: 'View analysis results',
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'from-gray-500 to-gray-600',
      bgColor: 'from-gray-500/10 to-gray-600/10',
      borderColor: 'border-gray-500/20'
    }
  }

  const config = getAnalysisTypeConfig()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="animated-bg"></div>
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-white mt-4">Loading {analysisType} analyses...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="animated-bg"></div>
        <div className="relative z-10 text-center">
          <div className="text-red-400 mb-4">
            <TrendingUp className="h-16 w-16 mx-auto" />
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">Failed to Load Analyses</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <Button onClick={onBack} className="bg-blue-600 hover:bg-blue-700">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={onBack}
                className="glass border-white/20 text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Overview
              </Button>
              
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`w-12 h-12 bg-gradient-to-r ${config.color} rounded-lg flex items-center justify-center`}>
                    {config.icon}
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white gradient-text-visible">
                      {config.title}
                    </h1>
                    <p className="text-gray-300">{config.description}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-4">
              <div className="glass px-4 py-3 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${config.color} rounded-lg flex items-center justify-center`}>
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{analyses.length}</div>
                    <div className="text-xs text-gray-300">Active Analyses</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {analyses.length === 0 ? (
          <Card className={`glass ${config.borderColor}`}>
            <CardContent className="text-center py-12">
              <div className={`w-20 h-20 bg-gradient-to-r ${config.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                {config.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No {analysisType} analyses found</h3>
              <p className="text-gray-400 mb-4">
                No active {analysisType} analyses are currently available. Check back later or contact your administrator.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {analyses.map((analysis, index) => (
              <Card key={analysis.analysis_id} className={`glass ${config.borderColor} hover:shadow-xl transition-all duration-200`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-white text-lg flex items-center space-x-2">
                        <Badge className={`bg-gradient-to-r ${config.color} text-white border-0`}>
                          #{index + 1}
                        </Badge>
                        <span>Analysis {analysis.analysis_id.substr(-8)}</span>
                      </CardTitle>
                      <div className="flex items-center space-x-2 mt-2 text-xs text-gray-400">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(analysis.created_at)}</span>
                      </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                      <Eye className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Query Display */}
                  <div className={`p-3 bg-gradient-to-r ${config.bgColor} rounded-lg border ${config.borderColor}`}>
                    <h4 className="font-semibold text-white text-sm mb-1">Analysis Query</h4>
                    <p className="text-gray-300 text-sm">{analysis.query}</p>
                  </div>

                  {/* Chart Visualization */}
                  {analysis.designed_echart_code && (
                    <div className="bg-white rounded-lg p-2">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-gray-800 text-sm">Visualization</h4>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            onClick={() => setExpandedChart(
                              expandedChart === analysis.analysis_id ? null : analysis.analysis_id
                            )}
                            className="bg-gray-600 hover:bg-gray-700 text-white text-xs p-1"
                          >
                            <Maximize2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <EChartsRenderer 
                        optionCode={analysis.designed_echart_code}
                        height={expandedChart === analysis.analysis_id ? "500px" : "250px"}
                      />
                    </div>
                  )}

                  {/* Data Summary */}
                  {analysis.response_df && analysis.response_df.length > 0 && (
                    <div className={`p-3 bg-gradient-to-r ${config.bgColor} rounded-lg border ${config.borderColor}`}>
                      <h4 className="font-semibold text-white text-sm mb-1">Data Summary</h4>
                      <p className="text-gray-300 text-xs">
                        {analysis.response_df.length} data points analyzed
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <Card className="glass border-white/20 w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-white">Expanded Chart View</CardTitle>
                <Button
                  onClick={() => setExpandedChart(null)}
                  className="glass border-white/20 text-white hover:bg-white/10"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-white rounded-lg p-4">
                <EChartsRenderer 
                  optionCode={analyses.find(a => a.analysis_id === expandedChart)?.designed_echart_code || '{}'}
                  height="600px"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
