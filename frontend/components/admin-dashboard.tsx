"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Bot, Users, FileText, Brain, CheckCircle } from "lucide-react"
import FileUpload from "./file-upload"
import UserManagement from "./user-management"
import AIAnalysisGenerator from "./ai-analysis-generator"

interface AdminDashboardProps {
  user: any
  csvData: any[]
  onDataLoaded: (data: any[], departments: string[], analytics: any) => void
  analyses: any[]
  onAnalysisGenerated: (analysis: any) => void
  users: any[]
  onAddUser: (user: any) => void
  onDeleteUser: (userId: string) => void
}

export default function AdminDashboard({
  user,
  csvData,
  onDataLoaded,
  analyses,
  onAnalysisGenerated,
  users,
  onAddUser,
  onDeleteUser,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("upload")

  const getTabIcon = (tabId: string) => {
    switch (tabId) {
      case "upload":
        return <Upload className="h-4 w-4" />
      case "ai-analysis":
        return <Bot className="h-4 w-4" />
      case "users":
        return <Users className="h-4 w-4" />
      case "reports":
        return <FileText className="h-4 w-4" />
      default:
        return null
    }
  }

  const getAnalysisStats = () => {
    const total = analyses.length
    const recent = analyses.filter((a) => {
      const analysisDate = new Date(a.timestamp)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return analysisDate > dayAgo
    }).length

    return { total, recent }
  }

  const stats = getAnalysisStats()

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="animated-bg"></div>

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white gradient-text-visible">Admin Control Center</h1>
              <p className="text-gray-300 mt-2">Manage data, generate AI insights, and control user access</p>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center space-x-4">
              <div className="glass px-4 py-3 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{csvData.length}</div>
                    <div className="text-xs text-gray-300">CSV Records</div>
                  </div>
                </div>
              </div>

              <div className="glass px-4 py-3 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{stats.total}</div>
                    <div className="text-xs text-gray-300">AI Analyses</div>
                  </div>
                </div>
              </div>

              <div className="glass px-4 py-3 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">
                      {users.filter((u) => u.role === "viewer").length}
                    </div>
                    <div className="text-xs text-gray-300">Viewers</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass border-white/20 bg-white/5 p-1">
            <TabsTrigger
              value="upload"
              className="flex items-center space-x-2 data-[state=active]:bg-blue-500/20 data-[state=active]:text-white text-gray-300"
            >
              {getTabIcon("upload")}
              <span>Data Upload</span>
            </TabsTrigger>
            <TabsTrigger
              value="ai-analysis"
              className="flex items-center space-x-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-white text-gray-300"
            >
              {getTabIcon("ai-analysis")}
              <span>AI Analysis</span>
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="flex items-center space-x-2 data-[state=active]:bg-green-500/20 data-[state=active]:text-white text-gray-300"
            >
              {getTabIcon("users")}
              <span>User Management</span>
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="flex items-center space-x-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-white text-gray-300"
            >
              {getTabIcon("reports")}
              <span>Analysis Reports</span>
            </TabsTrigger>
          </TabsList>

          {/* Data Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>CSV Data Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload onDataLoaded={onDataLoaded} />

                {csvData.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Data Preview</h3>
                    <div className="glass rounded-lg overflow-hidden">
                      <div className="overflow-x-auto max-h-96">
                        <table className="min-w-full">
                          <thead className="bg-white/10">
                            <tr>
                              {Object.keys(csvData[0] || {}).map((key) => (
                                <th
                                  key={key}
                                  className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                                >
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {csvData.slice(0, 5).map((row, index) => (
                              <tr key={index} className="hover:bg-white/5">
                                {Object.values(row).map((value: any, i) => (
                                  <td key={i} className="px-4 py-3 text-sm text-gray-300">
                                    {String(value)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {csvData.length > 5 && (
                        <div className="bg-white/5 px-4 py-3 text-sm text-gray-400">
                          Showing 5 of {csvData.length} records
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Analysis Tab */}
          <TabsContent value="ai-analysis" className="space-y-6">
            <AIAnalysisGenerator csvData={csvData} onAnalysisGenerated={onAnalysisGenerated} analyses={analyses} />
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <UserManagement currentUser={user} users={users} onAddUser={onAddUser} onDeleteUser={onDeleteUser} />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Analysis Reports</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyses.length === 0 ? (
                  <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-white mb-2">No analyses generated yet</h3>
                    <p className="text-gray-400">Use the AI Analysis tab to generate your first report</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analyses.map((analysis, index) => (
                      <div key={index} className="glass rounded-lg p-4 border-white/10">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-white">{analysis.title}</h3>
                            <p className="text-gray-400 text-sm">{analysis.prompt}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Generated
                            </Badge>
                            <span className="text-xs text-gray-400">{analysis.timestamp}</span>
                          </div>
                        </div>

                        {analysis.insights && (
                          <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <h4 className="font-semibold text-blue-300 mb-1 flex items-center">
                              <Brain className="h-4 w-4 mr-1" />
                              AI Insights
                            </h4>
                            <p className="text-blue-200 text-sm">{analysis.insights}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
