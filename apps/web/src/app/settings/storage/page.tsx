'use client'

import { useState } from 'react'
import { Sidebar, RightPanel } from '@/components/dashboard'
import { PlaceholderPage } from '@/components/placeholder-page'
import { HardDrive, Folder, RefreshCw, AlertTriangle, CheckCircle2, Info } from 'lucide-react'

// Note: In a real app, we would fetch this from the agent's /health endpoint
// For now, we'll simulate the state
export default function StorageSettingsPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [newPath, setNewPath] = useState('/tmp/storva-new')
  const [currentPath] = useState('/tmp/Storva') // Mocking current path

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSaving(false)
    alert('Configuration updated. Please restart the Storva Agent for changes to take effect.')
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eef2ff,_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-3 text-slate-700 md:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1440px] gap-6 rounded-[2rem] border border-white/70 bg-white/70 p-3 shadow-[0_20px_80px_rgba(99,102,241,0.12)] backdrop-blur-xl md:grid-cols-[240px_1fr_320px] md:p-5">
        <Sidebar />
        <section className="space-y-6">
          <header className="flex items-center justify-between rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">Storage Configuration</h1>
              <p className="mt-1 text-sm text-slate-500">Manage the root directory for all Storva data.</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <HardDrive size={24} />
            </div>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Current Location</h3>
                  <div className="text-xs text-slate-500">Active storage path</div>
                </div>
              </div>
              <div className="mt-6 rounded-xl bg-slate-50 p-4">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Path</div>
                <div className="mt-1 font-mono text-sm text-slate-700 break-all">{currentPath}</div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600">
                <CheckCircle2 size={14} />
                <span>Agent is actively watching this directory</span>
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Folder size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Update Path</h3>
                  <div className="text-xs text-slate-500">Change the root storage directory</div>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase">New Path</label>
                  <input 
                    type="text" 
                    value={newPath}
                    onChange={(e) => setNewPath(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    placeholder="/path/to/storage"
                  />
                </div>
                <button 
                  onClick={handleSave}
                  disabled={isSaving || newPath === currentPath}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  {isSaving ? 'Updating...' : 'Update Storage'}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50/50 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-amber-900">Important Note</h3>
                <div className="mt-2 text-sm text-amber-800/80 leading-relaxed">
                  Changing the storage path will not automatically move your existing files to the new location. 
                  The agent will start using the new path from a clean state. 
                  It is recommended to manually move your data if you wish to preserve it.
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-amber-700">
                  <Info size={14} />
                  Agent restart will be required to apply changes.
                </div>
              </div>
            </div>
          </div>
        </section>
        <RightPanel />
      </div>
    </main>
  )
}
