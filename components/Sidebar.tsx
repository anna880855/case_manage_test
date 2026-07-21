'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useStore } from '@/lib/store'

const NAV = [
  { href: '/', label: '個案列表', icon: '👥' },
  { href: '/phone-visit', label: '電訪產生', icon: '📞' },
  { href: '/home-visit', label: '家訪計劃', icon: '🏠' },
  { href: '/referral', label: '轉介追蹤', icon: '📮' },
  { href: '/professional-service', label: '專業服務追蹤', icon: '🎯' },
  { href: '/health-bureau-export', label: '衛生局報表', icon: '📤' },
  { href: '/settings', label: '設定', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { cases, settings, setCases, setSentences, importHomeVisits, importReferrals, importProfessionalServices } = useStore()
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [collapsed, setCollapsed] = useState(false)

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
      const params = new URLSearchParams({
        url: settings.appsScriptUrl,
        homeVisitSheetName: settings.homeVisitSheetName || '家訪紀錄',
        referralSheetName: settings.referralSheetName || '轉介紀錄',
        professionalServiceSheetName: settings.professionalServiceSheetName || '專業服務追蹤紀錄',
      })
      const res = await fetch(`/api/sync?${params}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.cases) setCases(data.cases)
      if (data.sentences) setSentences(data.sentences)
      if (data.homeVisits?.length) importHomeVisits(data.homeVisits)
      if (data.referrals?.length) importReferrals(data.referrals)
      if (data.professionalServices?.length) importProfessionalServices(data.professionalServices)
      setSyncMsg(`已同步 ${data.cases?.length || 0} 筆個案、${data.homeVisits?.length || 0} 筆家訪、${data.referrals?.length || 0} 筆轉介、${data.professionalServices?.length || 0} 筆專業服務`)
    } catch (e: unknown) {
      if (!silent) setSyncMsg(e instanceof Error ? e.message : '同步失敗')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(''), 4000)
    }
  }

  const activeCases = cases.filter(c => c.status === 'active').length

  return (
    <aside
      className={`${collapsed ? 'w-14' : 'w-56'} bg-[#50665b] text-white flex flex-col h-full flex-shrink-0 transition-[width] duration-200`}
    >
      <div className={`border-b border-white/10 flex items-center ${collapsed ? 'justify-center p-3' : 'justify-between p-5'}`}>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-base font-bold leading-tight">測試的個案管理系統</h1>
            <p className="text-xs text-[#aec4b6] mt-1">
              {activeCases > 0 ? `在案 ${activeCases} 位` : '尚無個案'}
            </p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? '展開選單' : '收起選單'}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/80 transition-colors"
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              collapsed ? 'justify-center' : ''
            } ${
              pathname === item.href
                ? 'bg-white/20 font-semibold'
                : 'hover:bg-white/10 text-white/80'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {!collapsed && item.label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-2">
        <button
          onClick={() => handleSync(false)}
          disabled={syncing}
          title={collapsed ? '同步個案' : undefined}
          className="w-full flex items-center justify-center gap-2 py-2 bg-[#a3bcaa] hover:bg-[#b4c9bb] disabled:opacity-60 rounded-lg text-sm font-medium transition-colors"
        >
          {syncing ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {!collapsed && '同步中...'}
            </>
          ) : (collapsed ? '☁️' : '☁️ 同步個案')}
        </button>
        {!collapsed && syncMsg && (
          <p className="text-xs text-center text-[#aec4b6] leading-tight">{syncMsg}</p>
        )}
        {!collapsed && settings.managerName && (
          <p className="text-xs text-white/50 text-center">{settings.managerName}</p>
        )}
      </div>
    </aside>
  )
}
