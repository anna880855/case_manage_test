'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useStore } from '@/lib/store'

const NAV = [
  { href: '/', label: '個案列表', icon: '👥' },
  { href: '/phone-visit', label: '電訪產生', icon: '📞' },
  { href: '/home-visit', label: '家訪計劃', icon: '🏠' },
  { href: '/settings', label: '設定', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { cases, settings, setCases, setSentences } = useStore()
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  const handleSync = async (silent = false) => {
    if (!settings.appsScriptUrl) {
      if (!silent) {
        setSyncMsg('請先在設定頁面填入 Apps Script URL')
        setTimeout(() => setSyncMsg(''), 3000)
      }
      return
    }
    setSyncing(true)
    if (!silent) setSyncMsg('')
    try {
      const res = await fetch(`/api/sync?url=${encodeURIComponent(settings.appsScriptUrl)}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.cases) setCases(data.cases)
      if (data.sentences) setSentences(data.sentences)
      setSyncMsg(`已同步 ${data.cases?.length || 0} 筆個案`)
    } catch (e: unknown) {
      if (!silent) setSyncMsg(e instanceof Error ? e.message : '同步失敗')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(''), 4000)
    }
  }

  const activeCases = cases.filter(c => c.status === 'active').length

  return (
    <aside className="w-56 bg-[#50665b] text-white flex flex-col h-full flex-shrink-0">
      <div className="p-5 border-b border-white/10">
        <h1 className="text-base font-bold leading-tight">個案管理系統</h1>
        <p className="text-xs text-[#aec4b6] mt-1">
          {activeCases > 0 ? `在案 ${activeCases} 位` : '尚無個案'}
        </p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              pathname === item.href
                ? 'bg-white/20 font-semibold'
                : 'hover:bg-white/10 text-white/80'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-2">
        <button
          onClick={() => handleSync(false)}
          disabled={syncing}
          className="w-full flex items-center justify-center gap-2 py-2 bg-[#a3bcaa] hover:bg-[#b4c9bb] disabled:opacity-60 rounded-lg text-sm font-medium transition-colors"
        >
          {syncing ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              同步中...
            </>
          ) : '☁️ 同步個案'}
        </button>
        {syncMsg && (
          <p className="text-xs text-center text-[#aec4b6] leading-tight">{syncMsg}</p>
        )}
        {settings.managerName && (
          <p className="text-xs text-white/50 text-center">{settings.managerName}</p>
        )}
      </div>
    </aside>
  )
}
