'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Lock, FileText, Folder, Download, AlertTriangle, ShieldAlert } from 'lucide-react'

type ShareData = {
  id: string
  fileId: string
  name: string
  isFolder: boolean
  relativePath: string
  mimeType: string
  size: string
  accessType: 'PUBLIC' | 'USER'
  hasPasskey: boolean
  readOnly: boolean
  expiresAt: string | null
}

type User = {
  id: string
  username: string
  role: string
}

export function ShareViewer({ share }: { share: any }) {
  const [data, setData] = useState<ShareData | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [passkey, setPasskey] = useState('')
  const [passkeyUnlocked, setPasskeyUnlocked] = useState(false)
  const [passkeyError, setPasskeyError] = useState('')
  const [folderItems, setFolderItems] = useState<any[]>([])

  useEffect(() => {
    // Ambil data share ringkas
    fetch(`/api/share/${share.token}`)
      .then((res) => res.json())
      .then((d) => setData(d))

    // Ambil me session
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d?.user) setCurrentUser(d.user)
      })
      .finally(() => setAuthChecked(true))
  }, [share.token])

  useEffect(() => {
    if (!data || !data.isFolder) return
    // Load isi folder jika boleh diakses
    fetch(`/api/agent/files?path=${encodeURIComponent(data.relativePath)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d?.items) setFolderItems(d.items)
      })
      .catch(() => {})
  }, [data])

  if (!data || !authChecked) {
    return <div className="p-8 text-center text-slate-500">Memuat viewer share...</div>
  }

  // 1. Guard akses USER-only (Harus Login)
  if (data.accessType === 'USER' && !currentUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Lock size={28} />
          </div>
          <h2 className="mt-4 text-center text-xl font-bold text-slate-800">Akses Terbatas</h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            Konten ini diset khusus untuk pengguna terdaftar. Anda harus login terlebih dahulu untuk mengaksesnya.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/login?redirect=/s/${share.token}`}
              className="flex w-full justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Login Sekarang
            </Link>
            <button
              onClick={() => window.close()}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancel / Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 2. Guard Passkey (Jika PUBLIC dengan Passkey & user role Guest)
  const isGuest = !currentUser || currentUser.role.toUpperCase() === 'GUEST'
  const needPasskey = data.hasPasskey && isGuest && !passkeyUnlocked

  if (needPasskey) {
    const handleVerify = async (e: React.FormEvent) => {
      e.preventDefault()
      setPasskeyError('')
      const res = await fetch(`/api/share/${share.token}/verify-passkey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey }),
      })
      const d = await res.json()
      if (res.ok && d.valid) {
        setPasskeyUnlocked(true)
      } else {
        setPasskeyError(d.error || 'Passkey salah')
      }
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
        <form onSubmit={handleVerify} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <ShieldAlert size={28} />
          </div>
          <h2 className="mt-4 text-center text-xl font-bold text-slate-800">Masukkan Passkey</h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            Pemilik link memberikan proteksi passkey untuk membuka file/folder ini.
          </p>

          <div className="mt-5">
            <input
              type="password"
              placeholder="Masukkan Passkey..."
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
            />
            {passkeyError && <p className="mt-2 text-xs font-medium text-rose-600">{passkeyError}</p>}
          </div>

          <button
            type="submit"
            className="mt-5 flex w-full justify-center rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Buka Konten
          </button>
        </form>
      </div>
    )
  }

  // 3. Tampilan Viewer Konten Utama
  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            {data.isFolder ? <Folder className="text-amber-500" /> : <FileText className="text-indigo-500" />}
            {data.name}
          </h1>
          <p className="text-xs text-slate-400 mt-1">Shared Item • Access: {data.accessType}</p>
        </div>

        {!data.isFolder && (
          <a
            href={`/api/agent/download?path=${encodeURIComponent(data.relativePath)}`}
            download={data.name}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Download size={16} /> Download
          </a>
        )}
      </header>

      {/* Content Viewer File / Folder */}
      {data.isFolder ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Daftar Isi Folder</h3>
          <div className="divide-y divide-slate-100">
            {folderItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Folder kosong atau tidak dapat diakses.</p>
            ) : (
              folderItems.map((item) => (
                <div key={item.relativePath} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {item.isFolder ? <Folder className="text-amber-500" size={18} /> : <FileText className="text-slate-400" size={18} />}
                    <span className="text-sm font-medium text-slate-700">{item.name}</span>
                  </div>
                  {!item.isFolder && (
                    <a
                      href={`/api/agent/download?path=${encodeURIComponent(item.relativePath)}`}
                      download={item.name}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Download
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <FileText size={48} className="mx-auto text-indigo-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-800">{data.name}</h3>
          <p className="text-xs text-slate-400 mt-1">Siap untuk dilihat atau diunduh.</p>
          <div className="mt-6">
            <a
              href={`/api/agent/download?path=${encodeURIComponent(data.relativePath)}`}
              download={data.name}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700"
            >
              <Download size={18} /> Unduh File
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
