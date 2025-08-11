"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bot, Zap, Brain, Settings, FileText, Eye, EyeOff } from "lucide-react"
import { getAvailableSheets, getAvailableGraphTypes, startAdvancedAnalysis, getAnalysisStatus, getAnalysisResult, toggleAnalysisVisibility } from "@/lib/api"
import EChartsRenderer from "./echarts-renderer"

interface AdvancedAnalysisFormProps {
  uploadedFileId?: string
  onAnalysisGenerated: (analysis: any) => void
}

export default function AdvancedAnalysisForm({ uploadedFileId, onAnalysisGenerated }: AdvancedAnalysisFormProps) {
  // Form state
  const [selectedSheet, setSelectedSheet] = useState<string>("")
  const [selectedGraphType, setSelectedGraphType] = useState<string>("")
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<'skill' | 'gap'>('skill')
  const [prompt, setPrompt] = useState("")
  const [echartSampleCode, setEchartSampleCode] = useState("")
  
  // Data state - UPDATED
  const [availableSheets, setAvailableSheets] = useState<string[]>([])
  const [availableGraphTypes, setAvailableGraphTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [sheetsLoading, setSheetsLoading] = useState(false)
  const [graphTypesLoading, setGraphTypesLoading] = useState(false)
  
  // Results state
  const [currentResult, setCurrentResult] = useState<any>(null)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string>("")
  const [isAnalysisVisible, setIsAnalysisVisible] = useState<boolean>(true)

  // Load available sheets when file ID changes - UPDATED
  useEffect(() => {
    if (uploadedFileId) {
      loadAvailableSheets()
    }
  }, [uploadedFileId])

  // Load graph types on component mount
  useEffect(() => {
    loadAvailableGraphTypes()
  }, [])

  const loadAvailableSheets = async () => {
    setSheetsLoading(true)
    try {
      console.log("Loading sheets for file:", uploadedFileId)
      
      const response = await getAvailableSheets(uploadedFileId!)
      console.log("Sheets response:", response)
      
      if (response.success && response.data) {
        const sheetsData = response.data.data || response.data
        const sheets = sheetsData.sheets || []
        
        console.log("Setting sheets:", sheets)
        setAvailableSheets(sheets)
        
        // Auto-select first sheet if available
        if (sheets.length > 0 && !selectedSheet) {
          setSelectedSheet(sheets[0])
        }
      } else {
        console.error("Failed to load sheets:", response.error)
        setAvailableSheets([])
      }
    } catch (error) {
      console.error("Failed to load sheets:", error)
      setAvailableSheets([])
    } finally {
      setSheetsLoading(false)
    }
  }

  const loadAvailableGraphTypes = async () => {
    setGraphTypesLoading(true)
    try {
      console.log("Loading graph types")
      
      const response = await getAvailableGraphTypes()
      console.log("Graph types response:", response)
      
      if (response.success && response.data) {
        const graphTypesData = response.data.data || response.data
        const graphTypes = graphTypesData.graph_types || []
        
        console.log("Setting graph types:", graphTypes)
        setAvailableGraphTypes(graphTypes)
        
        // Auto-select first graph type if available
        if (graphTypes.length > 0 && !selectedGraphType) {
          setSelectedGraphType(graphTypes[0].value || graphTypes[0])
        }
      } else {
        console.error("Failed to load graph types:", response.error)
        setAvailableGraphTypes([])
      }
    } catch (error) {
      console.error("Failed to load graph types:", error)
      setAvailableGraphTypes([])
    } finally {
      setGraphTypesLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!uploadedFileId || !prompt.trim()) {
      alert("Please ensure file is uploaded and prompt is provided")
      return
    }

    setLoading(true)
    setAnalysisProgress(0)
    setCurrentResult(null)

    try {
      const response = await startAdvancedAnalysis(uploadedFileId, prompt, {
        sheet: selectedSheet,
        graphType: selectedGraphType,
        analysisType: selectedAnalysisType,
        echartSampleCode: echartSampleCode.trim() || undefined
      })

      if (response.success) {
        const taskId = response.data.task_id
        const analysisId = response.data.analysis_id

        // Poll for completion
        await pollAnalysisCompletion(taskId, analysisId)
      } else {
        throw new Error(response.error || 'Analysis failed')
      }
    } catch (error) {
      console.error("Analysis error:", error)
      alert(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const pollAnalysisCompletion = async (taskId: string, analysisId: string) => {
    const maxAttempts = 60
    const intervalMs = 3000

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const statusResponse = await getAnalysisStatus(taskId)
        
        if (statusResponse.success) {
          const status = statusResponse.data.status
          const progress = statusResponse.data.progress || 0
          
          setAnalysisProgress(progress)
          
          if (status === "completed") {
            const resultResponse = await getAnalysisResult(taskId)
            
            if (resultResponse.success) {
              const result = resultResponse.data
              setCurrentResult(result)
              setCurrentAnalysisId(analysisId)
              setIsAnalysisVisible(true) // Default to visible
              
              // Create analysis object
              const analysis = {
                id: analysisId,
                analysis_id: analysisId,
                title: `${selectedAnalysisType.charAt(0).toUpperCase() + selectedAnalysisType.slice(1)} Analysis`,
                prompt: prompt,
                insights: "Analysis completed successfully",
                timestamp: new Date().toLocaleString(),
                type: selectedAnalysisType,
                queryType: 'visualization',
                hasVisualization: !!result.designed_echart_code,
                visualizationHtml: result.designed_echart_code,
                is_active: true,
                success: true,
                executionSuccess: true,
                backendResult: result
              }
              
              onAnalysisGenerated(analysis)
              break
            }
          } else if (status === "failed") {
            throw new Error("Analysis failed")
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, intervalMs))
      } catch (error) {
        console.error("Polling error:", error)
        break
      }
    }
  }

  // Visibility toggle handler
  const handleToggleVisibility = async (newVisibility: boolean) => {
    if (!currentAnalysisId) {
      alert("No analysis available to update visibility")
      return
    }

    try {
      const response = await toggleAnalysisVisibility(currentAnalysisId, newVisibility)
      
      if (response.success) {
        setIsAnalysisVisible(newVisibility)
        console.log(`Analysis ${currentAnalysisId} visibility updated to: ${newVisibility}`)
        
        // Show success feedback
        const action = newVisibility ? 'public' : 'private'
        alert(`Analysis is now ${action}`)
      } else {
        console.error('Failed to update visibility:', response.error)
        alert('Failed to update visibility. Please try again.')
      }
    } catch (error) {
      console.error('Error updating visibility:', error)
      alert('Error updating visibility. Please try again.')
    }
  }

  const isFormValid = () => {
    return uploadedFileId && prompt.trim().length > 0
  }

    // Helper to switch tabs if parent provides onAnalysisGenerated with setActiveTab
    // (Assumes setActiveTab is passed via props or context in real usage)
    function setActiveTab(tab: string): void {
        // Try to find a global or window-scoped setter, fallback to no-op
        if (typeof window !== "undefined" && (window as any).setActiveTab) {
            (window as any).setActiveTab(tab)
        }
        // If you use context or props, replace this with the correct setter
        // Example: props.setActiveTab?.(tab)
        // For now, do nothing if not available
    }
  return (
    <div className="space-y-6">
      {/* Configuration Form */}
      <Card className="glass border-white/20 shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center space-x-2 text-xl">
            <Settings className="h-6 w-6" />
            <span>Advanced Analysis Configuration</span>
          </CardTitle>
          <p className="text-gray-300 text-sm mt-2">
            Configure your analysis parameters for optimal results
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Form Grid for Desktop, Stack for Mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Sheet Selection - Enhanced */}
              <div className="space-y-3">
                <label className="text-white font-semibold text-sm flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Select Sheet</span>
                  {availableSheets.length > 0 && (
                    <span className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded-full">
                      {availableSheets.length} available
                    </span>
                  )}
                </label>
                <Select 
                  value={selectedSheet} 
                  onValueChange={setSelectedSheet} 
                  disabled={sheetsLoading || !uploadedFileId}
                >
                  <SelectTrigger className="glass border-white/30 text-white bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-200 h-14 text-base">
                    <SelectValue 
                      placeholder={
                        !uploadedFileId ? "Upload a file first" :
                        sheetsLoading ? "Loading sheets..." : 
                        availableSheets.length === 0 ? "No sheets available" :
                        "Choose a sheet"
                      }
                      className="text-white"
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900/95 border-white/20 backdrop-blur-md shadow-2xl">
                    {availableSheets.map((sheet, index) => (
                      <SelectItem 
                        key={index} 
                        value={sheet}
                        className="text-white hover:bg-white/10 focus:bg-white/15 py-3 cursor-pointer"
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded bg-blue-500"></div>
                          <span className="font-medium">{sheet}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(availableSheets.length > 0 || sheetsLoading) && (
                  <p className="text-xs text-gray-400 flex items-center space-x-1">
                    {sheetsLoading ? (
                      <>
                        <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading sheets...</span>
                      </>
                    ) : (
                      <>
                        <span>Found {availableSheets.length} sheet{availableSheets.length !== 1 ? 's' : ''}</span>
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Graph Type Selection - Enhanced */}
              <div className="space-y-3">
                <label className="text-white font-semibold text-sm flex items-center space-x-2">
                  <Brain className="h-4 w-4" />
                  <span>Visualization Type</span>
                  {availableGraphTypes.length > 0 && (
                    <span className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded-full">
                      {availableGraphTypes.length} types
                    </span>
                  )}
                </label>
                <Select 
                  value={selectedGraphType} 
                  onValueChange={setSelectedGraphType} 
                  disabled={graphTypesLoading}
                >
                  <SelectTrigger className="glass border-white/30 text-white bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-200 h-14 text-base">
                    <SelectValue 
                      placeholder={
                        graphTypesLoading ? "Loading graph types..." : 
                        availableGraphTypes.length === 0 ? "No graph types available" :
                        "Choose visualization type"
                      }
                      className="text-white"
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900/95 border-white/20 backdrop-blur-md shadow-2xl max-h-80">
                    {availableGraphTypes.map((graphType, index) => (
                      <SelectItem 
                        key={index} 
                        value={graphType.value || graphType}
                        className="text-white hover:bg-white/10 focus:bg-white/15 py-4 cursor-pointer"
                      >
                        <div className="flex flex-col space-y-1 w-full">
                          <div className="flex items-center space-x-3">
                            <div className="w-4 h-4 rounded bg-gradient-to-r from-purple-500 to-blue-500"></div>
                            <span className="font-semibold text-base">{graphType.name || graphType}</span>
                          </div>
                          {graphType.description && (
                            <span className="text-xs text-gray-400 ml-7 leading-relaxed">
                              {graphType.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(availableGraphTypes.length > 0 || graphTypesLoading) && (
                  <p className="text-xs text-gray-400 flex items-center space-x-1">
                    {graphTypesLoading ? (
                      <>
                        <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading visualization types...</span>
                      </>
                    ) : (
                      <>
                        <span>{availableGraphTypes.length} visualization types available</span>
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Analysis Type Selection - Enhanced */}
              <div className="space-y-3">
                <label className="text-white font-semibold text-sm flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>Analysis Type</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={selectedAnalysisType === 'skill' ? 'default' : 'outline'}
                    onClick={() => setSelectedAnalysisType('skill')}
                    className={`h-16 transition-all duration-200 ${
                      selectedAnalysisType === 'skill' 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 border-blue-500/50 text-white shadow-lg shadow-blue-500/25' 
                        : 'glass border-white/30 text-gray-300 hover:bg-white/10 hover:border-white/40'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-1">
                      <Brain className="h-5 w-5" />
                      <span className="font-medium text-sm">Skill Analysis</span>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant={selectedAnalysisType === 'gap' ? 'default' : 'outline'}
                    onClick={() => setSelectedAnalysisType('gap')}
                    className={`h-16 transition-all duration-200 ${
                      selectedAnalysisType === 'gap' 
                        ? 'bg-gradient-to-r from-red-600 to-red-700 border-red-500/50 text-white shadow-lg shadow-red-500/25' 
                        : 'glass border-white/30 text-gray-300 hover:bg-white/10 hover:border-white/40'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-1">
                      <FileText className="h-5 w-5" />
                      <span className="font-medium text-sm">Gap Analysis</span>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
                <div className="flex items-center space-x-2 text-green-300">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Configuration Status</span>
                </div>
                <div className="mt-2 space-y-1 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>File uploaded:</span>
                    <span className={uploadedFileId ? 'text-green-400' : 'text-red-400'}>
                      {uploadedFileId ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sheet selected:</span>
                    <span className={selectedSheet ? 'text-green-400' : 'text-yellow-400'}>
                      {selectedSheet ? '✓' : '○'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Graph type selected:</span>
                    <span className={selectedGraphType ? 'text-green-400' : 'text-yellow-400'}>
                      {selectedGraphType ? '✓' : '○'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full Width Sections */}
          <div className="space-y-6">
            {/* Prompt Input - Enhanced */}
            <div className="space-y-3">
              <label className="text-white font-semibold text-sm flex items-center space-x-2">
                <Bot className="h-4 w-4" />
                <span>Analysis Prompt</span>
                <span className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded-full">
                  Required
                </span>
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to analyze... (e.g., 'Show me the skill distribution across departments' or 'Identify gaps in our training programs')"
                className="glass border-white/30 text-white placeholder-gray-400 bg-white/5 backdrop-blur-sm min-h-24 resize-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                rows={4}
              />
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>Be specific about what insights you're looking for</span>
                <span className={`${prompt.length < 10 ? 'text-red-400' : 'text-green-400'}`}>
                  {prompt.length} chars {prompt.length < 10 ? '(minimum 10)' : ''}
                </span>
              </div>
            </div>

            {/* EChart Sample Code - Enhanced */}
            <div className="space-y-3">
              <label className="text-white font-semibold text-sm flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>EChart Sample Code</span>
                <span className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded-full">
                  Optional
                </span>
              </label>
              <Textarea
                value={echartSampleCode}
                onChange={(e) => setEchartSampleCode(e.target.value)}
                placeholder={`// Paste your EChart option code here for custom styling...
// Example:
// {
//   title: { text: 'My Custom Chart' },
//   xAxis: { type: 'category' },
//   yAxis: { type: 'value' },
//   series: [{ type: 'bar', data: [] }]
// }`}
                className="glass border-white/30 text-white placeholder-gray-400 bg-white/5 backdrop-blur-sm min-h-32 font-mono text-sm resize-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                rows={6}
              />
              <p className="text-xs text-gray-400">
                Provide custom EChart configuration to override default styling
              </p>
            </div>
          </div>

          {/* Submit Section */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid() || loading}
                className="btn-3d bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-8 py-4 text-lg font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 min-w-[200px] h-14"
              >
                {loading ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing... {analysisProgress}%</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Bot className="h-5 w-5" />
                    <span>Generate Analysis</span>
                  </div>
                )}
              </Button>
              
              {!isFormValid() && (
                <div className="text-center sm:text-left">
                  <p className="text-sm text-red-400 flex items-center justify-center sm:justify-start space-x-1">
                    <span>⚠️</span>
                    <span>Please upload a file and enter a prompt</span>
                  </p>
                </div>
              )}
            </div>

            {/* Progress Bar - Enhanced */}
            {loading && (
              <div className="mt-6 space-y-3">
                <div className="flex justify-between items-center text-blue-300">
                  <span className="font-medium">Processing Analysis</span>
                  <span className="font-mono text-lg">{analysisProgress}%</span>
                </div>
                <div className="w-full bg-blue-500/20 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out shadow-lg shadow-blue-500/50"
                    style={{ width: `${analysisProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>AI is analyzing your data...</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Display - Enhanced with Visibility Toggle */}
      {currentResult && (
        <Card className={`glass shadow-xl ${isAnalysisVisible ? 'border-green-500/30 bg-green-500/5' : 'border-gray-500/30 bg-gray-500/5'}`}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-green-300 flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Analysis Results</span>
                {currentAnalysisId && (
                  <div className="ml-3 px-2 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-xs font-mono">
                    {currentAnalysisId.includes('analysis_') ? currentAnalysisId.substr(-8) : currentAnalysisId}
                  </div>
                )}
              </CardTitle>
              
              {/* Visibility Toggle Button */}
              {currentAnalysisId && (
                <div className="flex flex-col items-center space-y-1">
                  <Button
                    size="sm"
                    onClick={() => handleToggleVisibility(!isAnalysisVisible)}
                    className={`flex items-center space-x-2 px-3 py-2 transition-all duration-200 ${
                      isAnalysisVisible 
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/25' 
                        : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    {isAnalysisVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    <span className="text-sm font-medium">
                      {isAnalysisVisible ? 'Public' : 'Private'}
                    </span>
                  </Button>
                  <div className={`text-xs transition-colors duration-200 ${isAnalysisVisible ? 'text-green-400' : 'text-red-400'}`}>
                    {isAnalysisVisible ? 'Viewers can see' : 'Hidden from viewers'}
                  </div>
                </div>
              )}
            </div>

            {/* Status Indicators */}
            <div className="flex items-center space-x-4 mt-2 text-xs">
              <div className="flex items-center space-x-1">
                <span className="text-gray-400">Analysis Type:</span>
                <span className="text-white capitalize">{selectedAnalysisType} Analysis</span>
              </div>
              {currentResult.designed_echart_code && (
                <span className="text-purple-400 flex items-center">
                  <Zap className="h-3 w-3 mr-1" />
                  Has Visualization
                </span>
              )}
              <span className="text-green-400 flex items-center">
                <Brain className="h-3 w-3 mr-1" />
                AI Generated
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Query Display */}
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <h4 className="font-semibold text-blue-300 text-sm mb-2">Query</h4>
              <p className="text-blue-200 text-sm">{prompt}</p>
            </div>

            {/* Chart Visualization */}
            {currentResult.designed_echart_code && isAnalysisVisible && (
              <div className="p-4 bg-white rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-gray-800">Generated Visualization</h4>
                  <div className="flex items-center space-x-2 text-xs text-gray-600">
                    <span>Advanced Analysis</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                </div>
                <EChartsRenderer 
                  optionCode={currentResult.designed_echart_code}
                  height="500px"
                />
              </div>
            )}

            {/* Privacy Notice */}
            {currentResult.designed_echart_code && !isAnalysisVisible && (
              <div className="p-4 bg-gray-500/10 rounded-lg border border-gray-500/20">
                <div className="flex items-center space-x-2 text-gray-400">
                  <EyeOff className="h-5 w-5" />
                  <span className="font-medium">Visualization Hidden</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  This analysis is private and not visible to viewers. Click "Public" to make it visible.
                </p>
              </div>
            )}

            {/* Data Results */}
            {currentResult.response_df && currentResult.response_df.length > 0 && isAnalysisVisible && (
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <h4 className="font-semibold text-blue-300 mb-2">Data Results</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-blue-200">
                    <thead>
                      <tr className="border-b border-blue-500/20">
                        {Object.keys(currentResult.response_df[0] || {}).map((col, idx) => (
                          <th key={idx} className="text-left p-2">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentResult.response_df.slice(0, 5).map((row: any, idx: number) => (
                        <tr key={idx} className="border-b border-blue-500/10">
                          {Object.values(row).map((val: any, colIdx: number) => (
                            <td key={colIdx} className="p-2">{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {currentResult.response_df.length > 5 && (
                  <p className="text-xs text-gray-400 mt-2">
                    Showing 5 of {currentResult.response_df.length} results
                  </p>
                )}
              </div>
            )}

            {/* Configuration Summary */}
            <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <h4 className="font-semibold text-purple-300 text-sm mb-2">Configuration Used</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Sheet:</span>
                  <span className="text-white ml-1">{selectedSheet || 'Auto'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Graph:</span>
                  <span className="text-white ml-1">{selectedGraphType || 'Auto'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Type:</span>
                  <span className="text-white ml-1 capitalize">{selectedAnalysisType}</span>
                </div>
                <div>
                  <span className="text-gray-400">Custom Code:</span>
                  <span className="text-white ml-1">{echartSampleCode ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            {/* Success Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-green-500/20">
              <div className="flex items-center space-x-2 text-green-300">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Analysis completed successfully</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => {
                    setCurrentResult(null)
                    setCurrentAnalysisId("")
                    setPrompt("")
                    setEchartSampleCode("")
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm"
                >
                  New Analysis
                </Button>
                
                {currentResult.designed_echart_code && (
                  <Button
                    onClick={() => {
                      // You can implement download functionality here if needed
                      alert("Download functionality can be implemented here")
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-sm"
                  >
                    Download Chart
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Upload Warning - Enhanced */}
      {!uploadedFileId && (
        <Card className="glass border-yellow-500/30 bg-yellow-500/5 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3 text-yellow-300">
              <div className="flex items-center space-x-2">
                <FileText className="h-6 w-6" />
                <span className="font-medium text-center sm:text-left">
                  Please upload a file first to configure analysis
                </span>
              </div>
              <Button 
                onClick={() => setActiveTab?.("upload")} 
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Go to Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
