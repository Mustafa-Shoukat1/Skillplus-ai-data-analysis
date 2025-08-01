"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, BarChart3, Users, TrendingUp, Target, MessageSquare, Star } from "lucide-react"

interface PlatformSelectionProps {
  user: any
  onSelectPlatform: (platform: 'skillpulse' | 'feedbackpulse') => void
  onBackToLogin: () => void
}

export default function PlatformSelection({ user, onSelectPlatform, onBackToLogin }: PlatformSelectionProps) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="animated-bg"></div>
      
      {/* Dark overlay for better contrast */}
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"></div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 gradient-text-visible">
            Choose Your Application
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Select the analytics platform you want to access
          </p>
          <div className="flex items-center justify-center space-x-3 text-gray-400">
            <span>Welcome back,</span>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
              {user?.name || user?.username}
            </Badge>
            <span>({user?.role})</span>
          </div>
        </div>

        {/* Platform Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
          {/* SkillPulse Card */}
          <Card 
            className="glass border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 cursor-pointer group card-3d"
            onClick={() => onSelectPlatform('skillpulse')}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">SP</span>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-white mb-2">
                SkillPulse
              </CardTitle>
              <p className="text-gray-300 text-sm leading-relaxed">
                Enterprise skills management platform for conducting assessments, tracking performance, and analyzing skill gaps across your organization.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Features */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-3 text-blue-200">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  <span className="text-sm">Performance Analytics</span>
                </div>
                <div className="flex items-center space-x-3 text-blue-200">
                  <Users className="h-5 w-5 text-blue-400" />
                  <span className="text-sm">Team Assessment Tools</span>
                </div>
                <div className="flex items-center space-x-3 text-blue-200">
                  <Target className="h-5 w-5 text-blue-400" />
                  <span className="text-sm">Skills Gap Analysis</span>
                </div>
                <div className="flex items-center space-x-3 text-blue-200">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  <span className="text-sm">Growth Tracking</span>
                </div>
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-3 rounded-lg transition-all duration-300 group-hover:scale-105"
                onClick={() => onSelectPlatform('skillpulse')}
              >
                Access SkillPulse
              </Button>
            </CardContent>
          </Card>

          {/* FeedbackPulse Card */}
          <Card 
            className="glass border-teal-500/30 hover:border-teal-400/50 transition-all duration-300 cursor-pointer group card-3d opacity-60"
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">FP</span>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-white mb-2">
                FeedbackPulse
              </CardTitle>
              <p className="text-gray-300 text-sm leading-relaxed">
                Customer feedback analytics platform for measuring satisfaction, tracking NPS, and analyzing customer experience across all channels.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Features */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-3 text-teal-200">
                  <MessageSquare className="h-5 w-5 text-teal-400" />
                  <span className="text-sm">Customer Feedback</span>
                </div>
                <div className="flex items-center space-x-3 text-teal-200">
                  <Star className="h-5 w-5 text-teal-400" />
                  <span className="text-sm">NPS Tracking</span>
                </div>
                <div className="flex items-center space-x-3 text-teal-200">
                  <BarChart3 className="h-5 w-5 text-teal-400" />
                  <span className="text-sm">Satisfaction Analytics</span>
                </div>
                <div className="flex items-center space-x-3 text-teal-200">
                  <TrendingUp className="h-5 w-5 text-teal-400" />
                  <span className="text-sm">Experience Insights</span>
                </div>
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-gray-300 font-semibold py-3 rounded-lg cursor-not-allowed"
                disabled
              >
                Disabled for now
              </Button>
              
              <div className="text-center mt-2">
                <Badge variant="outline" className="text-xs text-gray-400 border-gray-500">
                  Talk to your admin for access
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Back to Login Button */}
        <Button
          onClick={onBackToLogin}
          variant="outline"
          className="mt-8 glass border-white/20 text-gray-300 hover:bg-white/10 flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Login</span>
        </Button>

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>Need help? Contact your system administrator</p>
        </div>
      </div>
    </div>
  )
}
