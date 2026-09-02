'use client'

import React, { useState, useEffect, useCallback, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Sidebar, RightPanel } from '@/components/dashboard'
import {
  FolderOpen,
  Folder,
  FolderPlus,
  Upload,
  Search,
  Grid,
  List as ListIcon,
  ChevronRight,
  Download,
  Trash2,
  Edit2,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  File,
  X,
  Eye,
  RefreshCw,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  ArrowUpDown,
  Home,
} from 'lucide-react'

type FileItem = {
  name: string
  relativePath: string
  isFolder: boolean
  size: number
  mimeType: string
  category: string
  extension: string
  modifiedAt: string
  createdAt: string
}

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
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getItemIcon(item: FileItem) {
  if (item.isFolder) return <Folder className="text-amber-500 fill-amber-100" size={24} />
  switch (item.category) {
    case 'images':
      return <ImageIcon className="text-rose-500" size={24} />
    case 'videos':
      return <Video className="text-amber-500" size={24} />
    case 'audio':
      return <Music className="text-violet-500" size={24} />
    case 'archives':
      return <Archive className="text-emerald-500" size={24} />
    case 'documents':
      return <FileText className="text-blue-500" size={24} />
    default:
      return <File className="text-slate-400" size={24} />
  }
}

function FilesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentPath = searchParams.get('path') || ''
  const categoryFilter = searchParams.get('category') || ''

  const [items, setItems] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Modals & Actions
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renamingItem, setRenamingItem] = useState<FileItem | null>(null)
  const [newName, setNewName] = useState('')
  const [deletingItem, setDeletingItem] = useState<FileItem | null>(null)
  const [previewItem, setPreviewItem] = useState<FileItem | null>(null)

  // Uploading
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Fetch directory contents from Agent
  const loadFiles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams()
      if (currentPath) query.set('path', currentPath)

      const res = await fetch(`/api/agent/files?${query.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to load files (HTTP ${res.status})`)
      }
      const data = await res.json()
      setItems(data.items || [])
    } catch (err: any) {
      setError(err.message || 'Unable to connect to Storage Drive')
    } finally {
      setLoading(false)
    }
  }, [currentPath])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // Navigate to folder
  const navigateToFolder = (folderRelativePath: string) => {
    const params = new URLSearchParams()
    if (folderRelativePath) {
      params.set('path', folderRelativePath)
    }
    router.push(`/files?${params.toString()}`)
  }

  // Breadcrumbs calculation
  const breadcrumbs = React.useMemo(() => {
    const parts = currentPath.split('/').filter(Boolean)
    const crumbs = [{ name: 'Home', path: '' }]
    let accumulated = ''
    for (const part of parts) {
      accumulated = accumulated ? `${accumulated}/${part}` : part
      crumbs.push({ name: part, path: accumulated })
    }
    return crumbs
  }, [currentPath])

  // Create folder (Write)
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) return

    try {
      const res = await fetch('/api/agent/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dirPath: currentPath,
          folderName: newFolderName.trim(),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create folder')
      }

      showToast(`Folder "${newFolderName}" created`)
      setNewFolderName('')
      setIsNewFolderOpen(false)
      loadFiles()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Rename item (Write)
  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!renamingItem || !newName.trim()) return

    try {
      const res = await fetch('/api/agent/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: renamingItem.relativePath,
          newName: newName.trim(),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to rename item')
      }

      showToast(`Renamed to "${newName.trim()}"`)
      setRenamingItem(null)
      setNewName('')
      loadFiles()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Delete item / move to trash (Write)
  const handleDelete = async () => {
    if (!deletingItem) return

    try {
      const res = await fetch('/api/agent/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: deletingItem.relativePath,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to delete item')
      }

      showToast(`"${deletingItem.name}" moved to Trash`)
      setDeletingItem(null)
      loadFiles()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Upload files (Write)
  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return

    setIsUploading(true)
    setUploadProgress(`Uploading ${fileList.length} file(s)...`)

    try {
      const formData = new FormData()
      Array.from(fileList).forEach((file) => {
        formData.append('files', file)
      })

      const query = new URLSearchParams()
      if (currentPath) query.set('path', currentPath)

      const res = await fetch(`/api/agent/upload?${query.toString()}`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Upload failed')
      }

      showToast(`Successfully uploaded ${fileList.length} file(s)`)
      loadFiles()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  // Filter & Sort
  const filteredItems = items
    .filter((item) => {
      if (categoryFilter && !item.isFolder && item.category !== categoryFilter) {
        return false
      }
      if (searchQuery.trim()) {
        return item.name.toLowerCase().includes(searchQuery.toLowerCase())
      }
      return true
    })
    .sort((a, b) => {
      // Folders always first
      if (a.isFolder && !b.isFolder) return -1
      if (!a.isFolder && b.isFolder) return 1

      let compare = 0
      if (sortBy === 'name') {
        compare = a.name.localeCompare(b.name)
      } else if (sortBy === 'size') {
        compare = a.size - b.size
      } else if (sortBy === 'date') {
        compare = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime()
      }
      return sortOrder === 'asc' ? compare : -compare
    })

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  return (
    <main
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eef2ff,_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-3 text-slate-700 md:p-6"
    >
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 shadow-xl backdrop-blur-md transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-600/90 text-white shadow-emerald-500/20'
              : 'bg-rose-600/90 text-white shadow-rose-500/20'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-indigo-600/20 backdrop-blur-sm">
          <div className="flex flex-col items-center rounded-3xl bg-white p-8 shadow-2xl ring-4 ring-indigo-500/30">
            <Upload size={48} className="animate-bounce text-indigo-600" />
            <p className="mt-4 text-lg font-bold text-slate-800">Drop files here to upload</p>
            <p className="text-xs text-slate-500">
              Files will be saved into {currentPath ? `/${currentPath}` : 'Root'}
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1440px] gap-6 rounded-[2rem] border border-white/70 bg-white/70 p-3 shadow-[0_20px_80px_rgba(99,102,241,0.12)] backdrop-blur-xl md:grid-cols-[240px_1fr_320px] md:p-5">
        <Sidebar />

        <section className="flex flex-col space-y-5 overflow-hidden">
          {/* Top Bar / Header */}
          <header className="flex flex-col gap-4 rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FolderOpen className="text-indigo-600" size={24} />
                <h1 className="text-2xl font-bold tracking-tight text-slate-800">Files & Folders</h1>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Direct read & write access to your Drive storage
              </p>
            </div>

            {/* Actions: New Folder & Upload */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="file-upload-input"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <button
                onClick={() => document.getElementById('file-upload-input')?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <Upload size={16} />
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>

              <button
                onClick={() => setIsNewFolderOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <FolderPlus size={16} className="text-indigo-600" />
                New Folder
              </button>

              <button
                onClick={loadFiles}
                title="Refresh folder"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </header>

          {/* Breadcrumbs & Controls */}
          <div className="flex flex-col gap-3 rounded-[1.25rem] bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/70 md:flex-row md:items-center md:justify-between">
            {/* Breadcrumb Path */}
            <nav className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1
                return (
                  <React.Fragment key={crumb.path}>
                    {idx > 0 && <ChevronRight size={14} className="text-slate-300" />}
                    <button
                      onClick={() => navigateToFolder(crumb.path)}
                      className={`flex items-center gap-1.5 rounded-lg px-2 py-1 transition ${
                        isLast
                          ? 'bg-indigo-50 font-bold text-indigo-700'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                      }`}
                    >
                      {idx === 0 && <Home size={14} />}
                      {crumb.name}
                    </button>
                  </React.Fragment>
                )
              })}
            </nav>

            {/* Search & View Controls */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-56">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Sort Toggle */}
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
              >
                <ArrowUpDown size={14} />
              </button>

              {/* View Mode Toggle */}
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`rounded-lg p-1.5 transition ${
                    viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`rounded-lg p-1.5 transition ${
                    viewMode === 'list' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <ListIcon size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            {loading && items.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
                <RefreshCw size={28} className="animate-spin text-indigo-500" />
                <p className="text-sm font-medium">Reading files from Drive...</p>
              </div>
            ) : error ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-rose-500">
                <AlertCircle size={36} />
                <p className="text-base font-semibold">{error}</p>
                <button
                  onClick={loadFiles}
                  className="rounded-xl bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                >
                  Retry
                </button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
                <FolderOpen size={44} className="text-slate-300" />
                <p className="text-base font-semibold text-slate-600">This folder is empty</p>
                <p className="text-xs text-slate-400">Upload files or create a new folder to get started</p>
                <div className="mt-2 flex gap-3">
                  <button
                    onClick={() => document.getElementById('file-upload-input')?.click()}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    <Upload size={14} /> Upload File
                  </button>
                  <button
                    onClick={() => setIsNewFolderOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <FolderPlus size={14} /> New Folder
                  </button>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID VIEW */
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {filteredItems.map((item) => (
                  <div
                    key={item.relativePath || item.name}
                    onDoubleClick={() => {
                      if (item.isFolder) navigateToFolder(item.relativePath)
                      else setPreviewItem(item)
                    }}
                    className="group relative flex flex-col justify-between rounded-[1.25rem] border border-slate-100 bg-slate-50/50 p-4 transition-all duration-200 hover:border-indigo-200 hover:bg-white hover:shadow-md"
                  >
                    {/* Item Top Bar */}
                    <div className="flex items-center justify-between">
                      <div
                        onClick={() => {
                          if (item.isFolder) navigateToFolder(item.relativePath)
                          else setPreviewItem(item)
                        }}
                        className="cursor-pointer"
                      >
                        {getItemIcon(item)}
                      </div>

                      {/* Item Actions Menu */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        {!item.isFolder && (
                          <a
                            href={`/api/agent/download?path=${encodeURIComponent(item.relativePath)}`}
                            download={item.name}
                            title="Download"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                          >
                            <Download size={14} />
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setRenamingItem(item)
                            setNewName(item.name)
                          }}
                          title="Rename"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeletingItem(item)}
                          title="Move to Trash"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Item Body / Name */}
                    <div
                      onClick={() => {
                        if (item.isFolder) navigateToFolder(item.relativePath)
                        else setPreviewItem(item)
                      }}
                      className="mt-3 cursor-pointer"
                    >
                      <p
                        title={item.name}
                        className="truncate text-sm font-semibold text-slate-800 transition group-hover:text-indigo-600"
                      >
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {item.isFolder ? 'Folder' : formatBytes(item.size)} • {formatDate(item.modifiedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* LIST VIEW */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                    <tr>
                      <th className="pb-3 pl-3">Name</th>
                      <th className="pb-3">Size</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Last Modified</th>
                      <th className="pb-3 pr-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item) => (
                      <tr
                        key={item.relativePath || item.name}
                        className="group transition hover:bg-slate-50/80"
                      >
                        <td className="py-3 pl-3">
                          <div
                            onClick={() => {
                              if (item.isFolder) navigateToFolder(item.relativePath)
                              else setPreviewItem(item)
                            }}
                            className="flex cursor-pointer items-center gap-3 font-medium text-slate-700 group-hover:text-indigo-600"
                          >
                            {getItemIcon(item)}
                            <span className="truncate max-w-xs md:max-w-md">{item.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-xs text-slate-500">
                          {item.isFolder ? '-' : formatBytes(item.size)}
                        </td>
                        <td className="py-3 text-xs capitalize text-slate-500">
                          {item.category}
                        </td>
                        <td className="py-3 text-xs text-slate-400">
                          {formatDate(item.modifiedAt)}
                        </td>
                        <td className="py-3 pr-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!item.isFolder && (
                              <>
                                <button
                                  onClick={() => setPreviewItem(item)}
                                  title="Preview"
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                                >
                                  <Eye size={15} />
                                </button>
                                <a
                                  href={`/api/agent/download?path=${encodeURIComponent(item.relativePath)}`}
                                  download={item.name}
                                  title="Download"
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                                >
                                  <Download size={15} />
                                </a>
                              </>
                            )}
                            <button
                              onClick={() => {
                                setRenamingItem(item)
                                setNewName(item.name)
                              }}
                              title="Rename"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => setDeletingItem(item)}
                              title="Delete"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <RightPanel />
      </div>

      {/* NEW FOLDER MODAL */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="text-indigo-600" size={22} />
                <h3 className="text-lg font-bold text-slate-800">Create New Folder</h3>
              </div>
              <button
                onClick={() => setIsNewFolderOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">Folder Name</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Invoices 2026"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {renamingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="text-indigo-600" size={22} />
                <h3 className="text-lg font-bold text-slate-800">Rename</h3>
              </div>
              <button
                onClick={() => setRenamingItem(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRename} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">New Name</label>
                <input
                  type="text"
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenamingItem(null)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Move to Trash?</h3>
                <p className="text-xs text-slate-500">
                  {deletingItem.isFolder ? 'Folder' : 'File'}:{' '}
                  <span className="font-semibold text-slate-700">{deletingItem.name}</span>
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500 leading-relaxed">
              This item will be moved to Trash. You can restore it later or delete it permanently from Trash.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDeletingItem(null)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700"
              >
                Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-[2rem] bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                {getItemIcon(previewItem)}
                <div>
                  <h3 className="text-base font-bold text-slate-800">{previewItem.name}</h3>
                  <p className="text-xs text-slate-400">
                    {formatBytes(previewItem.size)} • {previewItem.mimeType}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/agent/download?path=${encodeURIComponent(previewItem.relativePath)}`}
                  download={previewItem.name}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
                >
                  <Download size={14} /> Download
                </a>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-950/5 p-6 min-h-[300px]">
              {previewItem.category === 'images' ? (
                <img
                  src={`/api/agent/preview?path=${encodeURIComponent(previewItem.relativePath)}`}
                  alt={previewItem.name}
                  className="max-h-[65vh] max-w-full rounded-xl object-contain shadow-md"
                />
              ) : previewItem.category === 'videos' ? (
                <video
                  controls
                  autoPlay
                  src={`/api/agent/preview?path=${encodeURIComponent(previewItem.relativePath)}`}
                  className="max-h-[65vh] max-w-full rounded-xl shadow-md"
                />
              ) : previewItem.category === 'audio' ? (
                <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 shadow-md">
                  <Music size={48} className="text-indigo-600" />
                  <p className="font-semibold text-slate-700">{previewItem.name}</p>
                  <audio
                    controls
                    autoPlay
                    src={`/api/agent/preview?path=${encodeURIComponent(previewItem.relativePath)}`}
                    className="w-80"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white p-10 text-center shadow-md">
                  {getItemIcon(previewItem)}
                  <div>
                    <h4 className="font-semibold text-slate-800">{previewItem.name}</h4>
                    <p className="mt-1 text-xs text-slate-500">
                      Preview not directly available for this format. You can download the file directly.
                    </p>
                  </div>
                  <a
                    href={`/api/agent/download?path=${encodeURIComponent(previewItem.relativePath)}`}
                    download={previewItem.name}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700"
                  >
                    <Download size={16} /> Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default function FilesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-slate-50">
          <RefreshCw className="animate-spin text-indigo-600" size={32} />
        </div>
      }
    >
      <FilesContent />
    </Suspense>
  )
}
