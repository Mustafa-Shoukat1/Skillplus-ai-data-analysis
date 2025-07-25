"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Bot, Zap, Brain, TrendingUp, Users, Target, AlertTriangle, Lightbulb, Activity, Edit3, X, Check, Plus, Trash2, CheckCircle, Eye } from "lucide-react"
import { startAnalysis, getTemplates, createTemplate, updateTemplate, deleteTemplate, getAnalysisResult } from "@/lib/api"

interface AIAnalysisGeneratorProps {
  csvData: any[]
  onAnalysisGenerated: (analysis: any) => void
  analyses: any[]
  uploadedFileId?: string
}

// Icon mapping for templates
const iconMap: { [key: string]: JSX.Element } = {
  "AlertTriangle": <AlertTriangle className="h-5 w-5" />,
  "TrendingUp": <TrendingUp className="h-5 w-5" />,
  "Users": <Users className="h-5 w-5" />,
  "Brain": <Brain className="h-5 w-5" />,
  "Target": <Target className="h-5 w-5" />,
  "Activity": <Activity className="h-5 w-5" />,
}

// Color scheme mapping
const colorSchemeMap: { [key: string]: string } = {
  "from-red-500 to-orange-500": "from-red-500 to-orange-500",
  "from-green-500 to-emerald-500": "from-green-500 to-emerald-500",
  "from-blue-500 to-cyan-500": "from-blue-500 to-cyan-500",
  "from-purple-500 to-pink-500": "from-purple-500 to-pink-500",
  "from-indigo-500 to-blue-500": "from-indigo-500 to-blue-500",
  "from-yellow-500 to-orange-500": "from-yellow-500 to-orange-500",
}

// Stylish Confirmation Dialog Component
const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, message, type = "success" }: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  type?: "success" | "error" | "warning"
}) => {
  if (!isOpen) return null

  const getColorClasses = () => {
    switch (type) {
      case "success":
        return {
          bg: "from-green-500/20 to-emerald-500/20",
          border: "border-green-500/30",
          icon: "text-green-400",
          button: "bg-green-600 hover:bg-green-700"
        }
      case "error":
        return {
          bg: "from-red-500/20 to-pink-500/20",
          border: "border-red-500/30",
          icon: "text-red-400",
          button: "bg-red-600 hover:bg-red-700"
        }
      case "warning":
        return {
          bg: "from-yellow-500/20 to-orange-500/20",
          border: "border-yellow-500/30",
          icon: "text-yellow-400",
          button: "bg-yellow-600 hover:bg-yellow-700"
        }
      default:
        return {
          bg: "from-blue-500/20 to-purple-500/20",
          border: "border-blue-500/30",
          icon: "text-blue-400",
          button: "bg-blue-600 hover:bg-blue-700"
        }
    }
  }

  const colors = getColorClasses()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`glass bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-xl p-6 max-w-md w-full mx-4 transform transition-all duration-300 scale-100`}>
        <div className="flex items-center space-x-3 mb-4">
          <div className={`p-2 rounded-full bg-gradient-to-r ${colors.bg}`}>
            <CheckCircle className={`h-6 w-6 ${colors.icon}`} />
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        
        <p className="text-gray-300 mb-6">{message}</p>
        
        <div className="flex space-x-3">
          <Button
            onClick={onConfirm}
            className={`flex-1 ${colors.button} text-white font-medium`}
          >
            Confirm
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-gray-500 text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AIAnalysisGenerator({ csvData, onAnalysisGenerated, analyses, uploadedFileId }: AIAnalysisGeneratorProps) {
  // Existing state
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [customPrompt, setCustomPrompt] = useState("")
  const [analysisType, setAnalysisType] = useState("template")
  const [generating, setGenerating] = useState(false)
  const [generatedInsight, setGeneratedInsight] = useState("")
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [editingTemplate, setEditingTemplate] = useState<number | null>(null)
  const [editedPrompts, setEditedPrompts] = useState<{ [key: number]: string }>({})
  const [currentAnalysisResult, setCurrentAnalysisResult] = useState<any>(null)

  // New state for backend templates
  const [templates, setTemplates] = useState<any[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    title: "",
    description: "",
    prompt: "",
    category: "",
    icon: "Brain",
    color_scheme: "from-blue-500 to-cyan-500"
  })

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "success" as "success" | "error" | "warning",
    onConfirm: () => {}
  })

  // Load templates from backend
  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const response = await getTemplates(true) // Include defaults
      if (response.success) {
        setTemplates(response.data)
        console.log("Templates loaded:", response.data)
      } else {
        console.error("Failed to load templates:", response.error)
      }
    } catch (error) {
      console.error("Error loading templates:", error)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const showConfirmDialog = (title: string, message: string, type: "success" | "error" | "warning", onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      type,
      onConfirm
    })
  }

  const closeConfirmDialog = () => {
    setConfirmDialog({
      isOpen: false,
      title: "",
      message: "",
      type: "success",
      onConfirm: () => {}
    })
  }

  const handleCreateTemplate = async () => {
    if (!newTemplate.title || !newTemplate.prompt) {
      showConfirmDialog(
        "Missing Information",
        "Please fill in at least the title and prompt fields.",
        "warning",
        () => closeConfirmDialog()
      )
      return
    }

    try {
      const response = await createTemplate(newTemplate)
      if (response.success) {
        await loadTemplates() // Reload templates
        setShowCreateForm(false)
        setNewTemplate({
          title: "",
          description: "",
          prompt: "",
          category: "",
          icon: "Brain",
          color_scheme: "from-blue-500 to-cyan-500"
        })
        
        showConfirmDialog(
          "Template Created! 🎉",
          `Your template "${newTemplate.title}" has been successfully created and is now available for use.`,
          "success",
          () => closeConfirmDialog()
        )
      } else {
        showConfirmDialog(
          "Creation Failed",
          `Failed to create template: ${response.error}`,
          "error",
          () => closeConfirmDialog()
        )
      }
    } catch (error) {
      showConfirmDialog(
        "Error Occurred",
        "An error occurred while creating the template. Please try again.",
        "error",
        () => closeConfirmDialog()
      )
      console.error(error)
    }
  }

  const handleDeleteTemplate = async (templateId: number, templateTitle: string, isDefault: boolean) => {
    // REMOVED: Default template protection - now all templates can be deleted
    showConfirmDialog(
      "Delete Template",
      `Are you sure you want to delete "${templateTitle}"? This action cannot be undone.${isDefault ? ' This is a default template.' : ''}`,
      "error",
      async () => {
        try {
          const response = await deleteTemplate(templateId)
          if (response.success) {
            await loadTemplates() // Reload templates
            closeConfirmDialog()
            
            // Show success message after a brief delay
            setTimeout(() => {
              showConfirmDialog(
                "Template Deleted",
                `"${templateTitle}" has been successfully deleted.`,
                "success",
                () => closeConfirmDialog()
              )
            }, 300)
          } else {
            showConfirmDialog(
              "Delete Failed",
              `Failed to delete template: ${response.error}`,
              "error",
              () => closeConfirmDialog()
            )
          }
        } catch (error) {
          showConfirmDialog(
            "Error Occurred",
            "An error occurred while deleting the template. Please try again.",
            "error",
            () => closeConfirmDialog()
          )
          console.error(error)
        }
      }
    )
  }

  const getEffectivePrompt = (template: any) => {
    return editedPrompts[template.id] || template.prompt
  }

  const handleEditPrompt = (templateId: number, currentPrompt: string) => {
    setEditingTemplate(templateId)
    setEditedPrompts(prev => ({
      ...prev,
      [templateId]: currentPrompt
    }))
  }

  const saveEditedPrompt = async (templateId: number) => {
    const newPrompt = editedPrompts[templateId]
    if (!newPrompt) {
      cancelEdit(templateId)
      return
    }

    try {
      const response = await updateTemplate(templateId, { prompt: newPrompt })
      if (response.success) {
        await loadTemplates() // Reload templates
        setEditingTemplate(null)
        setEditedPrompts(prev => {
          const newState = { ...prev }
          delete newState[templateId]
          return newState
        })
        
        showConfirmDialog(
          "Template Updated",
          "Your template prompt has been successfully updated.",
          "success",
          () => closeConfirmDialog()
        )
      } else {
        showConfirmDialog(
          "Update Failed",
          `Failed to update template: ${response.error}`,
          "error",
          () => closeConfirmDialog()
        )
      }
    } catch (error) {
      showConfirmDialog(
        "Error Occurred",
        "An error occurred while updating the template. Please try again.",
        "error",
        () => closeConfirmDialog()
      )
      console.error(error)
    }
  }

  const cancelEdit = (templateId: number) => {
    setEditingTemplate(null)
    setEditedPrompts(prev => {
      const newState = { ...prev }
      delete newState[templateId]
      return newState
    })
  }

  const generateAnalysis = async () => {
    // Check if file is uploaded
    if (!uploadedFileId) {
      showConfirmDialog(
        "File Required",
        "Please upload a file first before generating analysis.",
        "warning",
        () => closeConfirmDialog()
      )
      return
    }

    let prompt = ""
    let selectedTemplateName = ""
    
    if (analysisType === "template") {
      const template = templates.find(t => t.id === selectedTemplate)
      if (!template) {
        showConfirmDialog(
          "Template Required",
          "Please select a template before generating analysis.",
          "warning",
          () => closeConfirmDialog()
        )
        return
      }
      prompt = getEffectivePrompt(template)
      selectedTemplateName = template.title
      
      // ENHANCED: Log template selection for debugging
      console.log("Selected template:", template)
      console.log("Effective prompt:", prompt)
      console.log("Template ID:", selectedTemplate)
      
    } else {
      prompt = customPrompt
      selectedTemplateName = "Custom Analysis"
      console.log("Using custom prompt:", prompt)
    }

    // ENHANCED: Validate prompt length and content
    if (!prompt || prompt.trim().length < 10) {
      showConfirmDialog(
        "Invalid Prompt",
        "Please ensure your prompt has at least 10 characters and provides clear instructions for analysis.",
        "warning",
        () => closeConfirmDialog()
      )
      return
    }

    console.log("Starting analysis with:")
    console.log("- File ID:", uploadedFileId)
    console.log("- Prompt length:", prompt.length)
    console.log("- Template name:", selectedTemplateName)
    console.log("- Analysis type:", analysisType)

    setGenerating(true)
    setGeneratedInsight("")
    setAnalysisProgress(0)
    setCurrentAnalysisResult(null)

    try {
      // ENHANCED: Start analysis with proper logging
      console.log("Sending analysis request to backend...")
      const startResponse = await startAnalysis(uploadedFileId, prompt)

      if (!startResponse.success) {
        throw new Error(startResponse.error || 'Failed to start analysis')
      }

      const taskId = startResponse.data.task_id
      console.log("Analysis started with task ID:", taskId)

      // Poll for completion with progress updates
      const result = await pollAnalysisCompletion(
        taskId,
        (progress) => {
          console.log("Analysis progress:", progress + "%")
          setAnalysisProgress(progress)
        },
        60, // max attempts
        3000 // 3 second interval
      )

      if (!result.success) {
        throw new Error(result.error || 'Analysis failed')
      }

      const analysisData = result.data
      console.log("Analysis completed successfully:", analysisData)
      setCurrentAnalysisResult(analysisData)

      // ENHANCED: Create analysis object with better data mapping
      const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const analysis = {
        id: analysisId,
        analysisId: analysisData.analysis_id || analysisId, // Use backend analysis_id if available
        title: selectedTemplateName,
        templateId: selectedTemplate,
        templateName: selectedTemplateName,
        prompt: prompt,
        insights: analysisData.analysis_summary || analysisData.summary || "Analysis completed successfully",
        timestamp: new Date().toLocaleString(),
        type: selectedTemplate || "custom",
        dataPoints: csvData.length,
        recommendations: ["Analysis completed with backend integration"],
        backendResult: {
          success: analysisData.success,
          analysis_summary: analysisData.analysis_summary,
          query_type: analysisData.query_analysis?.query_type,
          execution_success: analysisData.execution_result?.success
        },
        taskId: taskId,
        queryType: analysisData.query_analysis?.query_type || "unknown",
        hasVisualization: !!(analysisData.chart_html),
        executionSuccess: analysisData.execution_result?.success || false,
        generatedCode: analysisData.generated_code ? 
          analysisData.generated_code.substring(0, 1000) + "..." : null,
        visualizationHtml: analysisData.chart_html ? "stored_separately" : null,
        visualizationId: analysisData.chart_html ? analysisId : null,
        analysis_id: analysisData.analysis_id, // Store backend analysis_id
        is_visible: true // Default to visible
      }

      console.log("Created analysis object:", analysis)

      setGeneratedInsight(analysis.insights)
      onAnalysisGenerated(analysis)

      // Handle localStorage storage
      try {
        if (analysisData.chart_html) {
          const vizKey = `viz_${analysisId}`
          
          try {
            const htmlSize = new Blob([analysisData.chart_html]).size
            console.log(`Visualization HTML size: ${(htmlSize / 1024 / 1024).toFixed(2)}MB`)
            
            if (htmlSize > 4 * 1024 * 1024) {
              console.warn("Visualization too large for localStorage")
            } else {
              localStorage.setItem(vizKey, analysisData.chart_html)
              console.log("Visualization stored in localStorage")
            }
          } catch (vizError) {
            console.warn("Could not store visualization locally:", vizError instanceof Error ? vizError.message : String(vizError))
          }
        }

        let storedAnalyses = []
        try {
          storedAnalyses = JSON.parse(localStorage.getItem("aiAnalyses") || "[]")
        } catch (parseError) {
          console.warn("Could not parse existing analyses, starting fresh")
          storedAnalyses = []
        }
        
        storedAnalyses.push(analysis)
        const limitedAnalyses = storedAnalyses.slice(-10)
        
        try {
          localStorage.setItem("aiAnalyses", JSON.stringify(limitedAnalyses))
          console.log("Analyses stored successfully")
        } catch (storageError) {
          console.warn("Failed to store analyses, trying minimal version")
          const minimalAnalyses = limitedAnalyses.map((a: any) => ({
            id: a.id,
            analysisId: a.analysisId,
            title: a.title,
            timestamp: a.timestamp,
            hasVisualization: a.hasVisualization,
            insights: a.insights?.substring(0, 100) + "..."
          }))
          localStorage.setItem("aiAnalyses", JSON.stringify(minimalAnalyses))
          console.log("Minimal analyses stored")
        }
        
      } catch (storageError) {
        console.error("Storage completely failed:", storageError)
        showConfirmDialog(
          "Storage Limitation",
          "Analysis completed successfully! However, due to the large size of the visualization, it couldn't be saved to browser storage. The results are still available in this session and can be accessed from the backend.",
          "warning",
          () => closeConfirmDialog()
        )
      }

      // Reset form
      setSelectedTemplate(null)
      setCustomPrompt("")
      setAnalysisProgress(100)

      // Show success dialog
      showConfirmDialog(
        "Analysis Complete! 🎉",
        `Your AI analysis "${selectedTemplateName}" has been successfully generated. You can view the results below.`,
        "success",
        () => closeConfirmDialog()
      )

    } catch (error) {
      console.error("Analysis generation error:", error)
      showConfirmDialog(
        "Analysis Failed",
        `Error generating analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
        "error",
        () => closeConfirmDialog()
      )
    } finally {
      setGenerating(false)
    }
  }

  // Check if generate button should be enabled
  const isGenerateEnabled = () => {
    if (generating || !uploadedFileId) return false
    
    if (analysisType === "template") {
      return selectedTemplate !== null
    } else {
      return customPrompt.trim() !== ""
    }
  }

  return (
    <div className="space-y-6">
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirmDialog}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />

      {/* AI Analysis Header */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span>AI-Powered Analysis Generator</span>
          </CardTitle>
          <p className="text-gray-400">
            Generate intelligent insights from your uploaded data using AI analysis templates
          </p>
        </CardHeader>
      </Card>

      {/* Analysis Type Selection */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-lg">Choose Analysis Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <Button
              variant={analysisType === "template" ? "default" : "outline"}
              onClick={() => setAnalysisType("template")}
              className={`flex-1 ${analysisType === "template" ? "bg-blue-500/20 border-blue-500/50 text-white" : "glass border-white/20 text-gray-300"}`}
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              AI Templates
            </Button>
            <Button
              variant={analysisType === "custom" ? "default" : "outline"}
              onClick={() => setAnalysisType("custom")}
              className={`flex-1 ${analysisType === "custom" ? "bg-purple-500/20 border-purple-500/50 text-white" : "glass border-white/20 text-gray-300"}`}
            >
              <Brain className="h-4 w-4 mr-2" />
              Custom Prompt
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Template Selection with Backend Templates */}
      {analysisType === "template" && (
        <Card className="glass border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center justify-between">
              <span>AI Analysis Templates</span>
              <Button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Template
              </Button>
            </CardTitle>
            <p className="text-gray-400">Select and customize analysis templates from the database</p>
          </CardHeader>
          <CardContent>
            {/* Create Template Form */}
            {showCreateForm && (
              <Card className="mb-4 border-green-500/30 bg-green-500/5">
                <CardHeader>
                  <CardTitle className="text-green-300 text-lg">Create New Template</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="Template Title"
                      value={newTemplate.title}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, title: e.target.value }))}
                      className="glass border-white/20 text-white"
                    />
                    <Input
                      placeholder="Category (optional)"
                      value={newTemplate.category}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                      className="glass border-white/20 text-white"
                    />
                  </div>
                  <Textarea
                    placeholder="Description"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                    className="glass border-white/20 text-white"
                    rows={2}
                  />
                  <Textarea
                    placeholder="Template Prompt"
                    value={newTemplate.prompt}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, prompt: e.target.value }))}
                    className="glass border-white/20 text-white"
                    rows={4}
                  />
                  <div className="flex space-x-2">
                    <Button onClick={handleCreateTemplate} className="bg-green-600 hover:bg-green-700">
                      <Check className="h-4 w-4 mr-1" />
                      Create
                    </Button>
                    <Button 
                      onClick={() => setShowCreateForm(false)} 
                      variant="outline"
                      className="border-gray-500 text-gray-300"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Templates Grid */}
            {loadingTemplates ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                <p className="text-gray-400">Loading templates...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                      selectedTemplate === template.id
                        ? "border-blue-500/50 bg-blue-500/10"
                        : "border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${colorSchemeMap[template.color_scheme] || 'from-blue-500 to-cyan-500'} text-white`}>
                        {iconMap[template.icon] || <Brain className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-white">{template.title}</h3>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedTemplate(template.id)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              {selectedTemplate === template.id ? "Selected" : "Select"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditPrompt(template.id, getEffectivePrompt(template))}
                              className="text-yellow-400 hover:text-yellow-300"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            {/* Show delete button for ALL templates now */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTemplate(template.id, template.title, template.is_default)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-400 mb-2">{template.description}</p>
                        
                        {template.is_default && (
                          <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                            Default Template
                          </span>
                        )}
                        
                        {editingTemplate === template.id ? (
                          <div className="space-y-2 mt-2">
                            <Textarea
                              value={editedPrompts[template.id] || template.prompt}
                              onChange={(e) => setEditedPrompts(prev => ({
                                ...prev,
                                [template.id]: e.target.value
                              }))}
                              className="text-xs glass border-yellow-500/20 text-white bg-yellow-500/5"
                              rows={3}
                            />
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => saveEditedPrompt(template.id)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelEdit(template.id)}
                                className="border-gray-500 text-gray-300"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          selectedTemplate === template.id && (
                            <div className="text-xs text-blue-300 bg-blue-500/10 p-2 rounded border border-blue-500/20 mt-2">
                              <strong>Prompt:</strong> {getEffectivePrompt(template).substring(0, 150)}...
                              {editedPrompts[template.id] && (
                                <div className="text-yellow-300 mt-1">
                                  <strong>✏️ Modified locally</strong>
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Custom Prompt */}
      {analysisType === "custom" && (
        <Card className="glass border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-lg">Custom AI Analysis</CardTitle>
            <p className="text-gray-400">Describe what insights you want to extract from your data</p>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Example: Analyze employee satisfaction patterns and identify factors that contribute to high performance. Focus on correlation between skills, experience, and job satisfaction scores..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="min-h-32 glass border-white/20 text-white placeholder-gray-400 bg-white/5"
            />
          </CardContent>
        </Card>
      )}

      {/* Generate Button - Updated enable logic */}
      <div className="flex justify-center">
        <Button
          onClick={generateAnalysis}
          disabled={!isGenerateEnabled()}
          className="btn-3d bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-8 py-3 text-lg font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Analyzing... {analysisProgress}%
            </>
          ) : (
            <>
              <Zap className="h-5 w-5 mr-2" />
              Generate AI Analysis
            </>
          )}
        </Button>
      </div>

      {/* Progress Bar */}
      {generating && (
        <Card className="glass border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-blue-300">
                <span>Processing Analysis</span>
                <span>{analysisProgress}%</span>
              </div>
              <div className="w-full bg-blue-500/20 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results Display - ENHANCED with unique ID display */}
      {currentAnalysisResult && (
        <Card className="glass border-green-500/30 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-green-300 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>Analysis Complete</span>
              </div>
              <div className="text-sm text-green-400 font-mono">
                ID: {currentAnalysisResult.analysisId?.substr(-8) || 'N/A'}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            {currentAnalysisResult.analysis_summary && (
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <h4 className="font-semibold text-green-300 mb-2">📊 Analysis Summary</h4>
                <p className="text-green-200 text-sm">{currentAnalysisResult.analysis_summary}</p>
              </div>
            )}

            {/* Generated Code */}
            {currentAnalysisResult.generated_code && (
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <h4 className="font-semibold text-blue-300 mb-2">💻 Generated Code</h4>
                <pre className="text-blue-200 text-xs overflow-x-auto bg-blue-500/5 p-2 rounded max-h-48">
                  <code>{currentAnalysisResult.generated_code}</code>
                </pre>
              </div>
            )}

            {/* ENHANCED Visualization with better HTML rendering */}
            {currentAnalysisResult.chart_html && (
              <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <h4 className="font-semibold text-purple-300 mb-2">📈 Generated Visualization</h4>
                <div className="bg-white rounded-lg p-2 overflow-hidden">
                  <iframe
                    srcDoc={currentAnalysisResult.chart_html}
                    className="w-full h-96 border-0 rounded"
                    sandbox="allow-scripts allow-same-origin"
                    title="Analysis Visualization"
                  />
                </div>
                <div className="mt-2 flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      const blob = new Blob([currentAnalysisResult.chart_html], { type: 'text/html' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `analysis_chart_${Date.now()}.html`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Download Chart
                  </Button>
                </div>
              </div>
            )}

            {/* Execution Results */}
            {currentAnalysisResult.execution_result && (
              <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <h4 className="font-semibold text-orange-300 mb-2">⚙️ Execution Results</h4>
                <p className="text-orange-200 text-sm">
                  Status: {currentAnalysisResult.execution_result.success ? "✅ Success" : "❌ Failed"}
                </p>
                {currentAnalysisResult.execution_result.visualization_created && (
                  <p className="text-orange-200 text-sm">📊 Visualization created</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* File Upload Warning */}
      {!uploadedFileId && (
        <Card className="glass border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3 text-yellow-300">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Please upload a file first to generate AI analysis</span>
            </div>
            <p className="text-yellow-200 text-sm mt-2">
              Go to the Data Upload tab and upload your CSV or Excel file before running analysis.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
 
import { getAnalysisStatus } from "@/lib/api"

async function pollAnalysisCompletion(
  taskId: string,
  onProgress: (progress: number) => void,
  maxAttempts: number = 60,
  intervalMs: number = 3000
): Promise<{ success: boolean; data?: any; error?: string }> {
  let attempts = 0
  
  while (attempts < maxAttempts) {
    try {
      console.log(`Polling attempt ${attempts + 1} for task ${taskId}`)
      
      const statusResponse = await getAnalysisStatus(taskId)
      console.log("Status response:", statusResponse)
      
      if (statusResponse.success) {
        const statusData = statusResponse.data
        const progress = statusData.progress || 0
        const status = statusData.status
        
        console.log(`Task ${taskId} status: ${status}, progress: ${progress}%`)
        onProgress(progress)
        
        // Check if completed
        if (status === "completed") {
          console.log("Task completed, fetching full result...")
          
          // Fetch the full result
          const resultResponse = await getAnalysisResult(taskId)
          console.log("Result response:", resultResponse)
          
          if (resultResponse.success) {
            return { success: true, data: resultResponse.data }
          } else {
            return { success: false, error: resultResponse.error || "Failed to get result" }
          }
        } else if (status === "failed") {
          const error = statusData.error || "Analysis failed"
          console.error("Task failed:", error)
          return { success: false, error }
        }
        // If still processing, continue polling
      } else {
        console.error("Status check failed:", statusResponse.error)
        return { success: false, error: statusResponse.error }
      }
    } catch (error: any) {
      console.error("Polling error:", error)
      return { success: false, error: error?.message || "Polling failed" }
    }
    
    await new Promise(res => setTimeout(res, intervalMs))
    attempts++
  }
  
  return { success: false, error: "Analysis timed out" }
}

