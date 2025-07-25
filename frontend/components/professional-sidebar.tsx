"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Building,
  PieChartIcon as ChartPie,
  Bot,
  Zap,
  Users,
  Target,
  AlertCircle,
  Settings,
  ClipboardCheck,
  BookOpen,
  TrendingUp,
} from "lucide-react"
import ChartManagementPanel from "./chart-management-panel"
import SampleCSVGenerator from "./sample-csv-generator"
import ComingSoonModal from "./coming-soon-modal"

interface SidebarProps {
  selectedDepartment: string
  onDepartmentChange: (department: string) => void
  onGenerateChart: (prompt: string) => void
  isGenerating: boolean
  analytics: any
  user: any
  charts: any[]
  disabledCharts: Set<number>
  onToggleChart: (containerId: number) => void
  onClearChart: (containerId: number) => void
  onRegenerateChart: (containerId: number) => void
  onShowUserManagement?: () => void
}

const CHART_PAIRINGS = [
  {
    name: "Individual Skill Profile",
    type: "Radar Chart",
    description: "Compare multiple competencies per employee",
    prompt: "Create a radar chart showing individual employee competencies across 5-8 key skills",
  },
  {
    name: "Team Gap Overview",
    type: "Heatmap + Bar Chart",
    description: "Show strengths and weaknesses across team",
    prompt: "Generate a heatmap showing all employees vs competencies with gap analysis",
  },
  {
    name: "Skill Distribution",
    type: "Box Plot",
    description: "Statistical distribution of skills",
    prompt: "Create a box plot showing skill score distribution across the organization",
  },
  {
    name: "Competency Trends",
    type: "Line Chart",
    description: "Track performance over time",
    prompt: "Generate a line chart showing competency development trends over time",
  },
  {
    name: "Top Performers Analysis",
    type: "Bar Chart / Bubble Chart",
    description: "Highlight best performers",
    prompt: "Create a bubble chart showing competency vs score vs importance for top performers",
  },
  {
    name: "Performance Matrix",
    type: "Heatmap",
    description: "Matrix view of all competencies",
    prompt: "Generate a comprehensive heatmap showing performance gaps at a glance",
  },
]

const DISABLED_FEATURES = [
  {
    id: "assessment",
    name: "Conduct Assessment",
    icon: <ClipboardCheck className="h-5 w-5" />,
    description:
      "Create and manage comprehensive skill assessments for your team members. Design custom evaluation criteria and track assessment results over time.",
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "training",
    name: "Training Plan",
    icon: <BookOpen className="h-5 w-5" />,
    description:
      "Generate personalized training plans based on skill gaps and career goals. Access curated learning resources and track training progress.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "tracking",
    name: "Performance Tracking",
    icon: <TrendingUp className="h-5 w-5" />,
    description:
      "Monitor employee performance metrics in real-time. Set goals, track milestones, and generate detailed performance reports.",
    color: "from-purple-500 to-pink-500",
  },
]

export default function ProfessionalSidebar({
  selectedDepartment,
  onDepartmentChange,
  onGenerateChart,
  isGenerating,
  analytics,
  user,
  charts,
  disabledCharts,
  onToggleChart,
  onClearChart,
  onRegenerateChart,
  onShowUserManagement,
}: SidebarProps) {
  const [chartPrompt, setChartPrompt] = useState("")
  const [selectedPairing, setSelectedPairing] = useState("")
  const [activeModal, setActiveModal] = useState<string | null>(null)

  const isAdmin = user?.role === "admin"

  const departments = [
    { id: "all", name: "All Departments" },
    { id: "engineering", name: "Engineering" },
    { id: "marketing", name: "Marketing" },
    { id: "sales", name: "Sales" },
    { id: "hr", name: "Human Resources" },
    ...(analytics?.departments || []).map((dept: string) => ({
      id: dept.toLowerCase(),
      name: dept,
    })),
  ]

  const uniqueDepartments = departments.filter((dept, index, self) => index === self.findIndex((d) => d.id === dept.id))

  const handleGenerateChart = () => {
    const prompt = selectedPairing || chartPrompt.trim()
    if (prompt) {
      onGenerateChart(prompt)
      setChartPrompt("")
      setSelectedPairing("")
    }
  }

  const handlePairingSelect = (pairing: any) => {
    setSelectedPairing(pairing.prompt)
    setChartPrompt(pairing.prompt)
  }

  const handleFeatureClick = (featureId: string) => {
    setActiveModal(featureId)
  }

  const getActiveModalData = () => {
    return DISABLED_FEATURES.find((feature) => feature.id === activeModal)
  }

  return (
    <>
      <aside className="w-80 bg-slate-50 border-r border-gray-200 overflow-y-auto">
        {/* Department Navigation */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center">
            <Building className="mr-2 h-4 w-4" />
            Departments
          </h3>
          <ul className="space-y-1">
            {uniqueDepartments.map((dept) => (
              <li
                key={dept.id}
                className={`px-4 py-3 rounded-lg cursor-pointer transition-all text-sm ${
                  selectedDepartment === dept.id
                    ? "text-indigo-700 bg-indigo-50 border-l-4 border-indigo-600 font-medium"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
                onClick={() => onDepartmentChange(dept.id)}
              >
                {dept.name}
              </li>
            ))}
          </ul>
        </div>

        {/* Coming Soon Features */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Advanced Features</h3>
          <div className="space-y-3">
            {DISABLED_FEATURES.map((feature) => (
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

        {/* Admin Only: Chart Pairings */}
        {isAdmin && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Chart Templates</h3>
            <div className="space-y-2">
              {CHART_PAIRINGS.map((pairing, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedPairing === pairing.prompt
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={() => handlePairingSelect(pairing)}
                >
                  <div className="font-medium text-sm text-gray-900">{pairing.name}</div>
                  <div className="text-xs text-indigo-600 font-medium">{pairing.type}</div>
                  <div className="text-xs text-gray-500 mt-1">{pairing.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Only: AI Chart Generation */}
        {isAdmin && (
          <div className="p-6 border-b border-gray-200">
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center text-gray-700">
                  <Bot className="mr-2 h-4 w-4 text-indigo-600" />
                  AI Chart Generator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Custom prompt: Describe the specific analysis you want to generate..."
                  value={chartPrompt}
                  onChange={(e) => setChartPrompt(e.target.value)}
                  className="resize-none text-sm border-gray-200 focus:border-indigo-500"
                  rows={4}
                />
                <Button
                  onClick={handleGenerateChart}
                  disabled={!chartPrompt.trim() || isGenerating}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-sm"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  {isGenerating ? "Generating..." : "Generate Chart"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Admin Only: Chart Management Panel */}
        {isAdmin && (
          <div className="p-6 border-b border-gray-200">
            <ChartManagementPanel
              charts={charts}
              disabledCharts={disabledCharts}
              onToggleChart={onToggleChart}
              onClearChart={onClearChart}
              onRegenerateChart={onRegenerateChart}
            />
          </div>
        )}

        {/* Admin Only: User Management */}
        {isAdmin && onShowUserManagement && (
          <div className="p-6 border-b border-gray-200">
            <Button onClick={onShowUserManagement} variant="outline" className="w-full justify-start bg-transparent">
              <Settings className="mr-2 h-4 w-4" />
              User Management
            </Button>
          </div>
        )}

        {/* Admin Only: Sample CSV Generator */}
        {isAdmin && (
          <div className="p-6 border-b border-gray-200">
            <SampleCSVGenerator />
          </div>
        )}

        {/* Quick Stats */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center">
            <ChartPie className="mr-2 h-4 w-4" />
            Quick Stats
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
              <span className="text-sm text-gray-600 flex items-center">
                <Users className="mr-2 h-4 w-4" />
                Total Employees
              </span>
              <Badge variant="secondary" className="font-semibold text-indigo-600">
                {analytics?.totalEmployees || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
              <span className="text-sm text-gray-600 flex items-center">
                <Target className="mr-2 h-4 w-4" />
                Avg Performance
              </span>
              <Badge variant="secondary" className="font-semibold text-green-600">
                {analytics?.avgPerformance || 0}%
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
              <span className="text-sm text-gray-600">Top Performers</span>
              <Badge variant="secondary" className="font-semibold text-blue-600">
                {analytics?.performanceDistribution?.good || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
              <span className="text-sm text-gray-600">Need Action</span>
              <Badge variant="secondary" className="font-semibold text-red-600">
                {analytics?.performanceDistribution?.immediate || 0}
              </Badge>
            </div>
          </div>
        </div>

        {/* Performance Thresholds */}
        <div className="p-6">
          <Card className="bg-amber-50 border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center text-gray-700">
                <AlertCircle className="mr-2 h-4 w-4 text-amber-600" />
                Performance Thresholds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                <span className="text-gray-600">0-50%: Immediate Action</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
                <span className="text-gray-600">51-69%: Push Required</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                <span className="text-gray-600">70%+: Good Performance</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Viewer Notice */}
        {!isAdmin && (
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
        )}
      </aside>

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
