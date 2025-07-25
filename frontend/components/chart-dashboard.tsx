"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Download, Maximize2, MoreHorizontal, Eye, EyeOff } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ChartDashboardProps {
  charts: any[]
  onRefresh: () => void
  isLoading: boolean
  csvUploaded?: boolean
  onShowUpload?: () => void
  disabledCharts?: Set<number>
  onToggleChart?: (containerId: number) => void
}

const CHART_CONTAINERS = [
  { id: 1, name: "Individual Skill Profile", type: "radar", defaultTitle: "Employee Competency Radar" },
  { id: 2, name: "Team Gap Overview", type: "heatmap", defaultTitle: "Skills Gap Heatmap" },
  { id: 3, name: "Top Performers Analysis", type: "bubble", defaultTitle: "Performance Analysis" },
  { id: 4, name: "Skill Distribution", type: "boxplot", defaultTitle: "Skill Distribution Analysis" },
  { id: 5, name: "Competency Trends", type: "line", defaultTitle: "Performance Trends" },
  { id: 6, name: "Performance Matrix", type: "matrix", defaultTitle: "Competency Matrix" },
]

export default function ChartDashboard({
  charts,
  onRefresh,
  isLoading,
  csvUploaded = false,
  onShowUpload,
  disabledCharts = new Set(),
  onToggleChart,
}: ChartDashboardProps) {
  const [expandedChart, setExpandedChart] = useState<number | null>(null)
  // const [disabledCharts, setDisabledCharts] = useState<Set<number>>(new Set())

  const getChartForContainer = (containerId: number) => {
    return charts.find((chart) => chart.containerId === containerId) || null
  }

  const getChartTypeIcon = (type: string) => {
    switch (type) {
      case "radar":
        return "🎯"
      case "heatmap":
        return "🔥"
      case "bubble":
        return "💫"
      case "boxplot":
        return "📊"
      case "line":
        return "📈"
      case "matrix":
        return "🔲"
      default:
        return "📊"
    }
  }

  const toggleChart = (containerId: number) => {
    if (onToggleChart) {
      onToggleChart(containerId)
    }
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Performance Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">
              AI-powered insights into your team's competencies and development areas
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-6 bg-white px-6 py-3 rounded-lg border border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{charts.length}</div>
                <div className="text-sm text-gray-500">Active Charts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">Live</div>
                <div className="text-sm text-gray-500">Real-time Data</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">10</div>
                <div className="text-sm text-gray-500">Employees</div>
              </div>
            </div>
            <Button
              onClick={onRefresh}
              disabled={isLoading}
              variant="outline"
              className="glass border-white/20 text-white hover:bg-white/10 btn-3d bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {CHART_CONTAINERS.map((container) => {
          const chart = getChartForContainer(container.id)

          return (
            <Card
              key={container.id}
              className={`bg-white border border-gray-200 hover:shadow-lg transition-all duration-200 ${
                expandedChart === container.id ? "col-span-full row-span-2" : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <span className="text-indigo-600 font-semibold text-sm">{getChartTypeIcon(container.type)}</span>
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {chart?.title || container.defaultTitle}
                      </CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {container.type}
                        </Badge>
                        {chart && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                            Generated
                          </Badge>
                        )}
                        {disabledCharts.has(container.id) && (
                          <Badge variant="destructive" className="text-xs">
                            Disabled
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toggleChart(container.id)}>
                        {disabledCharts.has(container.id) ? (
                          <>
                            <Eye className="mr-2 h-4 w-4" />
                            Enable Chart
                          </>
                        ) : (
                          <>
                            <EyeOff className="mr-2 h-4 w-4" />
                            Disable Chart
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setExpandedChart(expandedChart === container.id ? null : container.id)}
                      >
                        <Maximize2 className="mr-2 h-4 w-4" />
                        {expandedChart === container.id ? "Minimize" : "Expand"}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent>
                <div
                  className={`bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center ${
                    expandedChart === container.id ? "h-96" : "h-64"
                  } ${disabledCharts.has(container.id) ? "opacity-50 grayscale" : ""}`}
                >
                  {disabledCharts.has(container.id) ? (
                    <div className="text-center text-gray-400">
                      <div className="text-4xl mb-2">🚫</div>
                      <div className="font-medium">Chart Disabled</div>
                      <div className="text-sm mt-1">Click the menu to enable</div>
                    </div>
                  ) : chart ? (
                    <div className="w-full h-full p-4" dangerouslySetInnerHTML={{ __html: chart.chartCode }} />
                  ) : (
                    <div className="text-center text-gray-500">
                      <div className="text-4xl mb-2">{getChartTypeIcon(container.type)}</div>
                      <div className="font-medium">{container.name}</div>
                      <div className="text-sm mt-1">Use AI Generator to create this chart</div>
                    </div>
                  )}
                </div>

                {chart && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm font-medium text-blue-800 mb-1">Key Insights</div>
                    <div className="text-sm text-blue-700">
                      {chart.insights || "AI-generated insights will appear here"}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {!csvUploaded && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">Upload CSV Data to Get Started</h3>
          <p className="text-gray-500 mb-6">
            Upload your employee performance CSV file to generate AI-powered analytics
          </p>
          <button
            onClick={onShowUpload}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Upload CSV File
          </button>
        </div>
      )}

      {csvUploaded && charts.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No charts generated yet</h3>
          <p className="text-gray-500 mb-6">Use the AI Chart Generator to create your first analysis</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {CHART_CONTAINERS.slice(0, 6).map((container) => (
              <div key={container.id} className="p-4 bg-white rounded-lg border border-gray-200">
                <div className="text-2xl mb-2">{getChartTypeIcon(container.type)}</div>
                <div className="text-sm font-medium text-gray-900">{container.name}</div>
                <div className="text-xs text-gray-500 mt-1">{container.type}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
