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
  CheckCircle,
  Star,
  ArrowUp,
  ArrowDown,
  Minus,
  Calendar,
  Building,
  UserCheck,
  MessageCircle,
  Lightbulb,
  Shield,
  Zap,
  BookOpen,
  Briefcase,
  Heart,
  Crown,
  TrendingDown,
  Clock,
  Eye,
  Settings,
  ChevronRight,
  Info,
  AlertCircle,
  CheckCircle2,
  XCircle,
  DollarSign,
  Percent,
  Users2,
  Gauge,
  BarChart2,
  LineChart,
  Timer,
  Layers,
  Filter,
  Search,
  Download
} from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

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

// Enhanced metric card with modern styling
const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  gradient,
  trend, 
  change,
  isPercentage = false,
  size = "default",
  actionButton
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  gradient: string
  trend?: 'up' | 'down' | 'stable'
  change?: string
  isPercentage?: boolean
  size?: 'small' | 'default' | 'large'
  actionButton?: React.ReactNode
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <ArrowUp className="w-3 h-3 text-green-400" />
      case 'down': return <ArrowDown className="w-3 h-3 text-red-400" />
      case 'stable': return <Minus className="w-3 h-3 text-yellow-400" />
      default: return null
    }
  }

  const cardSizes = {
    small: "p-3",
    default: "p-4",
    large: "p-6"
  }

  return (
    <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300 group hover:scale-105">
      <CardContent className={cardSizes[size]}>
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 ${gradient} rounded-xl flex items-center justify-center shadow-lg`}>
            {icon}
          </div>
          {actionButton && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              {actionButton}
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-bold text-white">
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
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Department ranking component
const DepartmentRanking = ({ rankings }: { rankings: any[] }) => (
  <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
    <CardHeader className="pb-3">
      <CardTitle className="text-white text-sm font-medium flex items-center space-x-2">
        <Crown className="w-4 h-4" />
        <span>Department Rankings</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {rankings?.map((dept: any, index: number) => (
        <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
          <div className="flex items-center space-x-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              dept.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900' :
              dept.rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-gray-900' :
              dept.rank === 3 ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-orange-900' :
              'bg-gradient-to-r from-gray-600 to-gray-700 text-white'
            }`}>
              {dept.rank}
            </div>
            <div>
              <h4 className="text-white font-medium text-sm">{dept.department}</h4>
              <p className="text-gray-400 text-xs">{dept.employee_count} employees</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white font-bold text-sm">{dept.avg_score}%</div>
            <div className="flex items-center justify-end space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-2 h-2 ${i < Math.floor(dept.avg_score / 20) ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
)

// Enhanced performance distribution
const PerformanceDistribution = ({ data }: { data: any }) => {
  const total = (data?.high_performers || 0) + (data?.core_performers || 0) + (data?.developing_performers || 0)
  
  const levels = [
    { 
      label: 'High Performers', 
      value: data?.high_performers || 0, 
      color: 'bg-emerald-500',
      gradient: 'from-emerald-500 to-green-600',
      percentage: total > 0 ? Math.round((data?.high_performers || 0) / total * 100) : 0
    },
    { 
      label: 'Core Performers', 
      value: data?.core_performers || 0, 
      color: 'bg-amber-500',
      gradient: 'from-amber-500 to-orange-500',
      percentage: total > 0 ? Math.round((data?.core_performers || 0) / total * 100) : 0
    },
    { 
      label: 'Developing', 
      value: data?.developing_performers || 0, 
      color: 'bg-rose-500',
      gradient: 'from-rose-500 to-red-600',
      percentage: total > 0 ? Math.round((data?.developing_performers || 0) / total * 100) : 0
    }
  ]

  return (
    <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm font-medium flex items-center space-x-2">
          <PieChart className="w-4 h-4" />
          <span>Performance Distribution</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {levels.map((level, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${level.color}`}></div>
                <span className="text-gray-300 text-xs">{level.label}</span>
              </div>
              <div className="text-white font-medium text-sm">
                {level.value} ({level.percentage}%)
              </div>
            </div>
            <Progress value={level.percentage} className="h-1 bg-gray-700" />
          </div>
        ))}
        <div className="pt-3 border-t border-white/10">
          <div className="text-center">
            <span className="text-xl font-bold text-white">{total}</span>
            <p className="text-gray-400 text-xs">Total Employees</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Skill gaps component
const SkillGaps = ({ gaps }: { gaps: any[] }) => (
  <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
    <CardHeader className="pb-3">
      <CardTitle className="text-white text-sm font-medium flex items-center space-x-2">
        <Target className="w-4 h-4" />
        <span>Critical Skill Gaps</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {gaps?.slice(0, 5).map((gap: any, index: number) => (
        <div key={index} className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <span className="text-white font-medium text-xs">{gap.skill_area}</span>
            <Badge className={`text-xs ${
              gap.gap_severity === 'critical' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
              gap.gap_severity === 'high' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
              'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
            }`}>
              {gap.gap_severity}
            </Badge>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Current: {(gap.current_proficiency * 100).toFixed(0)}%</span>
              <span>Target: {(gap.target_proficiency * 100).toFixed(0)}%</span>
            </div>
            <Progress 
              value={gap.current_proficiency * 100} 
              className="h-1 bg-gray-700"
            />
            <div className="text-xs text-gray-500">
              {gap.employees_affected} employees affected
            </div>
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
)

// Risk indicators component
const RiskIndicators = ({ risks }: { risks: any }) => (
  <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
    <CardHeader className="pb-3">
      <CardTitle className="text-white text-sm font-medium flex items-center space-x-2">
        <Shield className="w-4 h-4" />
        <span>Risk Indicators</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
          <div className="flex items-center space-x-2 mb-1">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-red-300 text-xs font-medium">High Risk</span>
          </div>
          <div className="text-white font-bold text-lg">{risks?.high_turnover_risk || 0}</div>
          <div className="text-red-300 text-xs">Employees</div>
        </div>
        
        <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
          <div className="flex items-center space-x-2 mb-1">
            <AlertCircle className="w-3 h-3 text-orange-400" />
            <span className="text-orange-300 text-xs font-medium">Skill Gaps</span>
          </div>
          <div className="text-white font-bold text-lg capitalize">{risks?.skill_gap_severity || 'Low'}</div>
          <div className="text-orange-300 text-xs">Severity</div>
        </div>
      </div>
    </CardContent>
  </Card>
)

// Team collaboration metrics
const CollaborationMetrics = ({ metrics }: { metrics: any }) => (
  <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
    <CardHeader className="pb-3">
      <CardTitle className="text-white text-sm font-medium flex items-center space-x-2">
        <Users2 className="w-4 h-4" />
        <span>Team Collaboration</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {Object.entries(metrics || {}).map(([key, value]: [string, any]) => (
        <div key={key} className="flex justify-between items-center p-2 bg-white/5 rounded">
          <span className="text-gray-300 text-xs capitalize">{key.replace(/_/g, ' ')}</span>
          <div className="flex items-center space-x-2">
            <div className="w-16 bg-gray-700 rounded-full h-1">
              <div 
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-1 rounded-full"
                style={{ width: `${(value * 100).toFixed(0)}%` }}
              />
            </div>
            <span className="text-white text-xs font-medium">{(value * 100).toFixed(0)}%</span>
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
)

export default function ViewerDashboard({ user }: ViewerDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")
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
      
      const storedAnalysisId = localStorage.getItem('currentAnalysisId')
      
      if (storedAnalysisId) {
        await loadSpecificAnalysis(storedAnalysisId)
        return
      }
      
      const activeResp = await fetch(`${API_BASE_URL}/analysis/dashboard/active`)
        .then(r => r.json())
        .catch(() => ({ success: false }))
      
      if (activeResp && activeResp.success && activeResp.data && activeResp.data.analysis_id) {
        const analysisId = activeResp.data.analysis_id
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
      const resultResp = await fetch(`${API_BASE_URL}/analysis/result/db/${encodeURIComponent(analysisId)}`)
      const resultData = await resultResp.json()
      
      if (resultData && resultData.success && resultData.data && resultData.data.dashboard_results) {
        setDashboardData(resultData.data.dashboard_results)
        setCurrentAnalysisId(analysisId)
        setLastUpdated(new Date(resultData.data.created_at))
        localStorage.setItem('currentAnalysisId', analysisId)
      } else {
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
          <div className="w-16 h-16 border-4 border-transparent border-t-blue-500 border-r-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-white text-xl font-semibold mb-2">Loading Dashboard</h2>
          <p className="text-gray-400">Fetching latest analysis data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="animated-bg"></div>
        <div className="relative z-10 text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">Dashboard Unavailable</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <Button onClick={refreshDashboard} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500">
            <RefreshCw className="w-4 h-4 mr-2" />
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
          <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-semibold mb-2">No Dashboard Data</h2>
          <p className="text-gray-300 mb-4">No dashboard analysis data is currently available.</p>
          <Button onClick={refreshDashboard} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500">
            <RefreshCw className="w-4 h-4 mr-2" />
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
    <div className="min-h-screen relative overflow-hidden">
      <div className="animated-bg"></div>

      <div className="relative z-10 p-4 lg:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white gradient-text-visible">
                Analytics Dashboard
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <p className="text-gray-300 text-sm">Real-time organizational insights</p>
                {currentAnalysisId && (
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                    ID: {currentAnalysisId.substr(-8)}
                  </Badge>
                )}
                {lastUpdated && (
                  <div className="flex items-center space-x-1 text-gray-400 text-xs">
                    <Calendar className="w-3 h-3" />
                    <span>{lastUpdated.toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
            <Button 
              onClick={refreshDashboard} 
              size="sm"
              className="glass border-white/20 text-white hover:bg-white/10 transition-all duration-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <MetricCard
            title="Total Employees"
            value={executiveData.total_employees || 0}
            subtitle="Assessed"
            icon={<Users className="w-5 h-5 text-white" />}
            gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
            trend="stable"
          />
          <MetricCard
            title="Avg Performance"
            value={Number(executiveData.average_performance || 0).toFixed(1)}
            subtitle="Overall score"
            icon={<TrendingUp className="w-5 h-5 text-white" />}
            gradient="bg-gradient-to-br from-green-500 to-emerald-500"
            trend="up"
            isPercentage={true}
          />
          <MetricCard
            title="Top Department"
            value={executiveData.top_performing_department || "N/A"}
            subtitle="Best performing"
            icon={<Award className="w-5 h-5 text-white" />}
            gradient="bg-gradient-to-br from-purple-500 to-pink-500"
          />
          <MetricCard
            title="Critical Gaps"
            value={skillData.skill_gaps?.filter((gap: any) => gap.gap_severity === 'critical').length || 0}
            subtitle="Need attention"
            icon={<AlertTriangle className="w-5 h-5 text-white" />}
            gradient="bg-gradient-to-br from-red-500 to-orange-500"
            trend="down"
          />
          <MetricCard
            title="High Risk"
            value={hrData.retention_risk?.high_risk_count || 0}
            subtitle="Employees"
            icon={<Shield className="w-5 h-5 text-white" />}
            gradient="bg-gradient-to-br from-yellow-500 to-orange-500"
          />
          <MetricCard
            title="Departments"
            value={executiveData.department_performance_ranking?.length || 0}
            subtitle="Analyzed"
            icon={<Building className="w-5 h-5 text-white" />}
            gradient="bg-gradient-to-br from-indigo-500 to-blue-500"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="glass border-white/20 bg-white/5 p-1 w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-white text-gray-300 text-xs">
              <BarChart3 className="w-3 h-3 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-white text-gray-300 text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="teams" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-white text-gray-300 text-xs">
              <Users className="w-3 h-3 mr-1" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="skills" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-white text-gray-300 text-xs">
              <Target className="w-3 h-3 mr-1" />
              Skills
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <PerformanceDistribution data={executiveData.performance_distribution} />
              <DepartmentRanking rankings={executiveData.department_performance_ranking} />
              <RiskIndicators risks={executiveData.risk_indicators} />
            </div>

            {/* Areas of Concern */}
            <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-medium flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Areas of Concern</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(executiveData.areas_of_concern || []).map((concern: string, index: number) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                      <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span className="text-orange-200 text-sm leading-relaxed">{concern}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Key Recommendations */}
            <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-medium flex items-center space-x-2">
                  <Lightbulb className="w-4 h-4" />
                  <span>Strategic Recommendations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(executiveData.key_recommendations || []).map((rec: string, index: number) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20 hover:bg-green-500/15 transition-colors">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <p className="text-green-200 text-sm leading-relaxed">{rec}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Workforce Analytics */}
              <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm font-medium flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>Workforce Analytics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <div className="text-white font-bold text-lg">{hrData.workforce_analytics?.total_assessed || 0}</div>
                      <div className="text-blue-300 text-xs">Total Assessed</div>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <div className="text-white font-bold text-lg">{hrData.workforce_analytics?.departments || 0}</div>
                      <div className="text-blue-300 text-xs">Departments</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Training Priorities */}
              <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm font-medium flex items-center space-x-2">
                    <BookOpen className="w-4 h-4" />
                    <span>Training Priorities</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(hrData.training_priorities || []).slice(0, 3).map((priority: string, index: number) => (
                    <div key={index} className="flex items-center space-x-3 p-2 bg-purple-500/10 rounded-lg">
                      <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="text-purple-200 text-xs">{priority}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Performance Gaps */}
            <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-medium flex items-center space-x-2">
                  <Target className="w-4 h-4" />
                  <span>Performance Gaps</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(hrData.performance_gaps || []).map((gap: any, index: number) => (
                    <div key={index} className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-white font-medium text-xs">{gap.competency}</h4>
                        <Badge className={`text-xs ${
                          gap.business_impact === 'high' ? 'bg-red-500/20 text-red-300' :
                          gap.business_impact === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-green-500/20 text-green-300'
                        }`}>
                          {gap.business_impact}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <Progress value={gap.gap_percentage} className="h-1 bg-gray-700" />
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>{gap.gap_percentage}% gap</span>
                          <span>{gap.affected_employees} affected</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DepartmentRanking rankings={teamData.team_performance_ranking} />
              <CollaborationMetrics metrics={teamData.collaboration_metrics} />
            </div>

            {/* Leadership Effectiveness */}
            <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-medium flex items-center space-x-2">
                  <Crown className="w-4 h-4" />
                  <span>Leadership Effectiveness</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(teamData.leadership_effectiveness || {}).map(([key, value]: [string, any]) => (
                    <div key={key} className="p-3 bg-purple-500/10 rounded-lg text-center">
                      <div className="text-white font-bold text-lg">{(value * 100).toFixed(0)}%</div>
                      <div className="text-purple-300 text-xs capitalize">{key.replace(/_/g, ' ')}</div>
                      <Progress value={value * 100} className="h-1 bg-gray-700 mt-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Team Dynamics */}
            <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-medium flex items-center space-x-2">
                  <Users2 className="w-4 h-4" />
                  <span>Team Dynamics Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(teamData.team_dynamics || []).map((dynamic: string, index: number) => (
                  <div key={index} className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                    <div className="flex items-start space-x-3">
                      <Eye className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                      <p className="text-indigo-200 text-sm leading-relaxed">{dynamic}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SkillGaps gaps={skillData.skill_gaps} />
              
              {/* Competency Analysis */}
              <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm font-medium flex items-center space-x-2">
                    <BarChart2 className="w-4 h-4" />
                    <span>Competency Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(skillData.competency_analysis || {}).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex justify-between items-center p-2 bg-white/5 rounded">
                      <span className="text-gray-300 text-xs capitalize">{key.replace(/_/g, ' ')}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-700 rounded-full h-1">
                          <div 
                            className="bg-gradient-to-r from-orange-500 to-red-400 h-1 rounded-full"
                            style={{ width: `${(value * 100).toFixed(0)}%` }}
                          />
                        </div>
                        <span className="text-white text-xs font-medium">{(value * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Development Pathways */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {Object.entries(skillData.development_pathways || {}).map(([category, pathways]: [string, any]) => (
                <Card key={category} className="glass border-white/10 hover:border-white/20 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-sm font-medium capitalize">
                      {category.replace('_', ' ')} Track
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {pathways.slice(0, 4).map((pathway: string, index: number) => (
                      <div key={index} className="flex items-start space-x-2 p-2 bg-purple-500/10 rounded">
                        <BookOpen className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                        <span className="text-purple-200 text-xs">{pathway}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Upskilling Priorities */}
            <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-medium flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span>Upskilling Priorities</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(skillData.upskilling_priorities || []).map((priority: string, index: number) => (
                    <div key={index} className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20 hover:bg-orange-500/15 transition-colors">
                      <div className="flex items-start space-x-2">
                        <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <p className="text-orange-200 text-xs leading-relaxed">{priority}</p>
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
  )
}