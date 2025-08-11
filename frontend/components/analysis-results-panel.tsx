"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Eye, 
  EyeOff, 
  TrendingUp, 
  CheckCircle,
  Calendar,
  BarChart3,
  FileSpreadsheet,
  Target,
  Zap
} from "lucide-react"
import EChartsRenderer from "./echarts-renderer"
import { toggleAnalysisVisibility } from "@/lib/api"

interface AnalysisResult {
  analysis_id: string
  title: string
  prompt: string
  timestamp: string
  type: string
  gridId: string
  graphType: string
  sheet: string
  backendResult?: any
  is_active?: boolean
}

interface AnalysisResultsPanelProps {
  results: AnalysisResult[]
  onUpdateVisibility: (analysisId: string, isActive: boolean) => void
}

export default function AnalysisResultsPanel({ results, onUpdateVisibility }: AnalysisResultsPanelProps) {
  const [togglingVisibility, setTogglingVisibility] = useState<string | null>(null)

  const handleVisibilityToggle = async (analysisId: string, currentActive: boolean) => {
    setTogglingVisibility(analysisId)
    
    try {
      const response = await toggleAnalysisVisibility(analysisId, !currentActive)
      
      if (response.success) {
        onUpdateVisibility(analysisId, !currentActive)
        console.log(`Analysis ${analysisId} visibility updated to: ${!currentActive}`)
      } else {
        console.error('Failed to update visibility:', response.error)
        alert('Failed to update visibility. Please try again.')
      }
    } catch (error) {
      console.error('Error updating visibility:', error)
      alert('Error updating visibility. Please try again.')
    } finally {
      setTogglingVisibility(null)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'skill':
        return 'from-blue-500 to-cyan-500'
      case 'gap':
        return 'from-purple-500 to-pink-500'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'skill':
        return <Target className="h-4 w-4" />
      case 'gap':
        return <BarChart3 className="h-4 w-4" />
      default:
        return <TrendingUp className="h-4 w-4" />
    }
  }

  if (results.length === 0) {
    return (
      <Card className="glass border-white/20">
        <CardContent className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-r from-gray-500/20 to-gray-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No analyses completed yet</h3>
          <p className="text-gray-400">
            Complete analyses in the grids above to see results and manage their visibility here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <CheckCircle className="h-5 w-5" />
          <span>Completed Analyses ({results.length})</span>
        </CardTitle>
        <p className="text-gray-300 text-sm">Manage visibility for viewer dashboard</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {results.map((result) => {
            const isActive = result.is_active !== false
            const isToggling = togglingVisibility === result.analysis_id
            
            return (
              <div 
                key={result.analysis_id}
                className={`glass rounded-lg p-4 border transition-all duration-200 ${
                  isActive 
                    ? 'border-green-500/30 bg-green-500/5' 
                    : 'border-gray-500/30 bg-gray-500/5'
                }`}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={`bg-gradient-to-r ${getTypeColor(result.type)} text-white border-0`}>
                        {getTypeIcon(result.type)}
                        <span className="ml-1 capitalize">{result.type} Analysis</span>
                      </Badge>
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 font-mono text-xs">
                        {result.analysis_id.substr(-8)}
                      </Badge>
                    </div>
                    <h3 className="text-white font-semibold text-sm">{result.title}</h3>
                    
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                      <div className="flex items-center space-x-1">
                        <FileSpreadsheet className="h-3 w-3" />
                        <span>{result.sheet}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <BarChart3 className="h-3 w-3" />
                        <span>{result.graphType}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{result.timestamp}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Visibility Toggle */}
                  <div className="flex flex-col items-center space-y-1">
                    <Button
                      size="sm"
                      onClick={() => handleVisibilityToggle(result.analysis_id, isActive)}
                      disabled={isToggling}
                      className={`flex items-center space-x-2 px-3 py-2 transition-all duration-200 ${
                        isActive 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
                      }`}
                    >
                      {isToggling ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          {isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          <span className="text-sm font-medium">
                            {isActive ? 'Public' : 'Private'}
                          </span>
                        </>
                      )}
                    </Button>
                    <div className={`text-xs transition-colors duration-200 ${
                      isActive ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {isActive ? 'Viewers can see' : 'Hidden from viewers'}
                    </div>
                  </div>
                </div>

                {/* Query Preview */}
                <div className="mb-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <h4 className="font-semibold text-blue-300 text-xs mb-1">Query</h4>
                  <p className="text-blue-200 text-xs">{result.prompt}</p>
                </div>

                {/* Chart Preview */}
                {result.backendResult?.designed_echart_code && isActive && (
                  <div className="bg-white rounded-lg p-2">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-800 text-xs">Chart Preview</h4>
                      <Badge className="bg-green-500/20 text-green-600 text-xs">
                        <Zap className="h-3 w-3 mr-1" />
                        Live
                      </Badge>
                    </div>
                    <EChartsRenderer 
                      optionCode={result.backendResult.designed_echart_code}
                      height="200px"
                    />
                  </div>
                )}

                {!isActive && (
                  <div className="p-3 bg-gray-500/10 rounded-lg border border-gray-500/20">
                    <div className="flex items-center space-x-2 text-gray-400">
                      <EyeOff className="h-4 w-4" />
                      <span className="font-medium text-xs">Chart Hidden</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      This analysis is private and not visible to viewers.
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
