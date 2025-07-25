"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Eye,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  Users,
  Brain,
  FileText,
  BarChart3,
  Activity,
  AlertTriangle,
  CheckCircle,
  ClipboardCheck,
  BookOpen,
  Target,
  BarChart,
} from "lucide-react"
import ComingSoonModal from "./coming-soon-modal"

interface ViewerDashboardProps {
  user: any
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

export default function ViewerDashboard({ user }: ViewerDashboardProps) {
  const [analyses, setAnalyses] = useState<any[]>([])
  const [filteredAnalyses, setFilteredAnalyses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [activeModal, setActiveModal] = useState<string | null>(null)

  useEffect(() => {
    // Load analyses from localStorage (in a real app, this would be from an API)
    const savedAnalyses = localStorage.getItem("analyses")
    if (savedAnalyses) {
      const parsedAnalyses = JSON.parse(savedAnalyses)
      setAnalyses(parsedAnalyses)
      setFilteredAnalyses(parsedAnalyses)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Filter analyses based on search and type
    let filtered = analyses

    if (searchQuery) {
      filtered = filtered.filter(
        (analysis) =>
          analysis.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          analysis.insights.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (selectedType !== "all") {
      filtered = filtered.filter((analysis) => analysis.type === selectedType)
    }

    setFilteredAnalyses(filtered)
  }, [analyses, searchQuery, selectedType])

  const getAnalysisIcon = (type: string) => {
    switch (type) {
      case "performance_gaps":
        return <AlertTriangle className="h-5 w-5" />
      case "top_performers":
        return <TrendingUp className="h-5 w-5" />
      case "team_dynamics":
        return <Users className="h-5 w-5" />
      case "skill_trends":
        return <Brain className="h-5 w-5" />
      case "roi_analysis":
        return <BarChart3 className="h-5 w-5" />
      case "retention_risk":
        return <Activity className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const getAnalysisColor = (type: string) => {
    switch (type) {
      case "performance_gaps":
        return "from-red-500 to-orange-500"
      case "top_performers":
        return "from-green-500 to-emerald-500"
      case "team_dynamics":
        return "from-blue-500 to-cyan-500"
      case "skill_trends":
        return "from-purple-500 to-pink-500"
      case "roi_analysis":
        return "from-indigo-500 to-blue-500"
      case "retention_risk":
        return "from-yellow-500 to-orange-500"
      default:
        return "from-gray-500 to-gray-600"
    }
  }

  const analysisTypes = [
    { id: "all", name: "All Analyses" },
    { id: "performance_gaps", name: "Performance Gaps" },
    { id: "top_performers", name: "Top Performers" },
    { id: "team_dynamics", name: "Team Dynamics" },
    { id: "skill_trends", name: "Skill Trends" },
    { id: "roi_analysis", name: "ROI Analysis" },
    { id: "retention_risk", name: "Retention Risk" },
  ]

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
                  <h1 className="text-3xl font-bold text-white gradient-text-visible">Analysis Dashboard</h1>
                  <p className="text-gray-300 mt-2">View AI-generated insights and performance analyses</p>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center space-x-4">
                  <div className="glass px-4 py-3 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">{analyses.length}</div>
                        <div className="text-xs text-gray-300">Total Analyses</div>
                      </div>
                    </div>
                  </div>

                  <div className="glass px-4 py-3 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                        <Eye className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">Viewer</div>
                        <div className="text-xs text-gray-300">Access Level</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filter */}
            <Card className="glass border-white/20 mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search analyses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 glass border-white/20 text-white placeholder-gray-400 bg-white/5"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="glass border-white/20 text-white bg-white/5 px-3 py-2 rounded-lg"
                    >
                      {analysisTypes.map((type) => (
                        <option key={type.id} value={type.id} className="bg-gray-800">
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Analyses Grid */}
            {filteredAnalyses.length === 0 ? (
              <Card className="glass border-white/20">
                <CardContent className="pt-6">
                  <div className="text-center py-16">
                    <h3 className="text-xl font-medium text-white mb-2">
                      {analyses.length === 0 ? "No analyses available" : "No analyses match your search"}
                    </h3>
                    <p className="text-gray-400">
                      {analyses.length === 0
                        ? "Ask an admin to generate some analyses for you to view"
                        : "Try adjusting your search criteria or filters"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {filteredAnalyses.map((analysis, index) => (
                  <Card
                    key={index}
                    className="glass border-white/20 hover:border-white/30 transition-all duration-300 card-3d"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div
                            className={`p-3 rounded-lg bg-gradient-to-r ${getAnalysisColor(analysis.type)} text-white`}
                          >
                            {getAnalysisIcon(analysis.type)}
                          </div>
                          <div>
                            <CardTitle className="text-xl text-white mb-2">{analysis.title}</CardTitle>
                            <p className="text-gray-400 text-sm">{analysis.prompt}</p>
                            <div className="flex items-center space-x-4 mt-2">
                              <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Generated
                              </Badge>
                              <div className="flex items-center text-xs text-gray-400">
                                <Calendar className="h-3 w-3 mr-1" />
                                {analysis.timestamp}
                              </div>
                              {analysis.dataPoints && (
                                <div className="flex items-center text-xs text-gray-400">
                                  <Users className="h-3 w-3 mr-1" />
                                  {analysis.dataPoints} employees
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      {/* AI Insights */}
                      <div className="mb-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <h4 className="font-semibold text-blue-300 mb-2 flex items-center">
                          <Brain className="h-4 w-4 mr-2" />
                          AI Insights
                        </h4>
                        <p className="text-blue-200 leading-relaxed">{analysis.insights}</p>
                      </div>

                      {/* Recommendations */}
                      {analysis.recommendations && (
                        <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                          <h4 className="font-semibold text-green-300 mb-2 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Recommendations
                          </h4>
                          <ul className="space-y-1">
                            {analysis.recommendations.map((rec: string, i: number) => (
                              <li key={i} className="text-green-200 text-sm flex items-start">
                                <span className="text-green-400 mr-2">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
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
