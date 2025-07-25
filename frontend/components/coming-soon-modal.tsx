"use client"

import type React from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface ComingSoonModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  icon: React.ReactNode
}

export default function ComingSoonModal({ isOpen, onClose, title, description, icon }: ComingSoonModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg">
                {icon}
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-purple-800">{title}</DialogTitle>
                <Badge variant="outline" className="text-xs border-red-300 text-red-600 mt-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse"></span>
                  Disabled for now
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="py-6">
          {/* Decorative Elements */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-white rounded-xl shadow-lg flex items-center justify-center">{icon}</div>
            </div>
            <div className="absolute top-2 left-8 w-3 h-3 bg-purple-300 rounded-full animate-pulse"></div>
            <div className="absolute top-8 right-12 w-2 h-2 bg-blue-300 rounded-full animate-pulse delay-100"></div>
            <div className="absolute bottom-4 left-12 w-4 h-4 bg-indigo-200 rounded-full animate-pulse delay-200"></div>
            <div className="absolute bottom-2 right-8 w-3 h-3 bg-cyan-200 rounded-full animate-pulse delay-300"></div>
            <div className="h-20"></div>
          </div>

          <div className="text-center space-y-4">
            <p className="text-gray-700 leading-relaxed">{description}</p>

            <div className="flex items-center justify-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse delay-100"></div>
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse delay-200"></div>
              </div>
              <span className="text-sm text-orange-600 font-medium">Disabled for now</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={onClose}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8"
          >
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
