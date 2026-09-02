'use client'

import React, { useState, useEffect } from 'react'
import { Sidebar, RightPanel } from '@/components/dashboard'
import { HardDrive, Folder, RefreshCw, AlertTriangle, CheckCircle2, Info, AlertCircle } from 'lucide-react'

function formatBytes(bytes: number = 0) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`
}

export default function StorageSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [storageRoot, setStorageRoot] = useState<string>('')
  const [diskStats, setDiskStats] = useState<{ totalBytes?: number; freeBytes?: number; usedBytes?: number } | null>(null)
  const [agentStatus, setAgentStatus] = useState<'online' | 'offline'>('offline')

  const fetchStorageInfo = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/connection/health')
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'online' && data.agent) {
          setAgentStatus('online')
          setStorageRoot(data.agent.storageRoot || '')
          setDiskStats(data.agent.disk || null)
        } else {
          setAgentStatus('offline')
        }
      } else {
        setAgentStatus('offline')
      }
    } catch {
      setAgentStatus('offline')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStorageInfo()
  }, [])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eef2ff,_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-3 text-slate-700 md:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1440px] gap-6 rounded-[2rem] border border-white/70 bg-white/70 p-3 shadow-[0_20px_80px_rgba(99,102,241,0.12)] backdrop-blur-xl md:grid-cols-[240px_1fr_320px] md:p-5">
        <Sidebar />
        <section className="space-y-6">
          <header className="flex items-center justify-between rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">Storage Configuration</h1>
              <p className="mt-1 text-sm text-slate-500">View active storage directory and disk information.</p>
            </div>
            <button
              onClick={fetchStorageInfo}
              title="Refresh Storage Info"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-indigo-600 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
            </button>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Active Storage Location */}
            <div className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      agentStatus === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {agentStatus === 'online' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Active Storage Location</h3>
                    <div className="text-xs text-slate-500">
                      {agentStatus === 'online' ? 'Connected to Agent' : 'Agent Offline'}
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-xl bg-slate-50 p-4">
                  <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Storage Path</div>
                  <div className="mt-1 font-mono text-sm font-semibold text-slate-800 break-all">
                    {loading ? 'Reading storage path...' : storageRoot || 'No storage path detected'}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600">
                <CheckCircle2 size={14} />
                <span>
                  {agentStatus === 'online'
                    ? 'Agent is actively watching and synchronizing this directory'
                    : 'Please start Agent to synchronize storage'}
                </span>
              </div>
            </div>

            {/* Disk Space Statistics */}
            <div className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <HardDrive size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Drive Space</h3>
                  <div className="text-xs text-slate-500">Live disk utilization</div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Capacity:</span>
                  <span className="font-semibold text-slate-800">{formatBytes(diskStats?.totalBytes)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Used Space:</span>
                  <span className="font-semibold text-indigo-600">{formatBytes(diskStats?.usedBytes)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Available Free:</span>
                  <span className="font-semibold text-emerald-600">{formatBytes(diskStats?.freeBytes)}</span>
                </div>

                {diskStats?.totalBytes && (
                  <div className="mt-4">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                        style={{
                          width: `${Math.round(((diskStats.usedBytes || 0) / diskStats.totalBytes) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="mt-1.5 text-right text-xs text-slate-400">
                      {Math.round(((diskStats.usedBytes || 0) / diskStats.totalBytes) * 100)}% used
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <Info size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">How to change Path Storage</h3>
                <div className="mt-2 text-sm text-slate-600 leading-relaxed space-y-2">
                  <p>
                    Path storage dikonfigurasi melalui environment variable <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-indigo-600">STORVA_STORAGE_PATH</code> pada file <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">.env</code>.
                  </p>
                  <p>
                    Setelah mengubah nilai <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">STORVA_STORAGE_PATH</code>, restart Agent agar folder baru langsung aktif dan terbaca di sini.
                  </p>
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
