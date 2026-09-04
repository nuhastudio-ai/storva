'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HardDrive } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 rounded-[2rem] bg-white/20 px-8 py-12 shadow-xl backdrop-blur-lg">
        <h1 className="mb-6 flex justify-center items-center">
          <HardDrive className="text-indigo-600 flex-shrink-0 text-3xl mr-2" />
          <span className="text-center text-2xl font-bold text-white">Storva Login</span>
        </h1>
        {error && <div className="rounded mb-3 p-3 bg-rose-50 text-rose-600">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white">Username</label>
            <input
              type="text"
              value={credentials.username}
              onChange={e => setCredentials({...credentials, username: e.target.value})}
              autoFocus
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 bg-white text-sm text-slate-800 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-white">Password</label>
            <input
              type="password"
              value={credentials.password}
              onChange={e => setCredentials({...credentials, password: e.target.value})}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-2 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 bg-white text-sm text-slate-800 shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
