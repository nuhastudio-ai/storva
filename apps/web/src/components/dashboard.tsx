'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  Image,
  Video,
  Music,
  Archive,
  Upload,
  FolderPlus,
  Search,
  MoreHorizontal,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/', active: true },
  { label: 'My Files', icon: FolderOpen, path: '/files' },
  { label: 'Recent', icon: Clock, path: '/recent' },
  { label: 'Favorites', icon: Star, path: '/favorites' },
  { label: 'Trash', icon: Trash2, path: '/trash' },
];

const CATEGORIES = [
  { label: 'Documents', icon: FileText },
  { label: 'Images', icon: Image },
  { label: 'Videos', icon: Video },
  { label: 'Audio', icon: Music },
  { label: 'Archives', icon: Archive },
]

const SYSTEM = [
  { label: 'Storage', icon: HardDrive, path: '/settings/storage' },
  { label: 'Activity', icon: Activity, path: '/settings/activity' },
  { label: 'Settings', icon: Settings, path: '/settings/connection' },
];

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="flex flex-col rounded-[1.5rem] bg-white/90 p-5 shadow-sm ring-1 ring-slate-200/70">
      <div>
        <div className="text-2xl font-black tracking-tight text-indigo-600">Storva</div>
        <div className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">Your Personal Storage</div>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1 text-[13px] font-medium">
        <div className="mb-2 text-[10px] font-semibold tracking-widest text-slate-300 uppercase">Home</div>
        {NAV_ITEMS.map((item) => {
          const isActive = item.path === '/' ? pathname === '/' : pathname?.startsWith(item.path)
          return (
            <Link
              key={item.label}
              href={item.path}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              {item.label}
            </Link>
          )
        })}

        <div className="mb-2 mt-6 text-[10px] font-semibold tracking-widest text-slate-300 uppercase">Categories</div>
        {CATEGORIES.map((item) => (
          <button
            key={item.label}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700"
          >
            <item.icon size={18} strokeWidth={1.8} />
            {item.label}
          </button>
        ))}

        <div className="mb-2 mt-6 text-[10px] font-semibold tracking-widest text-slate-300 uppercase">System</div>
        {SYSTEM.map((item) => (
          <button
            key={item.label}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700"
          >
            <item.icon size={18} strokeWidth={1.8} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-3 rounded-[1.25rem] bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">U</div>
        <div>
          <div className="text-sm font-semibold text-slate-700">Ulin</div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Online
          </div>
        </div>
      </div>
    </aside>
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
          <p className="text-sm text-white/70">Hi, Ulin 👋</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            Welcome back to Storva.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
            Your personal storage, local-first and remote-ready.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm transition hover:shadow-md">
              <Upload size={16} /> Upload
            </button>
            <button className="flex items-center gap-2 rounded-xl border border-white/30 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10">
              <FolderPlus size={16} /> New Folder
            </button>
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
            <div className="flex justify-between"><span>Storage</span><span className={online ? 'text-emerald-300' : 'text-rose-300'}>{online ? '● Healthy' : '○ Unavailable'}</span></div>
          </div>
        </div>
      </div>
    </header>
  )
}

const CATEGORY_CARDS = [
  { label: 'Documents', icon: FileText, value: '2.25 GB', total: '15 GB', pct: 15, color: 'from-blue-500 to-indigo-500' },
  { label: 'Images', icon: Image, value: '4.5 GB', total: '15 GB', pct: 30, color: 'from-rose-500 to-pink-500' },
  { label: 'Videos', icon: Video, value: '6 GB', total: '15 GB', pct: 40, color: 'from-amber-500 to-orange-500' },
  { label: 'Others', icon: Archive, value: '2.25 GB', total: '15 GB', pct: 15, color: 'from-emerald-500 to-teal-500' },
]

export function StorageCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CATEGORY_CARDS.map((c) => (
        <div key={c.label} className="group rounded-[1.25rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70 transition-all duration-200 hover:shadow-md hover:ring-indigo-200">
          <div className={`inline-flex rounded-xl bg-gradient-to-br ${c.color} p-2.5 text-white shadow-sm`}>
            <c.icon size={20} />
          </div>
          <div className="mt-3 text-sm font-medium text-slate-400">{c.label}</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold text-slate-800">{c.value}</span>
            <span className="text-xs text-slate-400">/ {c.total}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full bg-gradient-to-r ${c.color} transition-all duration-500`} style={{ width: `${c.pct}%` }} />
          </div>
          <div className="mt-1.5 text-right text-[11px] text-slate-400">{c.pct}%</div>
        </div>
      ))}
    </div>
  )
}

const FILES = [
  { name: '654711-4-1-L...', size: '120 MB', date: '21 April, 2021', type: 'PSD', color: 'bg-blue-500' },
  { name: 'Jadwal Meeti...', size: '10 MB', date: '16 April, 2021', type: 'PDF', color: 'bg-rose-500' },
  { name: 'Project Temp...', size: '14 MB', date: '10 April, 2021', type: 'PDF', color: 'bg-rose-500' },
  { name: 'Bandicam Se...', size: '1.2 GB', date: '7 April, 2021', type: 'MP4', color: 'bg-violet-500' },
  { name: 'General Repo...', size: '3.2 MB', date: '27 May, 2021', type: 'DOC', color: 'bg-indigo-500' },
]

export function RecentFilesTable() {
  return (
    <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">Recent Files</h2>
        <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View All</button>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-xs text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Name ↕</th>
              <th className="px-4 py-3 font-medium">Size ↕</th>
              <th className="px-4 py-3 font-medium">Last Modified ↕</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {FILES.map((f) => (
              <tr key={f.name} className="border-t border-slate-100 transition hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-lg ${f.color} px-2 py-1 text-[10px] font-bold text-white uppercase`}>{f.type}</span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-700">{f.name}</td>
                <td className="px-4 py-3 text-slate-500">{f.size}</td>
                <td className="px-4 py-3 text-slate-500">{f.date}</td>
                <td className="px-4 py-3">
                  <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const FOLDERS = [
  { name: 'Data Backup', date: '3/14/19', avatars: 2 },
  { name: 'Dribbble Assets', date: '4/14/19', avatars: 3 },
]

export function FoldersCard() {
  return (
    <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">Folders</h2>
        <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={16} /></button>
      </div>
      <div className="mt-4 space-y-3">
        {FOLDERS.map((f) => (
          <div key={f.name} className="flex items-center gap-4 rounded-xl bg-slate-50/80 p-4 transition hover:bg-slate-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600"><FolderOpen size={20} /></div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-700">{f.name}</div>
              <div className="text-xs text-slate-400">Last Changes : {f.date}</div>
            </div>
            <div className="flex -space-x-2">
              {Array.from({ length: f.avatars }).map((_, i) => (
                <div key={i} className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-300 to-violet-300 ring-2 ring-white" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="mt-4 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">View All</button>
    </div>
  )
}

export function RightPanel() {
  return (
    <aside className="hidden rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 md:flex md:flex-col">
      <div className="flex items-center gap-2 rounded-xl bg-slate-100/80 px-4 py-3 text-sm text-slate-400">
        <Search size={16} />
        Search Dashboard
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-800">Storage</h3>
        <div className="mt-4 mx-auto flex h-44 w-44 items-center justify-center rounded-full bg-[conic-gradient(#4f46e5_0%_45%,#22c55e_45%_70%,#f43f5e_70%_85%,#f59e0b_85%_100%)] p-5">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white shadow-inner">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">11 GB</div>
              <div className="text-[11px] text-slate-400">Used of 15 GB</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Last Activities</h3>
          <button className="text-xs font-medium text-indigo-600">View All</button>
        </div>
        <div className="mt-3 space-y-3">
          <div className="rounded-xl bg-slate-50/80 p-3">
            <div className="text-[10px] font-medium text-indigo-500">Yesterday</div>
            <div className="mt-1 text-sm text-slate-600">John Doe has uploaded <span className="font-medium">Design.pdf</span></div>
          </div>
          <div className="rounded-xl bg-slate-50/80 p-3">
            <div className="text-[10px] font-medium text-slate-400">1 week ago</div>
            <div className="mt-1 text-sm text-slate-600">Sarah Doe has deleted <span className="font-medium">JKR21.mp4</span></div>
          </div>
        </div>
      </div>

      <div className="mt-auto rounded-[1.25rem] bg-gradient-to-br from-violet-50 to-indigo-50 p-5 text-center ring-1 ring-indigo-100/50">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-400/30">
          <HardDrive size={32} />
        </div>
        <div className="mt-4 text-sm font-semibold text-slate-700">
          Upgrade to <span className="text-indigo-600">Pro</span> for unlimited storage
        </div>
        <button className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md">
          Go Premium
        </button>
      </div>
    </aside>
  )
}
