"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Eye, EyeOff, Settings, RotateCcw } from "lucide-react"

interface ChartManagementPanelProps {
  charts: any[]
  disabledCharts: Set<number>
  onToggleChart: (containerId: number) => void
  onClearChart: (containerId: number) => void
  onRegenerateChart: (containerId: number) => void
}

const CHART_CONTAINERS = [
  { id: 1, name: "Individual Skill Profile", type: "radar", icon: "🎯" },
  { id: 2, name: "Team Gap Overview", type: "heatmap", icon: "🔥" },
  { id: 3, name: "Top Performers Analysis", type: "bubble", icon: "💫" },
  { id: 4, name: "Skill Distribution", type: "boxplot", icon: "📊" },
  { id: 5, name: "Competency Trends", type: "line", icon: "📈" },
  { id: 6, name: "Performance Matrix", type: "matrix", icon: "🔲" },
]

export default function ChartManagementPanel({
  charts,
  disabledCharts,
  onToggleChart,
  onClearChart,
  onRegenerateChart,
}: ChartManagementPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getChartForContainer = (containerId: number) => {
    return charts.find((chart) => chart.containerId === containerId) || null
  }

  const enabledChartsCount = CHART_CONTAINERS.length - disabledCharts.size
  const generatedChartsCount = charts.length

  return (
    <Card className="bg-slate-50 border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between text-gray-700">
          <div className="flex items-center">
            <Settings className="mr-2 h-4 w-4 text-slate-600" />
            Chart Management
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="h-6 w-6 p-0">
            {isExpanded ? "−" : "+"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-center p-2 bg-white rounded border">
            <div className="font-semibold text-green-600">{enabledChartsCount}/6</div>
            <div className="text-gray-500">Enabled</div>
          </div>
          <div className="text-center p-2 bg-white rounded border">
            <div className="font-semibold text-blue-600">{generatedChartsCount}</div>
            <div className="text-gray-500">Generated</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              CHART_CONTAINERS.forEach((container) => {
                if (disabledCharts.has(container.id)) {
                  onToggleChart(container.id)
                }
              })
            }}
            className="flex-1 text-xs"
          >
            <Eye className="mr-1 h-3 w-3" />
            Enable All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              CHART_CONTAINERS.forEach((container) => {
                if (!disabledCharts.has(container.id)) {
                  onToggleChart(container.id)
                }
              })
            }}
            className="flex-1 text-xs"
          >
            <EyeOff className="mr-1 h-3 w-3" />
            Disable All
          </Button>
        </div>

        {/* Individual Chart Controls */}
        {isExpanded && (
          <div className="space-y-2 border-t pt-3">
            <h4 className="text-xs font-medium text-gray-600 mb-2">Individual Controls</h4>
            {CHART_CONTAINERS.map((container) => {
              const chart = getChartForContainer(container.id)
              const isDisabled = disabledCharts.has(container.id)

              return (
                <div
                  key={container.id}
                  className={`p-2 rounded border transition-all ${isDisabled ? "bg-gray-100 opacity-60" : "bg-white"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{container.icon}</span>
                      <div>
                        <div className="text-xs font-medium text-gray-800">{container.name}</div>
                        <div className="flex items-center space-x-1">
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {container.type}
                          </Badge>
                          {chart && (
                            <Badge variant="secondary" className="text-xs px-1 py-0 bg-green-100 text-green-700">
                              Generated
                            </Badge>
                          )}
                          {isDisabled && (
                            <Badge variant="destructive" className="text-xs px-1 py-0">
                              Disabled
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={!isDisabled}
                      onCheckedChange={() => onToggleChart(container.id)}
                      className="scale-75"
                    />
                  </div>

                  {chart && !isDisabled && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRegenerateChart(container.id)}
                        className="h-6 text-xs flex-1"
                      >
                        <RotateCcw className="mr-1 h-3 w-3" />
                        Regenerate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onClearChart(container.id)}
                        className="h-6 text-xs text-red-600 hover:text-red-700"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
