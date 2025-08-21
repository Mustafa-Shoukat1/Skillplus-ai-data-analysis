"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Users, 
  TrendingUp, 
  Award, 
  Target, 
  PieChart, 
  BarChart3, 
  Activity, 
  AlertTriangle,
  RefreshCw,
  Brain,
  Settings,
  CheckCircle,
  Clock,
  Star,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye,
  Calendar,
  Building,
  Timer,
  UserCheck,
  MessageCircle,
  Lightbulb,
  Shield,
  Zap,
  BookOpen,
  Briefcase,
  Heart,
  Globe,
  Crown
} from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

// Small global constants for icon sizing (used by MetricCard)
const ICON_GLOBAL_SMALL = "h-4 w-4"
const ICON_WRAPPER_SMALL = "w-8 h-8" // metric card icon wrapper default

// Minimal inline styles scoped to this component to ensure icons are not oversized
// and the tabs are scrollable on small devices.
// Note: This simple <style> tag is intentionally local and small — keeps changes minimal.
const viewerStyles = `
.viewer-dashboard svg { height: 1rem !important; width: 1rem !important; }
.viewer-dashboard .metric-icon { width: 2rem; height: 2rem; }
.viewer-dashboard .tabs-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
@media (min-width: 768px) {
  .viewer-dashboard svg { height: 1.25rem !important; width: 1.25rem !important; }
  .viewer-dashboard .metric-icon { width: 2.5rem; height: 2.5rem; }
}
`

interface ViewerDashboardProps {
  user: any
}

interface DashboardData {
  executive_overview?: any
  hr_analysis?: any
  team_management?: any
  skill_analysis?: any
  processing_messages?: string[]
  errors?: string[]
}

// Modern Metric Card Component with glassmorphism and hover effects
const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color, 
  trend, 
  change,
  isPercentage = false,
  size = "default"
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color: string
  trend?: 'up' | 'down' | 'stable'
  change?: string
  isPercentage?: boolean
  size?: 'small' | 'default' | 'large'
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-3 w-3 text-green-400" />
      case 'down': return <ArrowDown className="h-3 w-3 text-red-400" />
      case 'stable': return <Minus className="h-3 w-3 text-yellow-400" />
      default: return null
    }
  }

  const cardSizes = {
    small: "p-3",
    default: "p-4",
    large: "p-6"
  }

  const iconSizes = {
    small: "w-6 h-6",
    default: "w-8 h-8",
    large: "w-12 h-12"
  }

  return (
    <Card className={`group glass border-white/20 bg-gradient-to-br from-white/5 via-white/10 to-white/5 hover:from-white/10 hover:via-white/15 hover:to-white/10 transition-all duration-500 hover:scale-105 backdrop-blur-xl`}>
      <CardContent className={cardSizes[size]}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl sm:text-3xl font-bold text-white transition-all duration-300">
                {value}{isPercentage && '%'}
              </p>
              {trend && (
                <div className="flex items-center space-x-1">
                  {getTrendIcon()}
                  {change && <span className="text-xs text-gray-400">{change}</span>}
                </div>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-2">
                {subtitle}
              </p>
            )}
          </div>
          <div className={`metric-icon ${iconSizes[size]} rounded-2xl flex items-center justify-center text-white shadow-lg transition-all duration-300`}>
            {/* small icon wrapper; global CSS reduces raw svg size further */}
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Enhanced Stats Card for more complex data
const StatsCard = ({ 
  title, 
  stats, 
  icon, 
  color,
  description 
}: {
  title: string
  stats: Array<{ label: string; value: string | number; trend?: 'up' | 'down' | 'stable' }>
  icon: React.ReactNode
  color: string
  description?: string
}) => (
  <Card className={`glass border-white/20 bg-gradient-to-br from-${color}/5 via-${color}/10 to-${color}/5 hover:from-${color}/10 hover:via-${color}/15 hover:to-${color}/10 transition-all duration-500 hover:scale-105 group`}>
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="text-white text-lg flex items-center space-x-2">
            <div className={`w-8 h-8 bg-gradient-to-r ${color} rounded-lg flex items-center justify-center text-white`}>
              {icon}
            </div>
            <span>{title}</span>
          </CardTitle>
          {description && (
            <p className="text-gray-400 text-sm mt-1">{description}</p>
          )}
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-200">
            <span className="text-gray-300 text-sm">{stat.label}</span>
            <div className="flex items-center space-x-2">
              <span className="text-white font-semibold">{stat.value}</span>
              {stat.trend === 'up' && <ArrowUp className="h-3 w-3 text-green-400" />}
              {stat.trend === 'down' && <ArrowDown className="h-3 w-3 text-red-400" />}
              {stat.trend === 'stable' && <Minus className="h-3 w-3 text-yellow-400" />}
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

// Performance Distribution Donut Chart Component
const PerformanceDonut = ({ data, title }: { data: any; title: string }) => {
  const total = (data?.high || 0) + (data?.medium || 0) + (data?.low || 0)
  
  const performanceLevels = [
    { 
      label: 'High Performance', 
      value: data?.high || 0, 
      color: 'from-emerald-500 to-green-600',
      bgColor: 'bg-emerald-500',
      percentage: total > 0 ? Math.round((data?.high || 0) / total * 100) : 0
    },
    { 
      label: 'Medium Performance', 
      value: data?.medium || 0, 
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-500',
      percentage: total > 0 ? Math.round((data?.medium || 0) / total * 100) : 0
    },
    { 
      label: 'Low Performance', 
      value: data?.low || 0, 
      color: 'from-rose-500 to-red-600',
      bgColor: 'bg-rose-500',
      percentage: total > 0 ? Math.round((data?.low || 0) / total * 100) : 0
    }
  ]

  return (
    <Card className="glass border-white/20 bg-gradient-to-br from-white/5 to-white/10 hover:from-white/10 hover:to-white/15 transition-all duration-500 group">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <PieChart className="h-5 w-5" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {performanceLevels.map((level, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${level.bgColor}`}></div>
                  <span className="text-gray-300 text-sm">{level.label}</span>
                </div>
                <div className="text-white font-medium">
                  {level.value} ({level.percentage}%)
                </div>
              </div>
              <Progress 
                value={level.percentage} 
                className={`h-2 bg-gray-700`}
                style={{
                  background: `linear-gradient(to right, ${level.color.replace('from-', '').replace('to-', ', ')})`,
                }}
              />
            </div>
          ))}
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-center">
              <span className="text-2xl font-bold text-white">{total}</span>
              <p className="text-gray-400 text-sm">Total Employees</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Skill Gap Progress Component
const SkillGapProgress = ({ skillGaps }: { skillGaps: any[] }) => (
  <Card className="glass border-white/20 bg-gradient-to-br from-orange-500/5 to-red-500/10 hover:from-orange-500/10 hover:to-red-500/15 transition-all duration-500 group">
    <CardHeader>
      <CardTitle className="text-white flex items-center space-x-2">
        <Target className="h-5 w-5" />
        <span>Critical Skill Gaps</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {skillGaps?.slice(0, 5).map((gap: any, index: number) => {
          const gapPercentage = ((gap.target_level - gap.current_level) / gap.target_level) * 100
          const currentPercentage = (gap.current_level / gap.target_level) * 100
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white font-medium text-sm">{gap.skill_area}</span>
                <Badge className={`${
                  gap.priority === 'high' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                  gap.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                  'bg-green-500/20 text-green-300 border-green-500/30'
                } text-xs`}>
                  {gap.priority}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Current: {gap.current_level}</span>
                  <span>Target: {gap.target_level}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-2 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(currentPercentage, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500">
                  Gap: {gapPercentage.toFixed(1)}% improvement needed
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </CardContent>
  </Card>
)

// Team Rankings Component
const TeamRankings = ({ rankings }: { rankings: any[] }) => (
  <Card className="glass border-white/20 bg-gradient-to-br from-purple-500/5 to-blue-500/10 hover:from-purple-500/10 hover:to-blue-500/15 transition-all duration-500 group">
    <CardHeader>
      <CardTitle className="text-white flex items-center space-x-2">
        <Award className="h-5 w-5" />
        <span>Team Performance Rankings</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {rankings?.map((team: any, index: number) => (
          <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-200 group/item">
            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                team.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900' :
                team.rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-gray-900' :
                team.rank === 3 ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-orange-900' :
                'bg-gradient-to-r from-gray-600 to-gray-700 text-white'
              }`}>
                {team.rank}
              </div>
              <div>
                <h4 className="text-white font-medium">{team.team_name}</h4>
                <p className="text-gray-400 text-xs">Department Team</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-white font-bold text-lg">{team.score}</div>
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-3 w-3 ${i < Math.floor(team.score) ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} 
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

export default function ViewerDashboard({ user }: ViewerDashboardProps) {
  const [activeTab, setActiveTab] = useState("executive")
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Check if there's a stored analysis_id in localStorage
      const storedAnalysisId = localStorage.getItem('currentAnalysisId')
      
      if (storedAnalysisId) {
        console.log('Using stored analysis_id:', storedAnalysisId)
        await loadSpecificAnalysis(storedAnalysisId)
        return
      }
      
      // Fallback: Get the most recent active dashboard analysis
      const activeResp = await fetch(`${API_BASE_URL}/analysis/dashboard/active`)
        .then(r => r.json())
        .catch(() => ({ success: false }))
      
      if (activeResp && activeResp.success && activeResp.data && activeResp.data.analysis_id) {
        const analysisId = activeResp.data.analysis_id
        console.log('Using most recent active analysis_id:', analysisId)
        await loadSpecificAnalysis(analysisId)
      } else {
        setError("No dashboard analysis available")
      }
      
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
      setError("Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  const loadSpecificAnalysis = async (analysisId: string) => {
    try {
      console.log('Loading analysis:', analysisId)
      
      const resultResp = await fetch(`${API_BASE_URL}/analysis/result/db/${encodeURIComponent(analysisId)}`)
      const resultData = await resultResp.json()
      
      console.log('Analysis result:', resultData)
      
      if (resultData && resultData.success && resultData.data && resultData.data.dashboard_results) {
        setDashboardData(resultData.data.dashboard_results)
        setCurrentAnalysisId(analysisId)
        setLastUpdated(new Date(resultData.data.created_at))
        localStorage.setItem('currentAnalysisId', analysisId)
      } else {
        console.warn("Analysis found but no dashboard results:", resultData)
        setError("No dashboard data available for this analysis")
      }
    } catch (error) {
      console.error("Failed to load specific analysis:", error)
      setError("Failed to load analysis data")
    }
  }

  const refreshDashboard = () => {
    localStorage.removeItem('currentAnalysisId')
    loadDashboardData()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="animated-bg"></div>
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 border-4 border-transparent border-t-blue-500 border-r-purple-500 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-white text-2xl font-semibold mb-2">Loading Dashboard</h2>
          <p className="text-gray-400">Fetching latest analysis data...</p>
          {currentAnalysisId && (
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 mt-4">
              Analysis ID: {currentAnalysisId.substr(-8)}
            </Badge>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="animated-bg"></div>
        <div className="relative z-10 text-center max-w-md">
          <AlertTriangle className="h-20 w-20 text-red-400 mx-auto mb-6" />
          <h2 className="text-white text-2xl font-semibold mb-4">Dashboard Unavailable</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <Button onClick={refreshDashboard} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="animated-bg"></div>
        <div className="relative z-10 text-center max-w-md">
          <Brain className="h-20 w-20 text-gray-400 mx-auto mb-6" />
          <h2 className="text-white text-2xl font-semibold mb-4">No Dashboard Data</h2>
          <p className="text-gray-300 mb-6">No dashboard analysis data is currently available.</p>
          <Button onClick={refreshDashboard} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    )
  }

  const executiveData = dashboardData.executive_overview || {}
  const hrData = dashboardData.hr_analysis || {}
  const teamData = dashboardData.team_management || {}
  const skillData = dashboardData.skill_analysis || {}

  return (
    <>
      {/* scoped viewer styles */}
      <style>{viewerStyles}</style>
      <div className="viewer-dashboard container mx-auto px-4 sm:px-6 lg:px-8 min-h-screen relative overflow-hidden">
       {/* Animated Background */}
       <div className="animated-bg"></div>

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                Organizational Dashboard
              </h1>
              <div className="flex items-center space-x-4 mt-3">
                <p className="text-gray-300">Real-time insights and analytics</p>
                {currentAnalysisId && (
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                    ID: {currentAnalysisId.substr(-8)}
                  </Badge>
                )}
                {lastUpdated && (
                  <div className="flex items-center space-x-1 text-gray-400 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>{lastUpdated.toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
            <Button 
              onClick={refreshDashboard} 
              className="glass border-white/20 text-white hover:bg-white/10 hover:scale-105 transition-all duration-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Executive Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <MetricCard
            title="Total Employees"
            value={executiveData.total_employees || 0}
            subtitle="Currently assessed"
            icon={<Users className="h-6 w-6" />}
            color="from-blue-500 to-cyan-500"
            trend="stable"
          />
          <MetricCard
            title="Average Performance"
            value={Number(executiveData.average_performance || 0).toFixed(1)}
            subtitle="Overall score"
            icon={<TrendingUp className="h-6 w-6" />}
            color="from-green-500 to-emerald-500"
            trend="up"
            isPercentage={true}
          />
          <MetricCard
            title="Top Department"
            value={executiveData.top_performing_department || "N/A"}
            subtitle="Best performing"
            icon={<Award className="h-6 w-6" />}
            color="from-purple-500 to-pink-500"
          />
          <MetricCard
            title="Critical Gaps"
            value={skillData.skill_gaps?.filter((gap: any) => gap.priority === 'high').length || 0}
            subtitle="High priority skills"
            icon={<Target className="h-6 w-6" />}
            color="from-orange-500 to-red-500"
            trend="down"
          />
          <MetricCard
            title="High Performers"
            value={executiveData.performance_distribution?.high || 0}
            subtitle="Top tier employees"
            icon={<Star className="h-6 w-6" />}
            color="from-yellow-500 to-orange-500"
            trend="up"
          />
          <MetricCard
            title="Teams Analyzed"
            value={teamData.team_performance_ranking?.length || 0}
            subtitle="Department teams"
            icon={<Building className="h-6 w-6" />}
            color="from-indigo-500 to-blue-500"
          />
        </div>

        {/* Main Dashboard Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass border-white/20 bg-white/5 p-1 w-full justify-start tabs-scroll">
            <TabsTrigger 
              value="executive" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-white text-gray-300 hover:text-white transition-all duration-300"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Executive Overview
            </TabsTrigger>
            <TabsTrigger 
              value="hr" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500/20 data-[state=active]:to-emerald-500/20 data-[state=active]:text-white text-gray-300 hover:text-white transition-all duration-300"
            >
              <Users className="h-4 w-4 mr-2" />
              HR Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="team" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/20 data-[state=active]:to-pink-500/20 data-[state=active]:text-white text-gray-300 hover:text-white transition-all duration-300"
            >
              <Building className="h-4 w-4 mr-2" />
              Team Management
            </TabsTrigger>
            <TabsTrigger 
              value="skill" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/20 data-[state=active]:to-red-500/20 data-[state=active]:text-white text-gray-300 hover:text-white transition-all duration-300"
            >
              <Target className="h-4 w-4 mr-2" />
              Skill Analysis
            </TabsTrigger>
          </TabsList>

          {/* Executive Overview Tab */}
          <TabsContent value="executive" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <PerformanceDonut 
                  data={executiveData.performance_distribution} 
                  title="Performance Distribution"
                />
              </div>
              
              <div className="lg:col-span-2 space-y-6">
                <StatsCard
                  title="Key Insights"
                  description="Strategic overview of organizational performance"
                  icon={<Lightbulb className="h-4 w-4" />}
                  color="from-blue-500 to-cyan-500"
                  stats={[
                    { label: "Trend Analysis", value: executiveData.trend_analysis || "stable" },
                    { label: "Total Assessed", value: executiveData.total_employees || 0 },
                    { label: "Average Score", value: `${Number(executiveData.average_performance || 0).toFixed(1)}%` }
                  ]}
                />
                
                <Card className="glass border-white/20 bg-gradient-to-br from-amber-500/5 to-orange-500/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span>Areas of Concern</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(executiveData.areas_of_concern || []).map((concern: string, index: number) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-orange-500/10 rounded-lg">
                          <Shield className="h-4 w-4 text-orange-400" />
                          <span className="text-white">{concern}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recommendations */}
            <Card className="glass border-white/20 bg-gradient-to-br from-green-500/5 to-emerald-500/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>Strategic Recommendations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(executiveData.key_recommendations || []).map((rec: string, index: number) => (
                    <div key={index} className="p-4 bg-green-500/10 rounded-lg border border-green-500/20 hover:bg-green-500/15 transition-all duration-200">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {index + 1}
                        </div>
                        <p className="text-green-200 text-sm leading-relaxed">{rec}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* HR Analytics Tab */}
          <TabsContent value="hr" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StatsCard
                title="Workforce Analytics"
                description="Current workforce composition"
                icon={<Users className="h-4 w-4" />}
                color="from-blue-500 to-cyan-500"
                stats={[
                  { label: "Total Assessed", value: hrData.workforce_analytics?.total_assessed || 0 },
                  { label: "Departments", value: hrData.workforce_analytics?.departments || 0 },
                  { label: "Avg Tenure", value: `${hrData.workforce_analytics?.avg_tenure || 0} years` }
                ]}
              />

              <StatsCard
                title="Retention Risk Analysis"
                description="Employee retention risk levels"
                icon={<Heart className="h-4 w-4" />}
                color="from-red-500 to-pink-500"
                stats={[
                  { label: "High Risk", value: hrData.retention_risk?.high_risk || 0, trend: 'down' },
                  { label: "Medium Risk", value: hrData.retention_risk?.medium_risk || 0, trend: 'stable' },
                  { label: "Low Risk", value: hrData.retention_risk?.low_risk || 0, trend: 'up' }
                ]}
              />
            </div>

            {/* Performance Gaps */}
            <Card className="glass border-white/20 bg-gradient-to-br from-orange-500/5 to-red-500/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Performance Gaps Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(hrData.performance_gaps || []).map((gap: any, index: number) => (
                    <div key={index} className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-white font-medium">{gap.area}</h4>
                        <Badge className={`${
                          gap.impact === 'high' ? 'bg-red-500/20 text-red-300' :
                          gap.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-green-500/20 text-green-300'
                        }`}>
                          {gap.impact}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="h-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                            style={{ width: `${gap.gap_percentage}%` }}
                          />
                        </div>
                        <p className="text-red-200 text-sm">{gap.gap_percentage}% gap identified</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Training Priorities & Recommended Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass border-white/20 bg-gradient-to-br from-purple-500/5 to-blue-500/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <BookOpen className="h-5 w-5" />
                    <span>Training Priorities</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(hrData.training_priorities || []).map((priority: string, index: number) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-purple-500/10 rounded-lg">
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <span className="text-purple-200 text-sm leading-relaxed">{priority}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-white/20 bg-gradient-to-br from-green-500/5 to-emerald-500/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>Recommended Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(hrData.recommended_actions || []).map((action: string, index: number) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-green-500/10 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                        <span className="text-green-200 text-sm leading-relaxed">{action}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Team Management Tab */}
          <TabsContent value="team" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TeamRankings rankings={teamData.team_performance_ranking} />
              
              <div className="space-y-6">
                <StatsCard
                  title="Collaboration Metrics"
                  description="Team collaboration effectiveness"
                  icon={<MessageCircle className="h-4 w-4" />}
                  color="from-cyan-500 to-blue-500"
                  stats={[
                    { label: "Communication", value: `${teamData.collaboration_metrics?.communication || 0}/5` },
                    { label: "Cooperation", value: `${teamData.collaboration_metrics?.cooperation || 0}/5` },
                    { label: "Coordination", value: `${teamData.collaboration_metrics?.coordination || 0}/5` }
                  ]}
                />

                <StatsCard
                  title="Leadership Effectiveness"
                  description="Leadership performance assessment"
                  icon={<Crown className="h-4 w-4" />}
                  color="from-purple-500 to-pink-500"
                  stats={[
                    { label: "Strategic Thinking", value: `${teamData.leadership_effectiveness?.strategic_thinking || 0}/5` },
                    { label: "Team Development", value: `${teamData.leadership_effectiveness?.team_development || 0}/5` },
                    { label: "Decision Making", value: `${teamData.leadership_effectiveness?.decision_making || 0}/5` }
                  ]}
                />
              </div>
            </div>

            {/* Team Dynamics */}
            <Card className="glass border-white/20 bg-gradient-to-br from-indigo-500/5 to-blue-500/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Team Dynamics Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(teamData.team_dynamics || []).map((dynamic: string, index: number) => (
                    <div key={index} className="p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                      <div className="flex items-start space-x-3">
                        <Eye className="h-5 w-5 text-indigo-400 shrink-0 mt-1" />
                        <p className="text-indigo-200 leading-relaxed">{dynamic}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Management Recommendations */}
            <Card className="glass border-white/20 bg-gradient-to-br from-emerald-500/5 to-green-500/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Briefcase className="h-5 w-5" />
                  <span>Management Recommendations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(teamData.management_recommendations || []).map((rec: string, index: number) => (
                    <div key={index} className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {index + 1}
                        </div>
                        <p className="text-green-200 leading-relaxed">{rec}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Skill Analysis Tab */}
          <TabsContent value="skill" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SkillGapProgress skillGaps={skillData.skill_gaps} />
              
              <div className="space-y-6">
                <StatsCard
                  title="Competency Analysis"
                  description="Skills assessment by category"
                  icon={<Target className="h-4 w-4" />}
                  color="from-orange-500 to-red-500"
                  stats={[
                    { label: "Technical Skills", value: `${skillData.competency_analysis?.technical_skills || 0}/5` },
                    { label: "Soft Skills", value: `${skillData.competency_analysis?.soft_skills || 0}/5` },
                    { label: "Leadership Skills", value: `${skillData.competency_analysis?.leadership_skills || 0}/5` }
                  ]}
                />

                <StatsCard
                  title="Benchmark Comparison"
                  description="Performance vs industry standards"
                  icon={<BarChart3 className="h-4 w-4" />}
                  color="from-blue-500 to-cyan-500"
                  stats={[
                    { label: "Above Benchmark", value: `${skillData.benchmark_comparison?.above_benchmark || 0}%`, trend: 'up' },
                    { label: "At Benchmark", value: `${skillData.benchmark_comparison?.at_benchmark || 0}%`, trend: 'stable' },
                    { label: "Below Benchmark", value: `${skillData.benchmark_comparison?.below_benchmark || 0}%`, trend: 'down' }
                  ]}
                />
              </div>
            </div>

            {/* Development Pathways */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {Object.entries(skillData.development_pathways || {}).map(([category, pathways]: [string, any]) => (
                <Card key={category} className="glass border-white/20 bg-gradient-to-br from-purple-500/5 to-blue-500/10">
                  <CardHeader>
                    <CardTitle className="text-white text-lg capitalize">
                      {category.replace('_', ' ')} Development
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pathways.map((pathway: string, index: number) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-purple-500/10 rounded-lg">
                          <BookOpen className="h-4 w-4 text-purple-400 shrink-0 mt-1" />
                          <span className="text-purple-200 text-sm">{pathway}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Upskilling Priorities */}
            <Card className="glass border-white/20 bg-gradient-to-br from-amber-500/5 to-orange-500/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Upskilling Priorities</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(skillData.upskilling_priorities || []).map((priority: string, index: number) => (
                    <div key={index} className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20 hover:bg-orange-500/15 transition-all duration-200">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {index + 1}
                        </div>
                        <p className="text-orange-200 text-sm leading-relaxed">{priority}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
    </>
  )
}