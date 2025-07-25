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
        // First try localStorage
        const vizKey = `viz_${analysisId}`
        const localContent = localStorage.getItem(vizKey)
        
        if (localContent && localContent.length > 100) { // Valid HTML content
          console.log("Loading visualization from localStorage")
          setHtmlContent(localContent)
          setLoading(false)
          return
        }
        
        console.log("Visualization not in localStorage, trying backend...")
        
        // If not in localStorage, try to fetch from backend using the analysis_id
        const response = await fetch(`http://localhost:8000/api/analysis/visualization/${analysisId}`)
        
        if (response.ok) {
          const content = await response.text()
          if (content && content.length > 100) { // Valid HTML content
            console.log("Loading visualization from backend")
            setHtmlContent(content)
            
            // Try to cache it locally for next time (if not too large)
            try {
              localStorage.setItem(vizKey, content)
            } catch (cacheError) {
              if (cacheError instanceof Error) {
                console.warn("Could not cache visualization:", cacheError.message)
              } else {
                console.warn("Could not cache visualization:", cacheError)
              }
            }
          } else {
            throw new Error("Empty or invalid content from backend")
          }
        } else {
          throw new Error(`Backend responded with ${response.status}`)
        }
      } catch (err) {
        console.error("Failed to load visualization:", err)
        setError("Failed to load visualization")
      } finally {
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
          <p>📊 Visualization temporarily unavailable</p>
          <p className="text-sm mt-1">
            {error === "Invalid analysis ID" ? "Invalid ID" : "Large visualization - please refresh to retry"}
          </p>
          {analysisId && analysisId !== "unknown" && (
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
            >
              Retry Load
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <iframe
      srcDoc={htmlContent}
      className="w-full h-64 border-0 rounded"
      sandbox="allow-scripts allow-same-origin"
      title="Analysis Visualization"
    />
  )
}
