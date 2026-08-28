'use client'

import { Sidebar, RightPanel } from '@/components/dashboard'
import { PlaceholderPage } from '@/components/placeholder-page'
import { Activity as ActivityIcon } from 'lucide-react'

export default function ActivitySettingsPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eef2ff,_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-3 text-slate-700 md:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1440px] gap-6 rounded-[2rem] border border-white/70 bg-white/70 p-3 shadow-[0_20px_80px_rgba(99,102,241,0.12)] backdrop-blur-xl md:grid-cols-[240px_1fr_320px] md:p-5">
        <Sidebar />
        <section className="space-y-6">
          <header className="flex items-center justify-between rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">Activity Log</h1>
              <p className="mt-1 text-sm text-slate-500">View all file operations and system events.</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <ActivityIcon size={24} />
            </div>
          </header>
          <div className="rounded-[1.5rem] bg-white p-10 text-center shadow-sm ring-1 ring-slate-200/70">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <ActivityIcon size={28} />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-800">Coming soon</h2>
            <p className="mt-1 text-sm text-slate-500">Activity log is under construction.</p>
          </div>
        </section>
        <RightPanel />
      </div>
    </main>
  )
}
