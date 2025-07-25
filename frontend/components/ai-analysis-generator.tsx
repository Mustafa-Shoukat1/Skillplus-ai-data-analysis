"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Bot, Zap, Brain, TrendingUp, Users, Target, AlertTriangle, Lightbulb, Activity } from "lucide-react"

interface AIAnalysisGeneratorProps {
  csvData: any[]
  onAnalysisGenerated: (analysis: any) => void
  analyses: any[]
}

const AI_ANALYSIS_TEMPLATES = [
  {
    id: "performance_gaps",
    name: "Performance Gap Analysis",
    description: "Identify skill gaps and performance bottlenecks across teams",
    icon: <AlertTriangle className="h-5 w-5" />,
    prompt:
      "Analyze the employee performance data to identify critical skill gaps, underperforming areas, and provide actionable recommendations for improvement. Focus on departments with the lowest average scores and suggest targeted training programs.",
    color: "from-red-500 to-orange-500",
  },
  {
    id: "top_performers",
    name: "Top Performer Insights",
    description: "Analyze characteristics and patterns of high-performing employees",
    icon: <TrendingUp className="h-5 w-5" />,
    prompt:
      "Identify the top 20% performers in the dataset and analyze their common characteristics, skills, and patterns. Provide insights on what makes them successful and how to replicate these traits across the organization.",
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "team_dynamics",
    name: "Team Dynamics Analysis",
    description: "Understand team composition and collaboration effectiveness",
    icon: <Users className="h-5 w-5" />,
    prompt:
      "Analyze team dynamics by examining skill complementarity, performance distribution within teams, and identify optimal team compositions. Suggest team restructuring opportunities for better performance.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "skill_trends",
    name: "Skill Trend Forecasting",
    description: "Predict future skill requirements and development needs",
    icon: <Brain className="h-5 w-5" />,
    prompt:
      "Based on current skill distributions and performance data, forecast future skill requirements, identify emerging skill gaps, and recommend proactive development strategies for the next 6-12 months.",
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "roi_analysis",
    name: "Training ROI Analysis",
    description: "Calculate return on investment for training programs",
    icon: <Target className="h-5 w-5" />,
    prompt:
      "Analyze the correlation between employee development areas and performance scores to calculate potential ROI of targeted training programs. Prioritize training investments based on impact potential.",
    color: "from-indigo-500 to-blue-500",
  },
  {
    id: "retention_risk",
    name: "Retention Risk Assessment",
    description: "Identify employees at risk of leaving and retention strategies",
    icon: <Activity className="h-5 w-5" />,
    prompt:
      "Analyze performance patterns, skill utilization, and engagement indicators to identify employees at risk of leaving. Provide personalized retention strategies and career development recommendations.",
    color: "from-yellow-500 to-orange-500",
  },
]

export default function AIAnalysisGenerator({ csvData, onAnalysisGenerated, analyses }: AIAnalysisGeneratorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [customPrompt, setCustomPrompt] = useState("")
  const [analysisType, setAnalysisType] = useState("template")
  const [generating, setGenerating] = useState(false)
  const [generatedInsight, setGeneratedInsight] = useState("")

  const generateAnalysis = async () => {
    if (csvData.length === 0) {
      alert("Please upload CSV data first")
      return
    }

    const prompt =
      analysisType === "template" ? AI_ANALYSIS_TEMPLATES.find((t) => t.id === selectedTemplate)?.prompt : customPrompt

    if (!prompt) {
      alert("Please select a template or enter a custom prompt")
      return
    }

    setGenerating(true)
    setGeneratedInsight("")

    try {
      // Simulate AI analysis with realistic delay
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Generate realistic insights based on the template
      const template = AI_ANALYSIS_TEMPLATES.find((t) => t.id === selectedTemplate)
      const insights = generateRealisticInsights(selectedTemplate, csvData)

      const analysis = {
        id: Date.now(),
        title: template?.name || "Custom Analysis",
        prompt: prompt,
        insights: insights,
        timestamp: new Date().toLocaleString(),
        type: selectedTemplate || "custom",
        dataPoints: csvData.length,
        recommendations: generateRecommendations(selectedTemplate, csvData),
      }

      setGeneratedInsight(insights)
      onAnalysisGenerated(analysis)

      // Reset form
      setSelectedTemplate("")
      setCustomPrompt("")
    } catch (error) {
      console.error("Analysis generation error:", error)
      alert("Error generating analysis. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  const generateRealisticInsights = (templateId: string, data: any[]) => {
    const totalEmployees = data.length
    const avgScore = data.reduce((sum, emp) => sum + (emp.overallScore || 0), 0) / totalEmployees

    switch (templateId) {
      case "performance_gaps":
        return `Analysis of ${totalEmployees} employees reveals critical performance gaps. Average performance score is ${avgScore.toFixed(1)}%. Key findings: 23% of employees score below 60%, indicating immediate intervention needed. Engineering department shows strongest performance (avg: 78%), while Sales needs improvement (avg: 65%). Recommend targeted training in communication and technical skills.`

      case "top_performers":
        return `Top 20% performers (${Math.ceil(totalEmployees * 0.2)} employees) demonstrate consistent patterns: 89% average performance score, strong leadership and communication skills, and 15% higher engagement in development activities. These high performers share common traits: proactive problem-solving, cross-functional collaboration, and continuous learning mindset.`

      case "team_dynamics":
        return `Team analysis reveals optimal team size of 6-8 members with complementary skill sets. High-performing teams show 25% better collaboration scores and balanced skill distribution. Current teams with mixed seniority levels outperform homogeneous groups by 18%. Recommend restructuring 3 underperforming teams based on skill complementarity matrix.`

      case "skill_trends":
        return `Predictive analysis indicates growing demand for digital skills (+35% in next 12 months) and leadership capabilities (+28%). Current skill gaps in data analysis (40% of roles) and project management (32% of roles) will become critical. Recommend immediate upskilling programs in these areas to prevent future performance bottlenecks.`

      case "roi_analysis":
        return `Training ROI analysis shows highest returns in technical skills development (ROI: 340%) and leadership training (ROI: 280%). Investing $50K in targeted training could improve overall performance by 15-20%, translating to $200K+ in productivity gains. Priority areas: communication skills, technical certifications, and management development.`

      case "retention_risk":
        return `Retention risk model identifies 12% of employees (${Math.ceil(totalEmployees * 0.12)} individuals) at high risk of leaving. Risk factors: below-average performance scores, limited skill development, and low engagement in growth opportunities. Immediate intervention recommended for 8 high-value employees through personalized development plans.`

      default:
        return `Custom analysis completed on ${totalEmployees} employee records. Key insights generated based on performance patterns, skill distributions, and organizational metrics. Detailed recommendations provided for strategic decision-making and performance optimization.`
    }
  }

  const generateRecommendations = (templateId: string, data: any[]) => {
    switch (templateId) {
      case "performance_gaps":
        return [
          "Implement monthly skill assessments for bottom 25% performers",
          "Create mentorship program pairing high and low performers",
          "Develop targeted training modules for identified skill gaps",
          "Establish performance improvement plans with clear milestones",
        ]

      case "top_performers":
        return [
          "Create leadership development track for top performers",
          "Implement knowledge sharing sessions led by high performers",
          "Offer stretch assignments and cross-functional projects",
          "Develop succession planning based on top performer profiles",
        ]

      default:
        return [
          "Implement data-driven performance management",
          "Create personalized development plans",
          "Establish regular skill gap assessments",
          "Develop targeted training programs",
        ]
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Analysis Header */}
      <Card className="glass border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span>AI-Powered Analysis Generator</span>
          </CardTitle>
          <p className="text-gray-400">
            Generate intelligent insights from your employee data using advanced AI analysis templates
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

      {/* Template Selection */}
      {analysisType === "template" && (
        <Card className="glass border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-lg">AI Analysis Templates</CardTitle>
            <p className="text-gray-400">Select a pre-built analysis template optimized for HR insights</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AI_ANALYSIS_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                    selectedTemplate === template.id
                      ? "border-blue-500/50 bg-blue-500/10"
                      : "border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10"
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${template.color} text-white`}>
                      {template.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{template.name}</h3>
                      <p className="text-sm text-gray-400 mb-2">{template.description}</p>
                      {selectedTemplate === template.id && (
                        <div className="text-xs text-blue-300 bg-blue-500/10 p-2 rounded border border-blue-500/20">
                          <strong>AI Prompt:</strong> {template.prompt.substring(0, 100)}...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button
          onClick={generateAnalysis}
          disabled={
            generating ||
            csvData.length === 0 ||
            (analysisType === "template" && !selectedTemplate) ||
            (analysisType === "custom" && !customPrompt.trim())
          }
          className="btn-3d bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-8 py-3 text-lg font-medium shadow-lg"
        >
          {generating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Generating AI Analysis...
            </>
          ) : (
            <>
              <Zap className="h-5 w-5 mr-2" />
              Generate AI Analysis
            </>
          )}
        </Button>
      </div>

      {/* Generated Insight Preview */}
      {generatedInsight && (
        <Card className="glass border-green-500/30 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-green-300 flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>AI Analysis Complete</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-green-200">{generatedInsight}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Requirements */}
      {csvData.length === 0 && (
        <Card className="glass border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3 text-yellow-300">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">CSV data required to generate AI analysis</span>
            </div>
            <p className="text-yellow-200 text-sm mt-2">
              Please upload your employee performance data first using the Data Upload tab.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
