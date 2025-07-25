"use client"

import { useState } from "react"

interface ChartGeneratorProps {
  csvData: any[]
  onAnalysisGenerated: (analysis: any) => void
}

const CHART_TYPES = [
  {
    id: "radar",
    name: "Individual Skill Profile Radar Chart",
    description: "Compare multiple competencies per employee",
  },
  { id: "heatmap", name: "Team Gap Overview Heatmap", description: "Show strengths and weaknesses across team" },
  { id: "boxplot", name: "Skill Distribution Box Plot", description: "Statistical distribution of skills" },
  { id: "line", name: "Competency Trends Line Chart", description: "Track performance over time" },
  { id: "bar", name: "Top Performers Bar Chart", description: "Highlight best performers" },
  {
    id: "bubble",
    name: "Performance vs Role Relevance Bubble Chart",
    description: "Three-dimensional performance view",
  },
]

export default function ChartGenerator({ csvData, onAnalysisGenerated }: ChartGeneratorProps) {
  const [selectedChart, setSelectedChart] = useState("")
  const [customPrompt, setCustomPrompt] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generatedChart, setGeneratedChart] = useState("")

  const generateChart = async () => {
    if (!selectedChart && !customPrompt) {
      alert("Please select a chart type or enter a custom prompt")
      return
    }

    if (csvData.length === 0) {
      alert("Please upload CSV data first")
      return
    }

    setGenerating(true)

    try {
      const chartType = CHART_TYPES.find((c) => c.id === selectedChart)
      const prompt =
        customPrompt ||
        `Generate a ${chartType?.name} for employee performance data. 
        Create an interactive chart that shows performance thresholds:
        - 0-50%: Immediate action needed (red)
        - 50-60%: Push for improvement (orange) 
        - 60%+: Good performance (green)
        
        Use the following data structure: ${JSON.stringify(csvData.slice(0, 3))}
        
        Return only the HTML/CSS/JavaScript code for the chart that can be rendered directly.`

      const response = await fetch("/api/generate-chart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          data: csvData,
          chartType: selectedChart,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setGeneratedChart(result.chartCode)

        const analysis = {
          title: chartType?.name || "Custom Analysis",
          prompt: customPrompt || chartType?.description || "",
          chartCode: result.chartCode,
          timestamp: new Date().toLocaleString(),
          insights: result.insights,
        }

        onAnalysisGenerated(analysis)

        // Save to localStorage for viewer access
        const existingAnalyses = JSON.parse(localStorage.getItem("analyses") || "[]")
        localStorage.setItem("analyses", JSON.stringify([...existingAnalyses, analysis]))
      } else {
        alert("Error generating chart: " + result.error)
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Error generating chart. Please try again.")
    }

    setGenerating(false)
  }

  return (
    <div className="space-y-8">
      {csvData.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-yellow-400 mr-3">⚠️</div>
            <div className="text-yellow-700">Please upload CSV data first to generate charts</div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Chart Type Selection */}
        <div>
          <h3 className="text-lg font-semibold mb-4">📊 Select Chart Type</h3>
          <div className="space-y-3">
            {CHART_TYPES.map((chart) => (
              <label
                key={chart.id}
                className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="radio"
                  name="chartType"
                  value={chart.id}
                  checked={selectedChart === chart.id}
                  onChange={(e) => setSelectedChart(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">{chart.name}</div>
                  <div className="text-sm text-gray-500">{chart.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Custom Prompt */}
        <div>
          <h3 className="text-lg font-semibold mb-4">✏️ Custom Prompt</h3>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Describe the specific chart or analysis you want to generate..."
            className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 mt-2">💡 Tip: Be specific about what insights you want to visualize</p>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={generateChart}
          disabled={generating || csvData.length === 0}
          className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-lg font-medium"
        >
          {generating ? (
            <>
              <span className="animate-spin mr-2">🔄</span>
              Generating Chart...
            </>
          ) : (
            <>🤖 Generate AI Chart</>
          )}
        </button>
      </div>

      {/* Generated Chart Preview */}
      {generatedChart && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">📈 Generated Chart</h3>
          <div className="bg-white border rounded-lg p-6 shadow-lg">
            <div dangerouslySetInnerHTML={{ __html: generatedChart }} />
          </div>
        </div>
      )}
    </div>
  )
}
