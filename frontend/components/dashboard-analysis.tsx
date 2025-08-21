"use client"

import React, { useState } from "react"
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Brain, 
  Target, 
  Award, 
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Activity
} from "lucide-react"
import { startAdvancedAnalysis, getAnalysisStatus, getAnalysisResult } from "@/lib/api"

interface DashboardAnalysisProps {
  uploadedFileId?: string
  onAnalysisComplete?: (dashboardData: any, analysisId?: string) => void
}

export default function DashboardAnalysis({ uploadedFileId, onAnalysisComplete }: DashboardAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTask, setCurrentTask] = useState("")
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleStartAnalysis = async () => {
    if (!uploadedFileId) {
      setError("Please upload a file first")
      return
    }

    setIsAnalyzing(true)
    setProgress(0)
    setError(null)
    setCurrentTask("Starting analysis...")

    try {
      // Start dashboard analysis
      const startResponse = await fetch(`${API_BASE_URL}/analysis/analyze/${uploadedFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: "Perform comprehensive dashboard analysis covering executive overview, HR analytics, team management, and skill analysis",
          model: 'claude-3-7-sonnet-20250219',
          analysis_type: 'dashboard'
        })
      })
      
      const startData = await startResponse.json()
      
      if (!startData.success) {
        throw new Error(startData.error || 'Failed to start analysis')
      }

      const taskId = startData.task_id
      const analysisId = startData.analysis_id
      
      setCurrentTask("Processing data...")
      
      // Poll for completion
      const pollAnalysis = async () => {
        let attempts = 0
        const maxAttempts = 60
        const intervalMs = 3000

        while (attempts < maxAttempts) {
          try {
            const statusResponse = await fetch(`${API_BASE_URL}/analysis/status/${taskId}`)
            const statusData = await statusResponse.json()
            
            if (statusData.success) {
              const status = statusData.status
              const currentProgress = statusData.progress || 0
              
              setProgress(currentProgress)
              
              if (status === "completed") {
                setCurrentTask("Fetching results...")
                
                // Get results from database using analysis_id
                const resultResponse = await fetch(`${API_BASE_URL}/analysis/result/db/${analysisId}`)
                const resultData = await resultResponse.json()
                
                if (resultData.success && resultData.data && resultData.data.dashboard_results) {
                  const dashboardResult = resultData.data.dashboard_results
                  
                  setDashboardData(dashboardResult)
                  setCurrentTask("Analysis complete!")
                  setProgress(100)
                  
                  if (onAnalysisComplete) {
                    onAnalysisComplete(dashboardResult, analysisId)
                  }
                  break
                } else {
                  throw new Error("Failed to get analysis results")
                }
              } else if (status === "failed") {
                throw new Error(statusData.error || "Analysis failed")
              } else {
                setCurrentTask(`Processing... ${Math.round(currentProgress)}%`)
              }
            }
            
            await new Promise(resolve => setTimeout(resolve, intervalMs))
            attempts++
          } catch (error) {
            console.error("Polling error:", error)
            throw error
          }
        }
        
        if (attempts >= maxAttempts) {
          throw new Error("Analysis timed out")
        }
      }

      await pollAnalysis()
    } catch (error) {
      console.error("Dashboard analysis error:", error)
      setError(error instanceof Error ? error.message : 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSummaryCards = () => {
    if (!dashboardData) return []

    const executive = dashboardData.executive_overview || {}
    const hr = dashboardData.hr_analysis || {}
    const team = dashboardData.team_management || {}
    const skill = dashboardData.skill_analysis || {}

    return [
      {
        title: "Total Employees",
        value: executive.total_employees || 0,
        icon: <Users className="h-6 w-6" />,
        color: "from-blue-500 to-cyan-500"
      },
      {
        title: "Average Performance",
        value: `${executive.average_performance || 0}%`,
        icon: <TrendingUp className="h-6 w-6" />,
        color: "from-green-500 to-emerald-500"
      },
      {
        title: "Top Department",
        value: executive.top_performing_department || "N/A",
        icon: <Award className="h-6 w-6" />,
        color: "from-purple-500 to-pink-500"
      },
      {
        title: "Skill Gaps Identified",
        value: skill.skill_gaps?.length || 0,
        icon: <Target className="h-6 w-6" />,
        color: "from-orange-500 to-red-500"
      },
      {
        title: "High Performers",
        value: executive.performance_distribution?.high || 0,
        icon: <Sparkles className="h-6 w-6" />,
        color: "from-yellow-500 to-orange-500"
      },
      {
        title: "Teams Analyzed",
        value: team.team_performance_ranking?.length || 0,
        icon: <BarChart3 className="h-6 w-6" />,
        color: "from-indigo-500 to-blue-500"
      }
    ]
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Analysis Header */}
      <Card className="glass border-white/20 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-3 text-xl">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <span>Comprehensive Dashboard Analysis</span>
          </CardTitle>
          <p className="text-gray-300">
            Generate executive overview, HR analytics, team management insights, and skill analysis
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            {/* Analysis Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handleStartAnalysis}
                  disabled={!uploadedFileId || isAnalyzing}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-8 py-3 text-lg font-semibold shadow-lg disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Activity className="h-5 w-5 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-5 w-5 mr-2" />
                      Generate Dashboard
                    </>
                  )}
                </Button>
                
                {dashboardData && (
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30 px-3 py-1">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Analysis Complete
                  </Badge>
                )}
              </div>

              {!uploadedFileId && (
                <div className="text-yellow-300 text-sm flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Upload a file first
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {isAnalyzing && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-purple-300">
                  <span className="font-medium">{currentTask}</span>
                  <span className="font-mono text-lg">{progress}%</span>
                </div>
                <Progress 
                  value={progress} 
                  className="w-full h-3 bg-purple-500/20"
                />
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>Analyzing organizational data...</span>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="flex items-center space-x-2 text-red-300">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Analysis Failed</span>
                </div>
                <p className="text-red-200 text-sm mt-1">{error}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Results Summary */}
      {dashboardData && (
        <Card className="glass border-green-500/30 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-green-300 flex items-center space-x-2">
              <CheckCircle className="h-6 w-6" />
              <span>Dashboard Analysis Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Summary Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {getSummaryCards().map((card, index) => (
                <div key={index} className={`glass rounded-lg p-4 bg-gradient-to-r ${card.color}/10 border border-white/10`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 bg-gradient-to-r ${card.color} rounded-lg flex items-center justify-center text-white`}>
                      {card.icon}
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{card.value}</div>
                      <div className="text-sm text-gray-300">{card.title}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Key Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Executive Overview */}
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <h4 className="font-semibold text-blue-300 mb-3 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Executive Overview
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="text-blue-200">
                    <strong>Trend:</strong> {dashboardData.executive_overview?.trend_analysis || 'N/A'}
                  </div>
                  <div className="text-blue-200">
                    <strong>Top Concerns:</strong> {dashboardData.executive_overview?.areas_of_concern?.slice(0, 2).join(', ') || 'None'}
                  </div>
                </div>
              </div>

              {/* HR Analytics */}
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <h4 className="font-semibold text-green-300 mb-3 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  HR Analytics
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="text-green-200">
                    <strong>Training Priorities:</strong> {dashboardData.hr_analysis?.training_priorities?.slice(0, 2).join(', ') || 'None'}
                  </div>
                  <div className="text-green-200">
                    <strong>High Risk:</strong> {dashboardData.hr_analysis?.retention_risk?.high_risk || 0} employees
                  </div>
                </div>
              </div>

              {/* Team Management */}
              <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <h4 className="font-semibold text-purple-300 mb-3 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Team Management
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="text-purple-200">
                    <strong>Top Team:</strong> {dashboardData.team_management?.team_performance_ranking?.[0]?.team_name || 'N/A'}
                  </div>
                  <div className="text-purple-200">
                    <strong>Communication Score:</strong> {dashboardData.team_management?.collaboration_metrics?.communication || 0}/5
                  </div>
                </div>
              </div>

              {/* Skill Analysis */}
              <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <h4 className="font-semibold text-orange-300 mb-3 flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Skill Analysis
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="text-orange-200">
                    <strong>Critical Gaps:</strong> {dashboardData.skill_analysis?.skill_gaps?.filter((gap: any) => gap.priority === 'high').length || 0}
                  </div>
                  <div className="text-orange-200">
                    <strong>Below Benchmark:</strong> {dashboardData.skill_analysis?.benchmark_comparison?.below_benchmark || 0}%
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-6 flex justify-center">
              <Button 
                onClick={() => window.location.href = '/dashboard'} 
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white px-8 py-3 text-lg font-semibold"
              >
                View Full Dashboard
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
        
