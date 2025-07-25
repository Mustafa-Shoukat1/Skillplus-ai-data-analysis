"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Users } from "lucide-react"

interface User {
  id: string
  username: string
  name: string
  role: "admin" | "viewer"
  createdDate: string
  password: string
}

interface UserManagementProps {
  currentUser: any
  users: User[]
  onAddUser: (user: Omit<User, "id" | "createdDate">) => void
  onDeleteUser: (userId: string) => void
}

export default function UserManagement({ currentUser, users, onAddUser, onDeleteUser }: UserManagementProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUser, setNewUser] = useState({
    username: "",
    name: "",
    role: "viewer" as "admin" | "viewer",
    password: "",
  })

  const handleAddUser = () => {
    if (!newUser.username || !newUser.name || !newUser.password) {
      alert("Please fill in all fields")
      return
    }

    if (users.some((user) => user.username === newUser.username)) {
      alert("This username is already taken")
      return
    }

    onAddUser(newUser)
    setNewUser({ username: "", name: "", role: "viewer", password: "" })
    setShowAddForm(false)
    alert(`${newUser.name} has been added successfully`)
  }

  const handleDeleteUser = (userId: string, username: string) => {
    if (username === currentUser.username) {
      alert("You cannot delete your own account")
      return
    }

    if (confirm(`Are you sure you want to delete user "${username}"?`)) {
      onDeleteUser(userId)
      alert(`User "${username}" has been deleted`)
    }
  }

  const getRoleColor = (role: string) => {
    return role === "admin" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
  }

  return (
    <div className="space-y-6">
      <Card className="glass border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <Button onClick={() => setShowAddForm(true)} className="bg-blue-500 hover:bg-blue-600 btn-3d">
              <Plus className="mr-2 h-4 w-4" />
              Add New User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add User Form */}
          {showAddForm && (
            <div className="mb-6 p-4 border border-white/20 rounded-lg glass">
              <h4 className="font-semibold text-white mb-4">Add New User</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                  <Input
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="Enter username"
                    className="glass border-white/20 text-white placeholder-gray-400 bg-white/5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                  <Input
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Enter full name"
                    className="glass border-white/20 text-white placeholder-gray-400 bg-white/5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value: "admin" | "viewer") => setNewUser({ ...newUser, role: value })}
                  >
                    <SelectTrigger className="glass border-white/20 text-white bg-white/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass border-white/20 bg-gray-800">
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Enter password"
                    className="glass border-white/20 text-white placeholder-gray-400 bg-white/5"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleAddUser} className="bg-green-600 hover:bg-green-700 btn-3d">
                  Add User
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  className="glass border-white/20 text-white"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Users List */}
          <div>
            <h4 className="font-semibold mb-4 text-gray-300">SYSTEM USERS ({users.length})</h4>
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border border-white/20 rounded-lg glass hover:bg-white/5"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-white">
                        {user.username}
                        {user.username === currentUser.username && (
                          <span className="ml-2 text-xs text-blue-400 font-medium">You</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                        <span className="text-xs text-gray-400">Created {user.createdDate}</span>
                      </div>
                    </div>
                  </div>
                  {user.role !== "admin" && user.username !== currentUser.username && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id, user.username)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
