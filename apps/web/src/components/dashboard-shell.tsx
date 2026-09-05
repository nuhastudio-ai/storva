'use client'

import Link from 'next/link'
import { Sidebar, HeroCard, StorageCards, RecentFilesTable, FoldersCard, RightPanel } from './dashboard'
import { DevicePicker } from './device-picker'
import { useDashboardData } from '@/lib/dashboard-data'
import { useConnectionStatus } from '@/lib/useConnectionStatus'

function formatBytes(bytes = 0) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`
}

export function DashboardShell() {
  const { storage } = useDashboardData()
  const connection = useConnectionStatus()
  const percentUsed = Math.round(storage?.percentUsed ?? 0)

  return (
    <main className="min-h-dvh bg-[#f3f6fa] text-slate-700">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1800px] gap-0 overflow-hidden md:p-5">
        <Sidebar />
        <section className="min-w-0 flex-1 overflow-y-auto px-4 pb-28 pt-4 md:px-7 md:pb-8 md:pt-0">
          {connection.updateAvailable && (
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
              <span>Agent v{connection.version} is behind latest v{connection.latestVersion}.</span>
              <Link className="font-semibold underline" href="/settings/connection">Update</Link>
            </div>
          )}
          <div className="mb-5 flex items-center justify-between rounded-2xl bg-white px-5 py-3 shadow-sm ring-1 ring-slate-100">
            <label className="flex flex-1 items-center gap-3 text-sm text-slate-400">
              <span aria-hidden="true">⌕</span>
              <input aria-label="Search files" type="search" placeholder="Search something..." className="w-full bg-transparent outline-none" />
            </label>
            <div className="ml-4 hidden h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 text-xs font-bold text-white sm:flex">S</div>
          </div>
          <HeroCard status={connection.status} />
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-800">Storage</h2><p className="text-xs text-slate-400">{formatBytes(storage?.usedBytes)} of {formatBytes(storage?.totalBytes)}</p></div><span className="text-sm font-bold text-indigo-600">{percentUsed}%</span></div>
              <div className="mt-4 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: `${Math.min(percentUsed, 100)}%` }} /></div>
            </div>
            <DevicePicker />
          </div>
          <h2 className="mb-3 mt-7 text-lg font-bold text-slate-800">Quick Access</h2>
          <StorageCards />
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <RecentFilesTable />
            <FoldersCard />
          </div>
        </section>
        <RightPanel />
      </div>
    </main>
  )
}

