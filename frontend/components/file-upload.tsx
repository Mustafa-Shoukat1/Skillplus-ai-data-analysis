"use client"

import type React from "react"
import { useState, useRef } from "react"
import { uploadFile } from "@/lib/api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface FileUploadProps {
  onDataLoaded: (data: any[], departments: string[], analytics: any, fileId?: string) => void
}

export default function FileUpload({ onDataLoaded }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [uploadedFileData, setUploadedFileData] = useState<any>(null)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseCSVLine = (line: string) => {
    const result = []
    let current = ""
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === "," && !inQuotes) {
        result.push(current)
        current = ""
      } else {
        current += char
      }
    }

    result.push(current)
    return result
  }

  const parseStrengthsOrAreas = (names: string, scores: string) => {
    if (!names || !scores) return []

    const nameList = names
      .split(";")
      .map((n) => n.trim())
      .filter((n) => n)
    const scoreList = scores.split(";").map((s) => Number.parseFloat(s.trim()) || 0)

    return nameList.map((name, index) => ({
      name: name,
      score: scoreList[index] || 0,
    }))
  }

  const processCSVData = (csvText: string) => {
    const lines = csvText.trim().split("\n")
    const headers = lines[0].split(",").map((h) => h.trim())

    console.log("CSV Headers:", headers)

    const employees = []
    const departmentData: { [key: string]: any } = {}
    let totalScore = 0
    let validEmployees = 0

    // Process each employee row
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])

      if (values.length >= 8) {
        const employee = {
          id: values[0]?.trim() || `EMP${i}`,
          name: values[1]?.trim() || `Employee ${i}`,
          department: values[2]?.trim() || "General",
          overallScore: Number.parseFloat(values[3]) || Math.floor(Math.random() * 40) + 60,
          strengths: parseStrengthsOrAreas(values[4] || "", values[5] || ""),
          developmentAreas: parseStrengthsOrAreas(values[6] || "", values[7] || ""),
          role: values[8]?.trim() || "Employee",
          joinDate: values[9]?.trim() || new Date().toISOString().split("T")[0],
          lastReview: values[10]?.trim() || new Date().toISOString().split("T")[0],
        }

        // Validate employee data
        if (employee.id && employee.name) {
          employees.push(employee)

          // Aggregate department data
          if (!departmentData[employee.department]) {
            departmentData[employee.department] = {
              employees: [],
              totalScore: 0,
              count: 0,
              name: employee.department,
            }
          }

          departmentData[employee.department].employees.push(employee)
          departmentData[employee.department].totalScore += employee.overallScore
          departmentData[employee.department].count += 1

          totalScore += employee.overallScore
          validEmployees++
        }
      }
    }

    // Calculate department averages
    Object.keys(departmentData).forEach((dept) => {
      departmentData[dept].averageScore = Math.round(departmentData[dept].totalScore / departmentData[dept].count)
    })

    const departments = Object.keys(departmentData).sort()
    const globalAverageScore = validEmployees > 0 ? Math.round(totalScore / validEmployees) : 0

    const analytics = {
      totalEmployees: validEmployees,
      avgPerformance: globalAverageScore,
      departments: departments,
      departmentData: departmentData,
      performanceDistribution: {
        good: employees.filter((e) => e.overallScore >= 70).length,
        average: employees.filter((e) => e.overallScore >= 50 && e.overallScore < 70).length,
        immediate: employees.filter((e) => e.overallScore < 50).length,
      },
    }

    console.log(`Processed ${validEmployees} employees from ${departments.length} departments`)

    return { employees, departments, analytics }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file type - Enhanced to support Excel
    const allowedTypes = ['.csv', '.xlsx', '.xls']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!allowedTypes.includes(fileExtension)) {
      setError("Please select a CSV or Excel file")
      return
    }

    setUploading(true)
    setError("")
    setShowPreview(false)

    try {
      console.log("Starting file upload to backend...")
      
      // ALWAYS upload file to backend first
      const uploadResponse = await uploadFile(file)

      if (!uploadResponse.success) {
        throw new Error(uploadResponse.error || 'Upload failed')
      }

      console.log("Backend upload successful:", uploadResponse.data)
      const uploadData = uploadResponse.data

      // Handle different file types
      if (file.name.toLowerCase().endsWith('.csv')) {
        console.log("Processing CSV locally for immediate display...")
        
        const reader = new FileReader()
        
        reader.onload = (e) => {
          try {
            const csvText = e.target?.result as string
            const { employees, departments, analytics } = processCSVData(csvText)
            
            console.log("Local CSV processing completed:", {
              employees: employees.length,
              departments: departments.length,
              analytics
            })
            
            // Call with backend file_id for future analysis
            onDataLoaded(employees, departments, analytics, uploadData.file_id)

            // Store in localStorage for persistence
            localStorage.setItem("employeeData", JSON.stringify(employees))
            localStorage.setItem("departmentData", JSON.stringify(departments))
            localStorage.setItem("analyticsData", JSON.stringify(analytics))
            localStorage.setItem("uploadedFileId", uploadData.file_id)
            
            console.log("Data loaded and stored with file_id:", uploadData.file_id)
            
            // Set up preview for CSV
            setUploadedFileData({
              ...uploadData,
              csvPreview: { employees: employees.slice(0, 10), departments, analytics }
            })
            setShowPreview(true)
            
          } catch (parseError) {
            console.error("Error parsing CSV:", parseError)
            setError("Error parsing CSV file. Please check the format.")
          }
        }

        reader.onerror = () => {
          setError("Error reading file")
        }

        reader.readAsText(file)
        
      } else {
        // Handle Excel files - Process ALL sheets automatically
        console.log("Excel file uploaded, processing all sheets automatically...")
        processExcelFile(uploadData)
      }

    } catch (uploadError) {
      console.error("Upload error:", uploadError)
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const processExcelFile = (uploadData: any) => {
    console.log("Processing Excel file with enhanced multi-sheet support:", uploadData.sheets)
    
    // Create enhanced data structure for Excel files with skiprows=4 processing
    const excelAnalytics = {
      totalEmployees: 0,
      avgPerformance: 0,
      departments: [],
      sheets: uploadData.sheets || [],
      totalSheets: uploadData.total_sheets || 1,
      sheetsInfo: uploadData.summary?.sheets_info || {},
      summary: uploadData.summary || {},
      fileInfo: {
        filename: uploadData.filename,
        fileType: uploadData.file_type,
        totalSheets: uploadData.total_sheets,
        allSheetsProcessed: true,
        processingMethod: "skiprows_4_multi_sheet",
        combinedShape: uploadData.summary?.combined_df_shape || [0, 0]
      }
    }
    
    // Log enhanced sheet information
    console.log(`Excel file processed with skiprows=4:`)
    console.log(`- Total sheets: ${excelAnalytics.totalSheets}`)
    console.log(`- Combined shape: ${excelAnalytics.fileInfo.combinedShape}`)
    console.log(`- Processing method: ${excelAnalytics.fileInfo.processingMethod}`)
    
    onDataLoaded([], [], excelAnalytics, uploadData.file_id)
    
    localStorage.setItem("uploadedFileId", uploadData.file_id)
    localStorage.setItem("excelFileData", JSON.stringify(uploadData))
    
    console.log("Enhanced Excel file processed, file_id:", uploadData.file_id)
    
    // Set up preview for Excel with enhanced info
    setUploadedFileData({
      ...uploadData,
      enhanced_processing: true,
      processing_method: "skiprows_4_multi_sheet"
    })
    setShowPreview(true)
  }

  const generateSampleCSV = () => {
    const sampleData = [
      [
        "ID",
        "Name",
        "Department",
        "Overall Score",
        "Strengths",
        "Strength Scores",
        "Development Areas",
        "Development Scores",
        "Role",
        "Join Date",
        "Last Review",
      ],
      [
        "EMP001",
        "John Doe",
        "Engineering",
        "85",
        "Leadership;Communication",
        "90;80",
        "Time Management",
        "65",
        "Senior Developer",
        "2023-01-15",
        "2024-12-01",
      ],
      [
        "EMP002",
        "Jane Smith",
        "Marketing",
        "78",
        "Creativity;Analytics",
        "85;75",
        "Public Speaking;Project Management",
        "60;55",
        "Marketing Manager",
        "2023-03-20",
        "2024-11-15",
      ],
      [
        "EMP003",
        "Mike Johnson",
        "Sales",
        "92",
        "Negotiation;Customer Relations",
        "95;88",
        "Technical Knowledge",
        "70",
        "Sales Director",
        "2022-08-10",
        "2024-12-10",
      ],
      [
        "EMP004",
        "Sarah Wilson",
        "HR",
        "76",
        "Empathy;Organization",
        "80;72",
        "Data Analysis;Strategic Planning",
        "65;68",
        "HR Specialist",
        "2023-06-01",
        "2024-11-20",
      ],
      [
        "EMP005",
        "David Brown",
        "Engineering",
        "88",
        "Problem Solving;Innovation",
        "90;86",
        "Communication;Leadership",
        "70;75",
        "Tech Lead",
        "2022-11-30",
        "2024-12-05",
      ],
    ]

    const csvContent = sampleData.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "sample_employee_data.csv"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const renderSheetPreview = (sheetName: string, sheetInfo: any) => {
    if (!sheetInfo.preview_data || !Array.isArray(sheetInfo.preview_data)) {
      return (
        <div className="text-center py-4 text-gray-400">
          <p>No preview data available for this sheet</p>
          <p className="text-xs">Processed with skiprows=4</p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto">
        <div className="bg-blue-500/10 px-3 py-2 rounded-t border border-blue-500/20">
          <p className="text-blue-300 text-xs">
            📋 Processed with skiprows=4 | Shape: {sheetInfo.shape?.[0] || 0} × {sheetInfo.shape?.[1] || 0}
          </p>
        </div>
        <table className="min-w-full">
          <thead className="bg-white/10">
            <tr>
              {sheetInfo.columns?.map((column: string, index: number) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {sheetInfo.preview_data.slice(0, 5).map((row: any, rowIndex: number) => (
              <tr key={rowIndex} className="hover:bg-white/5">
                {sheetInfo.columns?.map((column: string, colIndex: number) => (
                  <td key={colIndex} className="px-4 py-3 text-sm text-gray-300">
                    {String(row[column] || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="bg-white/5 px-4 py-3 text-sm text-gray-400">
          Showing 5 of {sheetInfo.shape?.[0] || 0} rows, {sheetInfo.shape?.[1] || 0} columns
          <span className="ml-2 text-blue-400">• Processed with skiprows=4</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center hover:border-blue-400/50 transition-colors glass">
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />

        <div className="space-y-4">
          <div className="text-4xl text-white">📊</div>
          <div>
            <h3 className="text-lg font-medium text-white mb-2">Update Data File</h3>
            <p className="text-gray-400">Upload your CSV or Excel file to analyze data with AI-powered insights</p>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium btn-3d"
            >
              {uploading ? "Uploading..." : "Choose File"}
            </button>

            <button
              onClick={generateSampleCSV}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium btn-3d"
            >
              Download Sample CSV
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass border-red-500/30 bg-red-500/10 rounded-lg p-4">
          <div className="flex items-center text-red-300">
            <span className="mr-3">❌ Error</span>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* File Preview Section */}
      {showPreview && uploadedFileData && (
        <Card className="glass border-blue-500/30 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-blue-300 flex items-center space-x-2">
              <span>File Preview</span>
              <span className="text-sm font-normal text-blue-400">
                ({uploadedFileData.filename})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {uploadedFileData.sheets && uploadedFileData.sheets.length > 1 ? (
              // Multi-sheet Excel preview with tabs
              <div>
                <div className="mb-4 text-blue-200 text-sm">
                  Excel file with {uploadedFileData.total_sheets} sheets detected. All sheets will be processed automatically for AI analysis.
                </div>
                <Tabs defaultValue={uploadedFileData.sheets[0]} className="w-full">
                  <TabsList className="glass border-white/20 bg-white/5 p-1 mb-4">
                    {uploadedFileData.sheets.map((sheetName: string) => (
                      <TabsTrigger
                        key={sheetName}
                        value={sheetName}
                        className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-white text-gray-300"
                      >
                        {sheetName}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {uploadedFileData.sheets.map((sheetName: string) => (
                    <TabsContent key={sheetName} value={sheetName}>
                      <div className="glass rounded-lg overflow-hidden">
                        <div className="bg-white/10 px-4 py-2">
                          <h4 className="font-semibold text-white">Sheet: {sheetName}</h4>
                        </div>
                        {/* Use sheets_info from the summary for preview data */}
                        {uploadedFileData.summary?.sheets_info?.[sheetName] ? 
                          renderSheetPreview(sheetName, uploadedFileData.summary.sheets_info[sheetName]) :
                          <div className="text-center py-4 text-gray-400">
                            <p>Sheet preview not available</p>
                          </div>
                        }
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            ) : uploadedFileData.csvPreview ? (
              // CSV preview
              <div className="glass rounded-lg overflow-hidden">
                <div className="bg-white/10 px-4 py-2">
                  <h4 className="font-semibold text-white">CSV Data Preview</h4>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full">
                    <thead className="bg-white/10">
                      <tr>
                        {uploadedFileData.csvPreview.departments.map((dep: string, index: number) => (
                          <th key={index} className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                            {dep}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {uploadedFileData.csvPreview.employees.slice(0, 10).map((emp: any, index: number) => (
                        <tr key={index} className="hover:bg-white/5">
                          <td className="px-4 py-3 text-sm text-gray-300">{emp.id}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{emp.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{emp.department}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{emp.overallScore}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // Single sheet Excel or basic preview using sheets_info
              <div className="glass rounded-lg overflow-hidden">
                <div className="bg-white/10 px-4 py-2">
                  <h4 className="font-semibold text-white">
                    {uploadedFileData.file_type === '.csv' ? 'CSV Data Preview' : 'Excel Data Preview'}
                  </h4>
                </div>
                {/* Use sheets_info for single sheet or CSV preview */}
                {uploadedFileData.summary?.sheets_info ? (
                  (() => {
                    const firstSheetName = Object.keys(uploadedFileData.summary.sheets_info)[0];
                    const firstSheetData = uploadedFileData.summary.sheets_info[firstSheetName];
                    return renderSheetPreview(firstSheetName, firstSheetData);
                  })()
                ) : (
                  <div className="text-center py-4 text-gray-400">
                    <p>Preview not available</p>
                    <p className="text-xs">File processed successfully but preview data is missing</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="glass border-blue-500/30 bg-blue-500/10 rounded-lg p-4">
        <h4 className="font-semibold text-blue-300 mb-2">Supported File Formats</h4>
        <div className="text-blue-200 text-sm space-y-1">
          <p><strong>CSV Files:</strong> Comma-separated values with headers</p>
          <p><strong>Excel Files:</strong> .xlsx and .xls formats with automatic skiprows=4 processing</p>
          <p><strong>Multi-Sheet Excel:</strong> All sheets processed automatically, combined for analysis</p>
          <p><strong>Data Processing:</strong> Headers start from row 5 (skiprows=4), empty rows/columns cleaned</p>
          <p><strong>Sheet Combination:</strong> Uses common columns or largest sheet for analysis</p>
        </div>
      </div>
    </div>
  )
}
