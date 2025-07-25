"use client"

import { useState } from "react"
import FileUpload from "./file-upload"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Building, TrendingUp } from "lucide-react"

interface CSVUploadHandlerProps {
  onDataLoaded: (employees: any[], departments: string[], analytics: any) => void
  isVisible: boolean
}

export default function CSVUploadHandler({ onDataLoaded, isVisible }: CSVUploadHandlerProps) {
  const [uploadStats, setUploadStats] = useState<any>(null)

  const handleDataLoaded = (employees: any[], departments: string[], analytics: any) => {
    setUploadStats({
      employeeCount: employees.length,
      departmentCount: departments.length,
      avgScore: analytics.avgPerformance,
    })
    onDataLoaded(employees, departments, analytics)
  }

  if (!isVisible) return null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            CSV Data Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload onDataLoaded={handleDataLoaded} />

          {uploadStats && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{uploadStats.employeeCount}</div>
                <div className="text-sm text-green-700">Employees</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Building className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">{uploadStats.departmentCount}</div>
                <div className="text-sm text-blue-700">Departments</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-600">{uploadStats.avgScore}%</div>
                <div className="text-sm text-purple-700">Avg Performance</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
