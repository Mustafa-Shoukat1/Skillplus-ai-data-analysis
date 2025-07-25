"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Upload, Search, BarChart3, LogOut, Zap } from "lucide-react"

interface HeaderProps {
  onSearch: (query: string) => void
  user: any
  onLogout: () => void
  onFileUpload: (file: File) => void
  isUploading: boolean
}

export default function ProfessionalHeader({ onSearch, user, onLogout, onFileUpload, isUploading }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (
      file &&
      (file.type === "text/csv" ||
        file.name.endsWith(".csv") ||
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls"))
    ) {
      onFileUpload(file)
      alert(`Processing ${file.name}...`)
    } else {
      alert("Please select a valid CSV or Excel file")
    }

    // Reset the input so the same file can be uploaded again
    event.target.value = ""
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim())
    }
  }

  const isAdmin = user?.role === "admin"

  return (
    <header className="glass border-b border-white/10 px-6 py-4 sticky top-0 z-50 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg transform hover:scale-110 transition-all duration-300 card-3d">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-300"></div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-lg">
              SkillPulse Analytics
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-300 font-medium">Enterprise Edition</span>
            </div>
          </div>
        </div>

        {/* Center Actions */}
        <div className="flex items-center space-x-6">
          {/* File Upload - Admin Only */}
          {isAdmin && (
            <div className="relative group">
              <input
                type="file"
                id="csvFileInput"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <Label htmlFor="csvFileInput">
                <Button
                  variant="default"
                  className="btn-3d glass border-blue-500/30 text-white hover:border-blue-400/50 cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg"
                  disabled={isUploading}
                  asChild
                >
                  <span className="flex items-center space-x-2">
                    {isUploading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span>{isUploading ? "Processing..." : "Upload Data"}</span>
                    <Zap className="h-3 w-3 opacity-70" />
                  </span>
                </Button>
              </Label>

              {/* Tooltip */}
              <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                Upload CSV/Excel files
              </div>
            </div>
          )}

          {/* Employee Search */}
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <Input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="w-80 glass border-white/20 focus:border-blue-400/50 text-white placeholder-gray-400 bg-white/5 backdrop-blur-xl"
              />
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
            <Button
              onClick={handleSearch}
              className="btn-3d glass bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white border-green-400/30 shadow-lg micro-bounce"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* User Menu */}
        <div className="flex items-center space-x-4">
          {/* Status Indicator */}
          <div className="flex items-center space-x-3 glass px-4 py-2 rounded-xl border-white/10">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-white">{user?.name || user?.username}</span>
              <Badge
                variant={isAdmin ? "default" : "secondary"}
                className={`text-xs ${isAdmin ? "bg-gradient-to-r from-orange-500 to-red-500" : "bg-gradient-to-r from-blue-500 to-cyan-500"} text-white border-0 shadow-lg`}
              >
                {user?.role}
              </Badge>
            </div>
            <div className="status-online">
              <Avatar className="h-10 w-10 ring-2 ring-blue-400/50 ring-offset-2 ring-offset-transparent">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                  {user?.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Logout Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="glass border-white/10 text-white hover:bg-white/10 btn-3d">
                <LogOut className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="glass border-white/20 bg-black/40 backdrop-blur-xl" align="end">
              <DropdownMenuItem
                onClick={onLogout}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Animated Border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
    </header>
  )
}
