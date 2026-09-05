import { Sidebar, RightPanel } from '@/components/dashboard'

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#eef2ff,_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-3 text-slate-700 md:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1440px] gap-6 rounded-[2rem] border border-white/70 bg-white/70 p-3 shadow-[0_20px_80px_rgba(99,102,241,0.12)] backdrop-blur-xl md:grid-cols-[240px_1fr_320px] md:p-5">
        <Sidebar />
        <section className="space-y-6">
          {children}
        </section>
        <RightPanel />
      </div>
    </main>
  )
}
