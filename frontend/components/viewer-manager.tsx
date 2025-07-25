"use client"

import { useState } from "react"

const INITIAL_VIEWERS = [
  { id: "viewer1", username: "viewer1", name: "Viewer One", active: true },
  { id: "viewer2", username: "viewer2", name: "Viewer Two", active: true },
  { id: "viewer3", username: "viewer3", name: "Viewer Three", active: true },
]

export default function ViewerManager() {
  const [viewers, setViewers] = useState(INITIAL_VIEWERS)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newViewer, setNewViewer] = useState({ username: "", name: "", password: "" })

  const toggleViewerStatus = (id: string) => {
    setViewers(viewers.map((viewer) => (viewer.id === id ? { ...viewer, active: !viewer.active } : viewer)))
  }

  const deleteViewer = (id: string) => {
    if (confirm("Are you sure you want to delete this viewer account?")) {
      setViewers(viewers.filter((viewer) => viewer.id !== id))
    }
  }

  const addViewer = () => {
    if (!newViewer.username || !newViewer.name || !newViewer.password) {
      alert("Please fill in all fields")
      return
    }

    const viewer = {
      id: `viewer_${Date.now()}`,
      ...newViewer,
      active: true,
    }

    setViewers([...viewers, viewer])
    setNewViewer({ username: "", name: "", password: "" })
    setShowAddForm(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Current Viewer Accounts</h3>
          <p className="text-gray-500">Manage viewer access and permissions</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          ➕ Add Viewer
        </button>
      </div>

      {/* Add Viewer Form */}
      {showAddForm && (
        <div className="bg-white border rounded-lg p-6 shadow">
          <h4 className="font-semibold mb-4">Add New Viewer Account</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Username"
              value={newViewer.username}
              onChange={(e) => setNewViewer({ ...newViewer, username: e.target.value })}
              className="px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Full Name"
              value={newViewer.name}
              onChange={(e) => setNewViewer({ ...newViewer, name: e.target.value })}
              className="px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={newViewer.password}
              onChange={(e) => setNewViewer({ ...newViewer, password: e.target.value })}
              className="px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={addViewer} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Add Viewer
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Viewers List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {viewers.map((viewer) => (
              <tr key={viewer.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{viewer.name}</div>
                    <div className="text-sm text-gray-500">@{viewer.username}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      viewer.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {viewer.active ? "✅ Active" : "❌ Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => toggleViewerStatus(viewer.id)}
                    className={`${
                      viewer.active ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"
                    }`}
                  >
                    {viewer.active ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => deleteViewer(viewer.id)} className="text-red-600 hover:text-red-900">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">💡 Viewer Permissions</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Can view all generated analyses and charts</li>
          <li>• Cannot upload CSV files or generate new analyses</li>
          <li>• Cannot manage other user accounts</li>
          <li>• Read-only access to dashboard insights</li>
        </ul>
      </div>
    </div>
  )
}
