'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import {
  LayoutDashboard,
  FolderOpen,
  Clock,
  Star,
  Trash2,
  HardDrive,
  Activity,
  Settings,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Upload,
  FolderPlus,
  Search,
  MoreHorizontal,
  Download,
  Eye,
  File,
  LogIn,
  LogOut,
  User,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'My Files', icon: FolderOpen, path: '/files' },
  { label: 'Recent', icon: Clock, path: '/recent' },
  { label: 'Favorites', icon: Star, path: '/favorites' },
  { label: 'Trash', icon: Trash2, path: '/trash' },
]

const CATEGORIES = [
  { label: 'Documents', icon: FileText, category: 'documents' },
  { label: 'Images', icon: ImageIcon, category: 'images' },
  { label: 'Videos', icon: Video, category: 'videos' },
  { label: 'Audio', icon: Music, category: 'audio' },
  { label: 'Archives', icon: Archive, category: 'archives' },
]

const SYSTEM = [
  { label: 'Storage', icon: HardDrive, path: '/settings/storage' },
  { label: 'Activity', icon: Activity, path: '/settings/activity' },
  { label: 'Settings', icon: Settings, path: '/settings/connection' },
]

function formatBytes(bytes: number = 0) {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function TabSwitcher({ tabs, activeTab, onChange }: { tabs: string[], activeTab: string, onChange: (tab: string) => void }) {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
      {tabs.map(tab => (
        <button 
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()

  // Mobile section state — synced with parent if needed
  const [activeMobileSection, setActiveMobileSection] = useState('Dashboard')

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.refresh()
    window.location.reload()
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col border-r border-slate-200 bg-white p-5 h-full">
        <div className="mb-8">
          <Link href="/" className="text-2xl font-black tracking-tight text-indigo-600">Storva</Link>
          <div className="text-[11px] font-medium tracking-wide text-slate-400 uppercase mt-1">Your Personal Storage</div>
        </div>
        
        <nav className="flex-1 space-y-1">
          <div className="mb-2 text-[10px] font-semibold tracking-widest text-slate-300 uppercase">Home</div>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.path}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                pathname === item.path ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
          <div className="mb-2 mt-6 text-[10px] font-semibold tracking-widest text-slate-300 uppercase">Categories</div>
          {CATEGORIES.map((item) => (
            <Link
              key={item.label}
              href={`/files?category=${item.category}`}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 transition"
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-white border-t border-slate-200 p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              setActiveMobileSection(item.label)
              router.push(item.path)
            }}
            className={`flex flex-col items-center gap-1 ${
              pathname === item.path ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <item.icon size={22} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  )
}

export function HeroCard({ status = 'online' as string }) {
  const online = status === 'online'
  const dotColor = online ? 'bg-emerald-400' : 'bg-rose-400'
  const label = online ? 'Local' : 'Offline'
  return (
    <header className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 p-6 text-white shadow-[0_20px_50px_rgba(79,70,229,0.28)] md:p-8">
      <div className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-12 right-16 h-32 w-32 rounded-full bg-white/5" />
      <div className="relative grid gap-6 md:grid-cols-[1.4fr_0.8fr]">
        <div>
          <p className="text-sm text-white/70">Welcome to Storva 👋</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            Your Personal NAS Storage
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
            Local-first storage with live drive synchronization and remote access.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/files"
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm transition hover:shadow-md hover:bg-white/95"
            >
              <Upload size={16} /> Upload & Browse
            </Link>
            <Link
              href="/files"
              className="flex items-center gap-2 rounded-xl border border-white/30 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
            >
              <FolderPlus size={16} /> Manage Folders
            </Link>
          </div>
        </div>
        <div className="rounded-[1.25rem] bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur-sm">
          <div className="text-xs font-medium text-white/60 uppercase tracking-wider">Connection</div>
          <div className="mt-3 flex items-center gap-2 text-xl font-bold">
            <span className={`h-3 w-3 rounded-full ${dotColor} shadow-sm`} />
            {label}
          </div>
          <div className="mt-4 space-y-2 text-sm text-white/70">
            <div className="flex justify-between"><span>Agent</span><span className={online ? 'text-emerald-300' : 'text-rose-300'}>{online ? '● Online' : '○ Offline'}</span></div>
            <div className="flex justify-between"><span>Storage</span><span className={online ? 'text-emerald-300' : 'text-rose-300'}>{online ? '● Synchronized' : '○ Unavailable'}</span></div>
          </div>
        </div>
      </div>
    </header>
  )
}

export function StorageCards() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    fetch('/api/storage/status')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
  }, [])

  const byCat = stats?.byCategory || {}
  // Total used by files on disk — each card shows category/fileTotal
  const fileTotal = Object.values(byCat as Record<string, number>).reduce((a, b) => a + (b || 0), 0) || 1

  const cards = [
    {
      label: 'Documents',
      icon: FileText,
      value: formatBytes(byCat.documents || 0),
      total: formatBytes(fileTotal),
      pct: Math.min(100, Math.round(((byCat.documents || 0) / fileTotal) * 100)),
      color: 'from-blue-500 to-indigo-500',
      category: 'documents',
    },
    {
      label: 'Images',
      icon: ImageIcon,
      value: formatBytes(byCat.images || 0),
      total: formatBytes(fileTotal),
      pct: Math.min(100, Math.round(((byCat.images || 0) / fileTotal) * 100)),
      color: 'from-rose-500 to-pink-500',
      category: 'images',
    },
    {
      label: 'Videos',
      icon: Video,
      value: formatBytes(byCat.videos || 0),
      total: formatBytes(fileTotal),
      pct: Math.min(100, Math.round(((byCat.videos || 0) / fileTotal) * 100)),
      color: 'from-amber-500 to-orange-500',
      category: 'videos',
    },
    {
      label: 'Others',
      icon: Archive,
      value: formatBytes((byCat.others || 0) + (byCat.audio || 0) + (byCat.archives || 0)),
      total: formatBytes(fileTotal),
      pct: Math.min(
        100,
        Math.round((((byCat.others || 0) + (byCat.audio || 0) + (byCat.archives || 0)) / fileTotal) * 100)
      ),
      color: 'from-emerald-500 to-teal-500',
      category: 'archives',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Link
          key={c.label}
          href={`/files?category=${c.category}`}
          className="group rounded-[1.25rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70 transition-all duration-200 hover:shadow-md hover:ring-indigo-200 block"
        >
          <div className={`inline-flex rounded-xl bg-gradient-to-br ${c.color} p-2.5 text-white shadow-sm`}>
            <c.icon size={20} />
          </div>
          <div className="mt-3 text-sm font-medium text-slate-400">{c.label}</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold text-slate-800">{c.value}</span>
            <span className="text-xs text-slate-400">/ {c.total}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${c.color} transition-all duration-500`}
              style={{ width: `${Math.max(c.pct, 4)}%` }}
            />
          </div>
          <div className="mt-1.5 text-right text-[11px] text-slate-400">{c.pct}%</div>
        </Link>
      ))}
    </div>
  )
}

export function RecentFilesTable() {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/agent/files')
      .then((r) => r.json())
      .then((d) => {
        const onlyFiles = (d.items || []).filter((i: any) => !i.isFolder)
        setFiles(onlyFiles.slice(0, 5))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">Recent Files on Drive</h2>
        <Link href="/files" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          View All
        </Link>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-xs text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Size</th>
              <th className="px-4 py-3 font-medium">Last Modified</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                  Loading files from drive...
                </td>
              </tr>
            ) : files.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                  No files found on drive. <Link href="/files" className="text-indigo-600 underline">Upload one</Link>
                </td>
              </tr>
            ) : (
              files.map((f) => (
                <tr key={f.name} className="border-t border-slate-100 transition hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-600 uppercase">
                      {f.extension || 'FILE'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">
                    <Link href={`/files`} className="hover:text-indigo-600">
                      {f.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatBytes(f.size)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(f.modifiedAt)}</td>
                  <td className="px-4 py-3">
                    <a
                      href={`/api/agent/download?path=${encodeURIComponent(f.relativePath || f.name)}`}
                      download={f.name}
                      title="Download"
                      className="text-slate-400 hover:text-indigo-600"
                    >
                      <Download size={16} />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function FoldersCard() {
  const [folders, setFolders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/agent/files')
      .then((r) => r.json())
      .then((d) => {
        const onlyFolders = (d.items || []).filter((i: any) => i.isFolder)
        setFolders(onlyFolders.slice(0, 4))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">Folders on Drive</h2>
        <Link href="/files" className="text-slate-400 hover:text-slate-600">
          <MoreHorizontal size={16} />
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="py-6 text-center text-xs text-slate-400">Loading folders from drive...</div>
        ) : folders.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No folders created yet.{' '}
            <Link href="/files" className="text-indigo-600 underline">
              Create a folder
            </Link>
          </div>
        ) : (
          folders.map((f) => (
            <Link
              key={f.name}
              href={`/files?path=${encodeURIComponent(f.relativePath || f.name)}`}
              className="flex items-center gap-4 rounded-xl bg-slate-50/80 p-4 transition hover:bg-slate-100 block"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <FolderOpen size={20} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-700">{f.name}</div>
                <div className="text-xs text-slate-400">Last modified: {formatDate(f.modifiedAt)}</div>
              </div>
            </Link>
          ))
        )}
      </div>
      <Link
        href="/files"
        className="mt-4 block text-center w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
      >
        View All Folders
      </Link>
    </div>
  )
}

export function RightPanel() {
  const [stats, setStats] = useState<any>(null)
  const [activities, setActivities] = useState<any[]>([])
  const { user, loading } = useAuth()

  useEffect(() => {
    fetch('/api/storage/status')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setStats(d))
      .catch(() => {})

    fetch('/api/activity?page=1&limit=3')
      .then((r) => r.json())
      .then((d) => setActivities(d.items || []))
      .catch(() => {})
  }, [])

  const usedBytes = stats?.usedBytes || 0
  const totalBytes = stats?.totalBytes || 1
  const percentUsed = Math.round(stats?.percentUsed || 0)

  return (
    <aside className="hidden rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 md:flex md:flex-col">
      {/* Auth Widget moved here */}
      <div className="mb-4">
        {loading ? (
          <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
        ) : user ? (
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 px-3.5 py-2.5 ring-1 ring-indigo-100/70">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm">
                {(user.username ?? 'A')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-slate-800">{user.username ?? 'Admin'}</div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Signed in
                </div>
              </div>
            </div>
            <button
              onClick={() => { fetch('/api/auth/logout', { method: 'POST' }); window.location.reload(); }}
              title="Sign Out"
              className="ml-2 flex items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition-all duration-200 hover:from-indigo-500 hover:to-violet-500 hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.99]"
          >
            <LogIn size={15} className="transition-transform group-hover:-translate-x-0.5" />
            Sign In
          </Link>
        )}
      </div>

      <Link
        href="/files"
        className="flex items-center gap-2 rounded-xl bg-slate-100/80 px-4 py-3 text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 transition"
      >
        <Search size={16} />
        Search Drive & Files
      </Link>

      {user && (
        <>
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-800">Storage Drive</h3>
            <div
              className="mt-4 mx-auto flex h-44 w-44 items-center justify-center rounded-full p-5"
              style={{
                background: `conic-gradient(#4f46e5 0% ${percentUsed}%, #e2e8f0 ${percentUsed}% 100%)`,
              }}
            >
              <div className="flex h-full w-full items-center justify-center rounded-full bg-white shadow-inner">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{formatBytes(usedBytes)}</div>
                  <div className="text-[11px] text-slate-400">Used of {formatBytes(totalBytes)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Activities</h3>
              <Link href="/settings/activity" className="text-xs font-medium text-indigo-600">
                View All
              </Link>
            </div>
            <div className="mt-3 space-y-3">
              {activities.length === 0 ? (
                <div className="rounded-xl bg-slate-50/80 p-3 text-xs text-slate-400">No recent activities</div>
              ) : (
                activities.map((act, i) => (
                  <div key={i} className="rounded-xl bg-slate-50/80 p-3">
                    <div className="text-[10px] font-medium text-indigo-500">{formatDate(act.createdAt)}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      <span className="font-semibold">{act.action}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <div className="mt-auto rounded-[1.25rem] bg-gradient-to-br from-violet-50 to-indigo-50 p-5 text-center ring-1 ring-indigo-100/50">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-400/30">
          <HardDrive size={28} />
        </div>
        <div className="mt-3 text-sm font-semibold text-slate-700">
          Storva Drive Status: <span className="text-emerald-600 font-bold">Online</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">{percentUsed}% disk used</p>
      </div>
    </aside>
  )
}
