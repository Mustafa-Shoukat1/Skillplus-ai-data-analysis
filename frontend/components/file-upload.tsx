"use client"

import type React from "react"
import { useState, useRef } from "react"

interface FileUploadProps {
  onDataLoaded: (data: any[], departments: string[], analytics: any) => void
}

export default function FileUpload({ onDataLoaded }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file")
      return
    }

    setUploading(true)
    setError("")

    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string
        const { employees, departments, analytics } = processCSVData(csvText)

        onDataLoaded(employees, departments, analytics)

        // Store in localStorage for persistence
        localStorage.setItem("employeeData", JSON.stringify(employees))
        localStorage.setItem("departmentData", JSON.stringify(departments))
        localStorage.setItem("analyticsData", JSON.stringify(analytics))
      } catch (error) {
        console.error("Error parsing CSV:", error)
        setError("Error parsing CSV file. Please check the format.")
      } finally {
        setUploading(false)
      }
    }

    reader.onerror = () => {
      setError("Error reading file")
      setUploading(false)
    }

    reader.readAsText(file)
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

  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center hover:border-blue-400/50 transition-colors glass">
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />

        <div className="space-y-4">
          <div className="text-4xl text-white">CSV</div>
          <div>
            <h3 className="text-lg font-medium text-white mb-2">Upload Employee Performance CSV</h3>
            <p className="text-gray-400">Upload your CSV file to analyze employee competencies and performance</p>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium btn-3d"
            >
              {uploading ? "Processing..." : "Choose CSV File"}
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
            <span className="mr-3">Error</span>
            <div>{error}</div>
          </div>
        </div>
      )}

      <div className="glass border-blue-500/30 bg-blue-500/10 rounded-lg p-4">
        <h4 className="font-semibold text-blue-300 mb-2">Expected CSV Format</h4>
        <div className="text-blue-200 text-sm space-y-1">
          <p>
            <strong>Columns:</strong> ID, Name, Department, Overall Score, Strengths, Strength Scores, Development
            Areas, Development Scores
          </p>
          <p>
            <strong>Example:</strong>
          </p>
          <code className="block bg-blue-500/20 p-2 rounded text-xs mt-2">
            EMP001,John Doe,Engineering,85,Leadership;Communication,90;80,Time Management,65
          </code>
        </div>
      </div>
    </div>
  )
}
