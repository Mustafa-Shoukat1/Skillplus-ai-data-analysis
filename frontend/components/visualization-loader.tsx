"use client"

import { useState, useEffect } from "react"

interface VisualizationLoaderProps {
  analysisId: string
}

export default function VisualizationLoader({ analysisId }: VisualizationLoaderProps) {
  const [htmlContent, setHtmlContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadVisualization = async () => {
      try {
        setLoading(true)
        setError(null)
        
        console.log("Loading visualization for analysis_id:", analysisId)
        
        // Try to fetch from backend API first
        const response = await fetch(`http://localhost:8000/api/analysis/visualization/${analysisId}`)
        
        if (response.ok) {
          const content = await response.text()
          if (content && content.trim().length > 100) { // Valid HTML content
            console.log("✅ Loaded visualization from backend:", content.length, "characters")
            setHtmlContent(content)
            setLoading(false)
            return
          } else {
            console.warn("Empty or invalid content from backend")
          }
        } else {
          console.warn(`Backend responded with ${response.status}`)
        }
        
        // If backend fails, try localStorage as fallback
        const vizKey = `viz_${analysisId}`
        const localContent = localStorage.getItem(vizKey)
        
        if (localContent && localContent.length > 100) {
          console.log("✅ Loaded visualization from localStorage")
          setHtmlContent(localContent)
          setLoading(false)
          return
        }
        
        // If both fail, show error
        throw new Error("No visualization data found")
        
      } catch (err) {
        console.error("Failed to load visualization:", err)
        setError("Failed to load visualization")
        setLoading(false)
      }
    }

    if (analysisId && analysisId !== "unknown") {
      loadVisualization()
    } else {
      setError("Invalid analysis ID")
      setLoading(false)
    }
  }, [analysisId])

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Loading visualization...</p>
        </div>
      </div>
    )
  }

  if (error || !htmlContent) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded">
        <div className="text-center text-gray-600">
          <p>📊 Visualization not available</p>
          <p className="text-sm mt-1">{error || "No visualization data found"}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
          >
            Retry Load
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-64 bg-white rounded overflow-hidden">
      <iframe
        srcDoc={htmlContent}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
        title="Analysis Visualization"
        style={{ minHeight: '256px' }}
      />
    </div>
  )
}

