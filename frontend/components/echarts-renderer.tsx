"use client"

import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

interface EChartsRendererProps {
  optionCode: string
  width?: string | number
  height?: string | number
  className?: string
}

const EChartsRenderer: React.FC<EChartsRendererProps> = ({
  optionCode,
  width = '100%',
  height = '600px',
  className = ''
}) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current || !optionCode) return

    try {
      // Initialize chart
      if (chartInstance.current) {
        chartInstance.current.dispose()
      }
      
      chartInstance.current = echarts.init(chartRef.current)

      // Parse and execute the option code
      let option: echarts.EChartsOption
      
      try {
        // Clean the option code and evaluate it
        const cleanCode = optionCode.trim()
        cleanCode.replace(/;$/, '') // Remove trailing semicolon
        // remove ``` ```
        cleanCode.replace(/```/g, '') // Remove code fences
        // If it's a complete JavaScript object, evaluate it
        if (cleanCode.startsWith('{') && cleanCode.endsWith('};')) {
          // Remove the trailing semicolon and evaluate
          const optionString = cleanCode.slice(0, -1)
          option = eval(`(${optionString})`)
        } else if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
          // Already a clean object
          option = eval(`(${cleanCode})`)
        } else {
          // Try to parse as JSON first
          option = JSON.parse(cleanCode)
        }
      } catch (parseError) {
        console.error('Failed to parse ECharts option:', parseError)
        // Fallback option
        option = {
          title: {
            text: 'Chart Rendering Error',
            left: 'center'
          },
          graphic: {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: 'Unable to render chart\nCheck option format',
              fontSize: 16,
              fill: '#666'
            }
          }
        }
      }

      // Set the option
      chartInstance.current.setOption(option as any, true)

    } catch (error) {
      console.error('ECharts rendering error:', error)
    }

    // Handle resize
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize()
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
    }
  }, [optionCode])

  return (
    <div 
      ref={chartRef} 
      className={className}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width, 
        height: typeof height === 'number' ? `${height}px` : height,
        minHeight: '400px'
      }} 
    />
  )
}

export default EChartsRenderer
