"use client"

import { useState, useEffect } from "react"
import ProfessionalHeader from "@/components/professional-header"
import AdminDashboard from "@/components/admin-dashboard"
import ViewerDashboard from "@/components/viewer-dashboard"
import LoginForm from "@/components/login-form"

// Initial users with proper structure
const INITIAL_USERS = [
  {
    id: "1",
    username: "admin",
    name: "Administrator",
    role: "admin" as const,
    password: "admin123",
    createdDate: "7/22/2025",
  },
  {
    id: "2",
    username: "hr_manager",
    name: "HR Manager",
    role: "admin" as const,
    password: "hr123",
    createdDate: "7/22/2025",
  },
  {
    id: "3",
    username: "viewer1",
    name: "John Viewer",
    role: "viewer" as const,
    password: "viewer123",
    createdDate: "7/22/2025",
  },
  {
    id: "4",
    username: "viewer2",
    name: "Jane Viewer",
    role: "viewer" as const,
    password: "viewer456",
    createdDate: "7/22/2025",
  },
  {
    id: "5",
    username: "guest",
    name: "Guest User",
    role: "viewer" as const,
    password: "guest123",
    createdDate: "7/22/2025",
  },
]

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [csvData, setCsvData] = useState<any[]>([])
  const [analyses, setAnalyses] = useState<any[]>([])
  const [users, setUsers] = useState(INITIAL_USERS)

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem("currentUser")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }

    // Load saved users
    const savedUsers = localStorage.getItem("systemUsers")
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers))
    }

    // Load saved analyses
    const savedAnalyses = localStorage.getItem("analyses")
    if (savedAnalyses) {
      setAnalyses(JSON.parse(savedAnalyses))
    }

    // Load saved CSV data
    const savedCsvData = localStorage.getItem("csvData")
    if (savedCsvData) {
      setCsvData(JSON.parse(savedCsvData))
    }

    setLoading(false)
  }, [])

  const handleLogin = (username: string, password: string) => {
    const userData = users.find((u) => u.username === username && u.password === password)
    if (userData) {
      const userSession = { username: userData.username, role: userData.role, name: userData.name }
      setUser(userSession)
      localStorage.setItem("currentUser", JSON.stringify(userSession))
      return true
    }
    return false
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem("currentUser")
  }

  const handleDataLoaded = (employees: any[], departments: string[], analytics: any) => {
    setCsvData(employees)
    localStorage.setItem("csvData", JSON.stringify(employees))

    console.log("Data loaded:", {
      employees: employees.length,
      departments: departments.length,
      analytics: analytics,
    })
  }

  const handleAnalysisGenerated = (analysis: any) => {
    console.log("Handling new analysis:", analysis.id)
    
    try {
      // SAFE: Add to state (this doesn't use localStorage directly)
      setAnalyses(prev => [...prev, analysis])
      
      // Don't try to store in localStorage here - it's already handled in the generator
      console.log("Analysis added to state successfully")
      
    } catch (error) {
      console.error("Error handling analysis:", error)
      // Don't show error to user since analysis was successful
      // Just log and continue
    }
  }

  const handleAddUser = (newUserData: any) => {
    const newUser = {
      ...newUserData,
      id: Date.now().toString(),
      createdDate: new Date().toLocaleDateString(),
    }
    const updatedUsers = [...users, newUser]
    setUsers(updatedUsers)
    localStorage.setItem("systemUsers", JSON.stringify(updatedUsers))
  }

  const handleDeleteUser = (userId: string) => {
    const updatedUsers = users.filter((u) => u.id !== userId)
    setUsers(updatedUsers)
    localStorage.setItem("systemUsers", JSON.stringify(updatedUsers))
  }

  const handleSearch = (query: string) => {
    console.log("Search query:", query)
    // Implement search functionality as needed
  }

  const handleFileUpload = (file: File) => {
    console.log("File upload:", file.name)
    // File upload is handled in the FileUpload component
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="animated-bg"></div>

        {/* 3D Loading Spinner */}
        <div className="relative">
          <div className="w-32 h-32 border-4 border-transparent border-t-blue-500 border-r-purple-500 rounded-full spin-3d"></div>
          <div
            className="absolute inset-0 w-24 h-24 m-auto border-4 border-transparent border-b-pink-500 border-l-indigo-500 rounded-full spin-3d"
            style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white font-semibold gradient-text">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="animated-bg"></div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <ProfessionalHeader
          onSearch={handleSearch}
          user={user}
          onLogout={handleLogout}
          onFileUpload={handleFileUpload}
          isUploading={false}
        />

        <main className="flex-1">
          {user.role === "admin" ? (
            <AdminDashboard
              user={user}
              csvData={csvData}
              onDataLoaded={handleDataLoaded}
              analyses={analyses}
              onAnalysisGenerated={handleAnalysisGenerated}
              users={users}
              onAddUser={handleAddUser}
              onDeleteUser={handleDeleteUser}
            />
          ) : (
            <ViewerDashboard user={user} />
          )}
        </main>
      </div>
    </div>
  )
}
