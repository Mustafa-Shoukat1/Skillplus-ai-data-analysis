"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BarChart3, Eye, EyeOff, FileText, Calendar, Users, Grid3X3, Mail } from "lucide-react"

interface LoginFormProps {
  onLogin: (username: string, password: string) => boolean
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const success = onLogin(username, password)
    if (!success) {
      setError("Invalid username or password")
    }
    setLoading(false)
  }

  const features = [
    {
      icon: <BarChart3 className="h-8 w-8 text-blue-700" />,
      title: "Real-time Analytics",
      description:
        "Get instant insights into your organization's skill landscape with powerful dashboards and reports.",
    },
    {
      icon: <FileText className="h-8 w-8 text-blue-700" />,
      title: "Smart Assessments",
      description: "Create custom competency assessments with AI-powered recommendations and automated scoring.",
    },
    {
      icon: <Calendar className="h-8 w-8 text-blue-700" />,
      title: "Skills Gap Analysis",
      description: "Identify critical skill gaps and get actionable recommendations for training and development.",
    },
    {
      icon: <Users className="h-8 w-8 text-blue-700" />,
      title: "360° Feedback",
      description: "Collect comprehensive feedback from managers, peers, and direct reports in one platform.",
    },
    {
      icon: <Grid3X3 className="h-8 w-8 text-blue-700" />,
      title: "Employee Self-Service",
      description: "Empower employees to track their progress and create personalized development plans.",
    },
    {
      icon: <Mail className="h-8 w-8 text-blue-700" />,
      title: "Seamless Integration",
      description: "Connect with your existing HRIS, ATS, and learning platforms for a unified experience.",
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Navigation */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-6 w-6 text-blue-400" />
              <span className="text-xl font-bold text-white">SkillPulse</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-slate-300 hover:text-white font-medium transition-colors">
                Features
              </a>
              <a href="#" className="text-slate-300 hover:text-white font-medium transition-colors">
                Pricing
              </a>
              <a href="#" className="text-slate-300 hover:text-white font-medium transition-colors">
                Resources
              </a>
              <a href="#" className="text-slate-300 hover:text-white font-medium transition-colors">
                Contact
              </a>
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white font-medium bg-transparent"
                onClick={() => setShowLoginForm(true)}
              >
                Sign In
              </Button>
              <Button className="bg-blue-700 hover:bg-blue-800 text-white font-medium px-4 py-2">
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Transform Your Workforce with AI-Powered Competency Management
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-4xl mx-auto leading-relaxed">
              Assess, track, and develop employee skills at scale. Join 500+ companies using SkillPulse to build
              high-performing teams.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-white text-white hover:bg-white hover:text-slate-900 bg-transparent font-semibold px-8 py-3 text-lg"
              >
                See Demo
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-slate-900 bg-transparent font-semibold px-8 py-3 text-lg"
              >
                Watch Video
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-40 h-40 bg-slate-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-10 w-20 h-20 bg-blue-400/20 rounded-full blur-2xl"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-28 bg-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Everything HR Needs to Manage Competencies
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 hover:border-blue-300"
              >
                <div className="mb-6 p-3 bg-blue-50 rounded-lg w-fit">{feature.icon}</div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Login Modal Overlay */}
      {showLoginForm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
                <button
                  onClick={() => setShowLoginForm(false)}
                  className="text-slate-400 hover:text-slate-600 text-2xl font-light"
                >
                  ×
                </button>
              </div>

              <p className="text-slate-600 mb-8">Sign in to your SkillPulse account</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-2">
                    Username
                  </label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 border-slate-300 focus:border-blue-700 focus:ring-blue-700 text-base"
                    placeholder="Enter your username"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 border-slate-300 focus:border-blue-700 focus:ring-blue-700 pr-12 text-base"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-blue-700 focus:ring-blue-700 border-slate-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700">
                      Remember me
                    </label>
                  </div>
                  <a href="#" className="text-sm text-blue-700 hover:text-blue-800 font-medium">
                    Forgot password?
                  </a>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-sm font-medium">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-base"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-600">
                  Don't have an account?{" "}
                  <a href="#" className="text-blue-700 hover:text-blue-800 font-semibold">
                    Start free trial
                  </a>
                </p>
              </div>

              {/* Demo Accounts */}
              <div className="mt-8 bg-slate-50 rounded-lg p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-4 text-center">Demo Accounts</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-900">Admin Access</span>
                      <p className="text-xs text-slate-500">Full system access</p>
                    </div>
                    <code className="text-xs bg-slate-100 px-3 py-1 rounded font-mono text-slate-700">
                      admin / admin123
                    </code>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-900">Viewer Access</span>
                      <p className="text-xs text-slate-500">Read-only access</p>
                    </div>
                    <code className="text-xs bg-slate-100 px-3 py-1 rounded font-mono text-slate-700">
                      viewer1 / viewer123
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer CTA */}
      <section className="bg-gradient-to-r from-slate-900 to-blue-900 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to transform your workforce?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of companies already using SkillPulse to build high-performing teams.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 font-semibold px-8 py-3 text-lg">
              Start Free Trial
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-2 border-white text-white hover:bg-white hover:text-slate-900 bg-transparent font-semibold px-8 py-3 text-lg"
              onClick={() => setShowLoginForm(true)}
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
