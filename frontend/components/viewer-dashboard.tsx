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
  Download,
  Presentation,
  UserSquare,
  Cpu,
  GraduationCap,
  Trophy
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

// Modern metric card with enhanced styling
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
  actionButton,
  textSize = "2xl"
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
  textSize?: string
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
    small: "p-4",
    default: "p-6",
    large: "p-8"
  }

  return (
    <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300 group hover:scale-[1.02] hover:shadow-2xl">
      <CardContent className={cardSizes[size]}>
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 ${gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
          {actionButton && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              {actionButton}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wide">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className={`text-${textSize} font-bold text-white leading-none`}>
              {typeof value === 'number' ? value.toLocaleString() : value}{isPercentage && '%'}
            </p>
            {trend && (
              <div className="flex items-center space-x-1">
                {getTrendIcon()}
                {change && <span className="text-sm text-gray-400">{change}</span>}
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Department ranking component with modern styling
const DepartmentRanking = ({ rankings, title = "Department Rankings" }: { rankings: any[], title?: string }) => (
  <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
    <CardHeader className="pb-4">
      <CardTitle className="text-white text-lg font-semibold flex items-center space-x-2">
        <Crown className="w-5 h-5 text-yellow-400" />
        <span>{title}</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {rankings?.map((dept: any, index: number) => (
        <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-200 group">
          <div className="flex items-center space-x-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all group-hover:scale-110 ${
              dept.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 shadow-yellow-400/25 shadow-lg' :
              dept.rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-gray-900 shadow-gray-400/25 shadow-lg' :
              dept.rank === 3 ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-orange-900 shadow-orange-400/25 shadow-lg' :
              'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-blue-500/25 shadow-lg'
            }`}>
              {dept.rank}
            </div>
            <div>
              <h4 className="text-white font-semibold text-base">{dept.department || dept.team_name}</h4>
              <p className="text-gray-400 text-sm">{dept.employee_count || dept.team_size} employees</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white font-bold text-lg">{typeof dept.avg_score === 'number' ? dept.avg_score.toFixed(1) : (dept.avg_performance * 100).toFixed(1)}%</div>
            <div className="flex items-center justify-end space-x-1 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-3 h-3 ${i < Math.floor((dept.avg_score || dept.avg_performance * 100) / 20) ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
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
      gradient: 'from-emerald-400 to-emerald-600',
      percentage: total > 0 ? Math.round((data?.high_performers || 0) / total * 100) : 0,
      bgClass: 'bg-emerald-500/10 border-emerald-500/20'
    },
    { 
      label: 'Core Performers', 
      value: data?.core_performers || 0, 
      color: 'bg-amber-500',
      gradient: 'from-amber-400 to-amber-600',
      percentage: total > 0 ? Math.round((data?.core_performers || 0) / total * 100) : 0,
      bgClass: 'bg-amber-500/10 border-amber-500/20'
    },
    { 
      label: 'Developing', 
      value: data?.developing_performers || 0, 
      color: 'bg-rose-500',
      gradient: 'from-rose-400 to-rose-600',
      percentage: total > 0 ? Math.round((data?.developing_performers || 0) / total * 100) : 0,
      bgClass: 'bg-rose-500/10 border-rose-500/20'
    }
  ]

  return (
    <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-white text-lg font-semibold flex items-center space-x-2">
          <PieChart className="w-5 h-5 text-blue-400" />
          <span>Performance Distribution</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {levels.map((level, index) => (
          <div key={index} className={`p-4 rounded-xl border ${level.bgClass} transition-all hover:scale-[1.02]`}>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${level.color} shadow-lg`}></div>
                <span className="text-white font-medium">{level.label}</span>
              </div>
              <div className="text-white font-bold text-lg">
                {level.value} ({level.percentage}%)
              </div>
            </div>
            <div className="relative">
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${level.gradient} transition-all duration-1000 ease-out`}
                  style={{ width: `${level.percentage}%` }}
                />
              </div>
            </div>
          </div>
        ))}
        <div className="pt-4 border-t border-white/10">
          <div className="text-center bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
            <span className="text-3xl font-bold text-white">{total}</span>
            <p className="text-blue-300 text-sm font-medium mt-1">Total Employees Assessed</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Areas of concern component
const AreasOfConcern = ({ concerns }: { concerns: string[] }) => (
  <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
    <CardHeader className="pb-4">
      <CardTitle className="text-white text-lg font-semibold flex items-center space-x-2">
        <AlertTriangle className="w-5 h-5 text-orange-400" />
        <span>Areas of Concern</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {concerns?.map((concern: string, index: number) => (
          <div key={index} className="flex items-start space-x-3 p-4 bg-orange-500/10 rounded-xl border border-orange-500/20 hover:bg-orange-500/15 transition-all">
            <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
            <span className="text-orange-100 text-sm leading-relaxed font-medium">{concern}</span>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

// Recommendations component
const Recommendations = ({ recommendations, title = "Strategic Recommendations" }: { recommendations: string[], title?: string }) => (
  <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
    <CardHeader className="pb-4">
      <CardTitle className="text-white text-lg font-semibold flex items-center space-x-2">
        <Lightbulb className="w-5 h-5 text-yellow-400" />
        <span>{title}</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {recommendations?.map((rec: string, index: number) => (
          <div key={index} className="flex items-start space-x-3 p-4 bg-green-500/10 rounded-xl border border-green-500/20 hover:bg-green-500/15 transition-all group">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
              {index + 1}
            </div>
            <p className="text-green-100 text-sm leading-relaxed font-medium">{rec}</p>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

// Skills gap component
const SkillGaps = ({ gaps, title = "Critical Skill Gaps" }: { gaps: any[], title?: string }) => (
  <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
    <CardHeader className="pb-4">
      <CardTitle className="text-white text-lg font-semibold flex items-center space-x-2">
        <Target className="w-5 h-5 text-red-400" />
        <span>{title}</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {gaps?.slice(0, 6).map((gap: any, index: number) => (
        <div key={index} className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-white/10 hover:border-white/20">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                gap.severity === 'critical' ? 'bg-red-500' :
                gap.severity === 'high' ? 'bg-orange-500' :
                gap.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
              }`}></div>
              <span className="text-white font-semibold text-sm">{gap.competency}</span>
            </div>
            <Badge className={`text-xs font-medium ${
              gap.severity === 'critical' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
              gap.severity === 'high' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
              gap.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
              'bg-green-500/20 text-green-300 border-green-500/30'
            }`}>
              {gap.severity}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="text-blue-300 text-xs font-medium mb-1">Best Performance</div>
              <div className="text-white font-bold">{gap.best_department}</div>
              <div className="text-blue-200 text-sm">{gap.best_score}% average</div>
            </div>
            <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="text-red-300 text-xs font-medium mb-1">Needs Improvement</div>
              <div className="text-white font-bold">{gap.worst_department}</div>
              <div className="text-red-200 text-sm">{gap.worst_score}% average</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Performance Gap: {gap.gap}%</span>
              <span>Severity: {gap.severity}</span>
            </div>
            <div className="relative">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    gap.severity === 'critical' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                    gap.severity === 'high' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                    gap.severity === 'medium' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                    'bg-gradient-to-r from-green-500 to-green-600'
                  }`}
                  style={{ width: `${Math.min(gap.gap * 5, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
)

// Competency matrix component
const CompetencyMatrix = ({ matrix }: { matrix: any }) => (
  <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
    <CardHeader className="pb-4">
      <CardTitle className="text-white text-lg font-semibold flex items-center space-x-2">
        <BarChart2 className="w-5 h-5 text-purple-400" />
        <span>Competency Matrix</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {Object.entries(matrix || {}).map(([dept, competencies]: [string, any]) => (
        <div key={dept} className="p-4 bg-white/5 rounded-xl border border-white/10">
          <h4 className="text-white font-semibold mb-3 text-base">{dept.replace(/_/g, ' ')}</h4>
          <div className="space-y-2">
            {Object.entries(competencies).map(([skill, score]: [string, any]) => (
              <div key={skill} className="flex justify-between items-center">
                <span className="text-gray-300 text-sm capitalize">{skill.replace(/_/g, ' ')}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-400 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${(score * 100).toFixed(0)}%` }}
                    />
                  </div>
                  <span className="text-white text-sm font-medium w-8">{(score * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
)

// Add new component for Top/Bottom Competencies
const TopBottomCompetencies = ({ data }: { data: any }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Top Competencies */}
    <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-white text-lg font-semibold flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <span>Top 5 Competencies</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data?.top_competencies?.map((comp: any, index: number) => (
          <div key={index} className="p-4 bg-green-500/10 rounded-xl border border-green-500/20 hover:bg-green-500/15 transition-all">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {index + 1}
                </div>
                <h4 className="text-green-100 font-semibold text-sm">{comp.competency}</h4>
              </div>
              <div className="text-green-300 font-bold text-lg">{comp.overall_average}%</div>
            </div>
            <div className="space-y-1">
              <Progress value={comp.overall_average} className="h-2 bg-gray-700" />
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.entries(comp.department_scores || {}).map(([dept, score]: [string, any]) => (
                  <div key={dept} className="text-xs text-green-200">
                    <span className="font-medium">{dept}:</span> {score}%
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>

    {/* Bottom Competencies */}
    <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-white text-lg font-semibold flex items-center space-x-2">
          <TrendingDown className="w-5 h-5 text-red-400" />
          <span>Bottom 5 Competencies</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data?.bottom_competencies?.map((comp: any, index: number) => (
          <div key={index} className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 hover:bg-red-500/15 transition-all">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {index + 1}
                </div>
                <h4 className="text-red-100 font-semibold text-sm">{comp.competency}</h4>
              </div>
              <div className="text-red-300 font-bold text-lg">{comp.overall_average}%</div>
            </div>
            <div className="space-y-1">
              <Progress value={comp.overall_average} className="h-2 bg-gray-700" />
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.entries(comp.department_scores || {}).map(([dept, score]: [string, any]) => (
                  <div key={dept} className="text-xs text-red-200">
                    <span className="font-medium">{dept}:</span> {score}%
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
)

// Add new component for Detailed Skill Gap Analysis
const DetailedSkillGapAnalysis = ({ gaps }: { gaps: any[] }) => (
  <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
    <CardHeader className="pb-4">
      <CardTitle className="text-white text-lg font-semibold flex items-center space-x-2">
        <BarChart3 className="w-5 h-5 text-blue-400" />
        <span>Detailed Skill Gap Analysis</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {gaps?.slice(0, 8).map((gap: any, index: number) => (
        <div key={index} className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-white/10 hover:border-white/20">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                gap.severity === 'critical' ? 'bg-red-500' :
                gap.severity === 'high' ? 'bg-orange-500' :
                gap.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
              }`}></div>
              <span className="text-white font-semibold text-sm">{gap.competency}</span>
            </div>
            <Badge className={`text-xs font-medium ${
              gap.severity === 'critical' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
              gap.severity === 'high' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
              gap.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
              'bg-green-500/20 text-green-300 border-green-500/30'
            }`}>
              {gap.severity}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="text-blue-300 text-xs font-medium mb-1">Best Performance</div>
              <div className="text-white font-bold">{gap.best_department}</div>
              <div className="text-blue-200 text-sm">{gap.best_score}% average</div>
            </div>
            <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="text-red-300 text-xs font-medium mb-1">Needs Improvement</div>
              <div className="text-white font-bold">{gap.worst_department}</div>
              <div className="text-red-200 text-sm">{gap.worst_score}% average</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Performance Gap: {gap.gap}%</span>
              <span>Severity: {gap.severity}</span>
            </div>
            <div className="relative">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    gap.severity === 'critical' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                    gap.severity === 'high' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                    gap.severity === 'medium' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                    'bg-gradient-to-r from-green-500 to-green-600'
                  }`}
                  style={{ width: `${Math.min(gap.gap * 5, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
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
          <div className="w-20 h-20 border-4 border-transparent border-t-blue-500 border-r-purple-500 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-white text-2xl font-bold mb-3">Loading Analytics Dashboard</h2>
          <p className="text-gray-400 text-lg">Fetching latest organizational insights...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="animated-bg"></div>
        <div className="relative z-10 text-center max-w-md">
          <AlertTriangle className="w-20 h-20 text-red-400 mx-auto mb-6" />
          <h2 className="text-white text-2xl font-bold mb-3">Dashboard Unavailable</h2>
          <p className="text-gray-300 mb-6 text-lg">{error}</p>
          <Button onClick={refreshDashboard} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-3">
            <RefreshCw className="w-5 h-5 mr-2" />
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
          <Brain className="w-20 h-20 text-gray-400 mx-auto mb-6" />
          <h2 className="text-white text-2xl font-bold mb-3">No Dashboard Data</h2>
          <p className="text-gray-300 mb-6 text-lg">No dashboard analysis data is currently available.</p>
          <Button onClick={refreshDashboard} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-3">
            <RefreshCw className="w-5 h-5 mr-2" />
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

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold text-white gradient-text-visible mb-2">
                Analytics Intelligence Dashboard
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <p className="text-gray-300 text-lg">Real-time organizational performance insights</p>
                {currentAnalysisId && (
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-sm px-3 py-1">
                    Analysis ID: {currentAnalysisId.substr(-8)}
                  </Badge>
                )}
                {lastUpdated && (
                  <div className="flex items-center space-x-2 text-gray-400 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>Updated: {lastUpdated.toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
            <Button 
              onClick={refreshDashboard} 
              size="lg"
              className="glass border-white/20 text-white hover:bg-white/10 transition-all duration-300 px-6 py-3"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total Employees"
            value={executiveData.total_employees || 0}
            subtitle="Organization wide"
            icon={<Users className="w-6 h-6 text-white" />}
            gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
            trend="stable"
          />
          <MetricCard
            title="Avg Performance"
            value={Number(executiveData.average_performance || 0)}
            subtitle="Overall score"
            icon={<TrendingUp className="w-6 h-6 text-white" />}
            gradient="bg-gradient-to-br from-green-500 to-emerald-500"
            trend={executiveData.average_performance > 70 ? "up" : "down"}
            isPercentage={true}
          />
          <MetricCard
            title="Top Department"
            value={executiveData.top_performing_department || "N/A"}
            subtitle="Leading team"
            icon={<Award className="w-6 h-6 text-white" />}
            gradient="bg-gradient-to-br from-purple-500 to-pink-500"
            textSize="lg"
          />
          <MetricCard
            title="Critical Areas"
            value={executiveData.areas_of_concern?.length || 0}
            subtitle="Need attention"
            icon={<AlertTriangle className="w-6 h-6 text-white" />}
            gradient="bg-gradient-to-br from-red-500 to-orange-500"
            trend="down"
          />
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass border-white/20 bg-white/5 p-2 w-full justify-start">
            <TabsTrigger value="executive" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-white text-gray-300 px-6 py-3 text-base font-medium">
              <Presentation className="w-5 h-5 mr-2" />
              Executive Overview
            </TabsTrigger>
            <TabsTrigger value="hr" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-white text-gray-300 px-6 py-3 text-base font-medium">
              <UserSquare className="w-5 h-5 mr-2" />
              HR Analytics
            </TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-white text-gray-300 px-6 py-3 text-base font-medium">
              <Users2 className="w-5 h-5 mr-2" />
              Team Management
            </TabsTrigger>
            <TabsTrigger value="skill" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-white text-gray-300 px-6 py-3 text-base font-medium">
              <GraduationCap className="w-5 h-5 mr-2" />
              Skill Intelligence
            </TabsTrigger>
          </TabsList>

          {/* Executive Overview Tab */}
          <TabsContent value="executive" className="space-y-6">
            {/* Top Row - Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Departments"
                value={executiveData.department_performance_ranking?.length || 0}
                subtitle="Analyzed units"
                icon={<Building className="w-6 h-6 text-white" />}
                gradient="bg-gradient-to-br from-indigo-500 to-blue-500"
              />
              <MetricCard
                title="Performance Variance"
                value={Number(executiveData.performance_variance || 0).toFixed(2)}
                subtitle="Consistency metric"
                icon={<Gauge className="w-6 h-6 text-white" />}
                gradient="bg-gradient-to-br from-teal-500 to-cyan-500"
              />
              <MetricCard
                title="High Performers"
                value={executiveData.performance_distribution?.high_performers || 0}
                subtitle="Top tier talent"
                icon={<Star className="w-6 h-6 text-white" />}
                gradient="bg-gradient-to-br from-yellow-500 to-orange-500"
              />
              <MetricCard
                title="Developing Staff"
                value={executiveData.performance_distribution?.developing_performers || 0}
                subtitle="Growth opportunities"
                icon={<TrendingUp className="w-6 h-6 text-white" />}
                gradient="bg-gradient-to-br from-rose-500 to-pink-500"
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <PerformanceDistribution data={executiveData.performance_distribution} />
              <DepartmentRanking rankings={executiveData.department_performance_ranking} />
              
              {/* Risk Indicators Card */}
              <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-white text-lg font-semibold flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-red-400" />
                    <span>Risk Indicators</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-red-300 text-sm font-medium">Skill Gap Severity</span>
                    </div>
                    <div className="text-white font-bold text-xl capitalize">
                      {executiveData.risk_indicators?.skill_gap_severity || 'Unknown'}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-4 h-4 text-orange-400" />
                      <span className="text-orange-300 text-sm font-medium">Turnover Risk</span>
                    </div>
                    <div className="text-white font-bold text-lg">
                      {executiveData.risk_indicators?.high_turnover_risk || 'Monitoring Required'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Areas of Concern and Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AreasOfConcern concerns={executiveData.areas_of_concern} />
              <Recommendations recommendations={executiveData.key_recommendations} />
            </div>
          </TabsContent>

          {/* HR Analytics Tab */}
          <TabsContent value="hr" className="space-y-6">
            {/* HR Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Assessed"
                value={hrData.workforce_analytics?.total_assessed || 0}
                subtitle="Workforce coverage"
                icon={<Users className="w-6 h-6 text-white" />}
                gradient="bg-gradient-to-br from-blue-500 to-indigo-500"
              />
              <MetricCard
                title="High Potential"
                value={hrData.talent_segmentation?.high_potential || 0}
                subtitle="Future leaders"
                icon={<Crown className="w-6 h-6 text-white" />}
                gradient="bg-gradient-to-br from-yellow-500 to-orange-500"
              />
              <MetricCard
                title="Development Needed"
                value={hrData.talent_segmentation?.development_needed || 0}
                subtitle="Training priority"
                icon={<BookOpen className="w-6 h-6 text-white" />}
                gradient="bg-gradient-to-br from-purple-500 to-pink-500"
              />
              <MetricCard
                title="Skill Gaps Found"
                value={hrData.skill_gap_analysis?.length || 0}
                subtitle="Areas analyzed"
                icon={<Target className="w-6 h-6 text-white" />}
                gradient="bg-gradient-to-br from-green-500 to-teal-500"
              />
            </div>

            {/* Top/Bottom Competencies Section */}
            {hrData.top_5_bottom_5 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-red-500 rounded-full"></div>
                  <h3 className="text-white text-xl font-bold">Competency Performance Analysis</h3>
                </div>
                <TopBottomCompetencies data={hrData.top_5_bottom_5} />
              </div>
            )}

            {/* Detailed Skill Gap Analysis */}
            {hrData.skill_gap_analysis && hrData.skill_gap_analysis.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                  <h3 className="text-white text-xl font-bold">Cross-Department Skill Analysis</h3>
                </div>
                <DetailedSkillGapAnalysis gaps={hrData.skill_gap_analysis} />
              </div>
            )}

            {/* Existing HR Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SkillGaps gaps={hrData.performance_gaps} title="Performance Gaps" />
              <Recommendations recommendations={hrData.training_priorities} title="Training Priorities" />
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Recommendations recommendations={hrData.recommended_actions} title="HR Action Items" />
              
              {/* Talent Segmentation */}
              <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-white text-lg font-semibold flex items-center space-x-2">
                    <UserCheck className="w-5 h-5 text-blue-400" />
                    <span>Talent Segmentation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(hrData.talent_segmentation || {}).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex justify-between items-center p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                      <span className="text-gray-300 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-white font-bold text-lg">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Team Management Tab */}
          <TabsContent value="team" className="space-y-6">
            {/* Team Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Team Synergy"
                value={(teamData.collaboration_metrics?.cross_team_synergy * 100 || 0).toFixed(0)}
                subtitle="Cross-team collaboration"
                icon={<Users2 className="w-6 h-6 text-white" />}
                gradient="bg-gradient-to-br from-purple-500 to-indigo-500"
                isPercentage={true}
              />
              <MetricCard
                title="Communication"
                value={(teamData.collaboration_metrics?.communication_effectiveness * 100 || 0).toFixed(0)}
                subtitle="Effectiveness score"
                icon={<MessageCircle className="w-6 h-6 text-white" />}
                gradient="bg-gradient-to-br from-green-500 to-emerald-500"
                isPercentage={true}
              />
              <MetricCard
                title="Leadership Ready"
                value={teamData.leadership_pipeline?.ready_now || 0}
                subtitle="Immediate promotion"
                icon={<Crown className="w-6 h-6 text-white" />}
                gradient="bg-gradient-to-br from-yellow-500 to-orange-500"
              />
              <MetricCard
                title="Innovation Index"
                value={(teamData.innovation_indicators?.creative_problem_solving * 100 || 0).toFixed(0)}
                subtitle="Creative capability"
                icon={<Zap className="w-6 h-6 text-white" />}
                gradient="bg-gradient-to-br from-pink-500 to-rose-500"
                isPercentage={true}
              />
            </div>

            {/* Team Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DepartmentRanking rankings={teamData.team_performance_ranking} title="Team Performance Ranking" />
              
              {/* Leadership Effectiveness */}
              <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-white text-lg font-semibold flex items-center space-x-2">
                    <Crown className="w-5 h-5 text-purple-400" />
                    <span>Leadership Effectiveness</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    {Object.entries(teamData.leadership_effectiveness || {}).map(([key, value]: [string, any]) => (
                      <div key={key} className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-purple-200 font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="text-white font-bold text-lg">{(value * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={value * 100} className="h-2 bg-gray-700" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Team Dynamics */}
            <Card className="glass border-white/10 hover:border-white/20 transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-lg font-semibold flex items-center space-x-2">
                  <Eye className="w-5 h-5 text-cyan-400" />
                  <span>Team Dynamics Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(teamData.team_dynamics || []).map((dynamic: string, index: number) => (
                  <div key={index} className="p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                    <div className="flex items-start space-x-3">
                      <Eye className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <p className="text-cyan-100 text-sm leading-relaxed font-medium">{dynamic}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Skill Intelligence Tab */}
          <TabsContent value="skill" className="space-y-6">
            {/* Skill Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Technical Skills"
                value={(skillData.competency_analysis?.technical_skills * 100 || 0).toFixed(0)}
                subtitle="Overall proficiency"
                icon={<Cpu className="w-6 h-6 text-white" />}
                gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
                isPercentage={true}
              />
              <MetricCard
                title="Leadership Skills"
                value={(skillData.competency_analysis?.leadership_competencies * 100 || 0).toFixed(0)}
                subtitle="Management capability"
                icon={<Crown className="w-6 h-6 text-white" />}
                gradient="bg-gradient-to-br from-purple-500 to-pink-500"
                isPercentage={true}
              />
              <MetricCard
                title="Customer Service"
                value={(skillData.competency_analysis?.customer_service * 100 || 0).toFixed(0)}
                subtitle="Service excellence"
                icon={<Heart className="w-6 h-6 text-white" />}
                gradient="bg-gradient-to-br from-green-500 to-emerald-500"
                isPercentage={true}
              />
              <MetricCard
                title="Problem Solving"
                value={(skillData.competency_analysis?.problem_solving * 100 || 0).toFixed(0)}
                subtitle="Analytical thinking"
                icon={<Brain className="w-6 h-6 text-white" />}
                gradient="bg-gradient-to-br from-orange-500 to-red-500"
                isPercentage={true}
              />
            </div>

            {/* Skill Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SkillGaps gaps={skillData.skill_gaps} />
              <CompetencyMatrix matrix={skillData.competency_matrix} />
            </div>

            {/* Development Pathways */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {Object.entries(skillData.development_pathways || {}).map(([category, pathways]: [string, any]) => (
                <Card key={category} className="glass border-white/10 hover:border-white/20 transition-all duration-300">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-white text-lg font-semibold capitalize">
                      {category.replace('_', ' ')} Track
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pathways.slice(0, 4).map((pathway: string, index: number) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                        <BookOpen className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                        <span className="text-orange-200 text-sm font-medium">{pathway}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Bottom Row - Upskilling and Future Skills */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Recommendations recommendations={skillData.upskilling_priorities} title="Upskilling Priorities" />
              <Recommendations recommendations={skillData.future_skill_requirements} title="Future Skill Requirements" />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}