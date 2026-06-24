#!/bin/bash
# 個案管理系統 - 自動建檔腳本
# 在 clone 下來的 case-management 資料夾內執行：bash setup.sh
set -e

mkdir -p app/api/generate app/api/sync "app/cases/[id]" app/home-visit app/phone-visit app/settings components lib google-apps-script

# ── package.json ──
cat > package.json << 'FILEOF_PACKAGE_JSON'
{
  "name": "case-management",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "next": "14.2.29",
    "react": "^18",
    "react-dom": "^18",
    "zustand": "^4.5.2"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "eslint": "^8",
    "eslint-config-next": "14.2.29",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
FILEOF_PACKAGE_JSON

# ── next.config.mjs ──
cat > next.config.mjs << 'FILEOF_NEXT_CONFIG_MJS'
/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
FILEOF_NEXT_CONFIG_MJS

# ── tailwind.config.ts ──
cat > tailwind.config.ts << 'FILEOF_TAILWIND_CONFIG_TS'
import type { Config } from 'tailwindcss'
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: '#2d6a4f',
        accent2: '#52b788',
      },
    },
  },
  plugins: [],
}
export default config
FILEOF_TAILWIND_CONFIG_TS

# ── postcss.config.mjs ──
cat > postcss.config.mjs << 'FILEOF_POSTCSS_CONFIG_MJS'
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;
FILEOF_POSTCSS_CONFIG_MJS

# ── tsconfig.json ──
cat > tsconfig.json << 'FILEOF_TSCONFIG_JSON'
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{"name": "next"}],
    "paths": {"@/*": ["./*"]}
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
FILEOF_TSCONFIG_JSON

# ── vercel.json ──
cat > vercel.json << 'FILEOF_VERCEL_JSON'
{
  "framework": "nextjs"
}
FILEOF_VERCEL_JSON

# ── .gitignore ──
cat > .gitignore << 'FILEOF__GITIGNORE'
/node_modules
/.pnp
.pnp.js
/.next/
/out/
/build
.DS_Store
*.pem
.env
.env*.local
.vercel
*.tsbuildinfo
next-env.d.ts
FILEOF__GITIGNORE

# ── lib/types.ts ──
cat > lib/types.ts << 'FILEOF_LIB_TYPES_TS'
export interface Case {
  id: string
  name: string
  caseNumber: string
  phone: string
  address: string
  birthDate: string
  idNumber: string
  status: 'active' | 'suspended' | 'closed'
  startDate: string
  careLevel: string
  disability: string
  guardian: string
  guardianPhone: string
  notes: string
  services: string[]
}

export interface PhoneVisitRecord {
  id: string
  caseId: string
  caseName: string
  date: string
  target: string
  content: string
  createdAt: string
}

export interface HomeVisitRecord {
  id: string
  caseId: string
  caseName: string
  date: string
  planContent: string
  createdAt: string
}

export interface Sentence {
  id: string
  category: string
  text: string
}

export interface Settings {
  appsScriptUrl: string
  claudeApiKey: string
  organizationName: string
  managerName: string
  managerPhone: string
}
FILEOF_LIB_TYPES_TS

# ── lib/store.ts ──
cat > lib/store.ts << 'FILEOF_LIB_STORE_TS'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Case, PhoneVisitRecord, HomeVisitRecord, Sentence, Settings } from './types'

const DEFAULT_SENTENCES: Sentence[] = [
  { id: '1', category: '健康狀況', text: '詢問近期身體狀況，個案表示穩定，無特殊不適。' },
  { id: '2', category: '健康狀況', text: '個案近期有就醫，目前服藥中，狀況穩定。' },
  { id: '3', category: '健康狀況', text: '個案表示近期身體較虛弱，已提醒注意休息及補充營養。' },
  { id: '4', category: '用藥', text: '確認個案規律服藥，無漏服情形。' },
  { id: '5', category: '用藥', text: '提醒個案按時服藥，個案表示了解並配合。' },
  { id: '6', category: '生活狀況', text: '日常生活起居正常，飲食規律，睡眠品質尚可。' },
  { id: '7', category: '生活狀況', text: '家人協助照顧，照顧者狀況穩定，無喘息需求。' },
  { id: '8', category: '服務使用', text: '確認正常使用長照服務，無問題反應，服務穩定。' },
  { id: '9', category: '服務使用', text: '個案對目前服務表示滿意，無調整需求。' },
  { id: '10', category: '心理情緒', text: '個案情緒穩定，對目前生活狀況表示適應良好。' },
  { id: '11', category: '心理情緒', text: '個案表達情緒低落，給予傾聽與支持，並評估後續需求。' },
  { id: '12', category: '照顧者', text: '主要照顧者表示照顧壓力尚可承受，無立即喘息需求。' },
  { id: '13', category: '照顧者', text: '照顧者反應疲憊，已告知喘息服務申請方式並協助評估。' },
  { id: '14', category: '需求確認', text: '詢問近期是否有額外需求，個案及家屬表示無。' },
  { id: '15', category: '需求確認', text: '個案提出輔具需求，已記錄並將協助評估申請。' },
  { id: '16', category: '結語', text: '告知如有任何問題可隨時聯繫個管師，個案表示了解。' },
  { id: '17', category: '結語', text: '提醒下次回訪時間，個案表示知悉並同意配合。' },
]

interface StoreState {
  cases: Case[]
  phoneVisits: PhoneVisitRecord[]
  homeVisits: HomeVisitRecord[]
  sentences: Sentence[]
  settings: Settings
}

interface StoreActions {
  setCases: (cases: Case[]) => void
  addPhoneVisit: (visit: PhoneVisitRecord) => void
  deletePhoneVisit: (id: string) => void
  addHomeVisit: (visit: HomeVisitRecord) => void
  deleteHomeVisit: (id: string) => void
  addSentence: (sentence: Sentence) => void
  deleteSentence: (id: string) => void
  setSentences: (sentences: Sentence[]) => void
  updateSettings: (settings: Partial<Settings>) => void
  getCaseById: (id: string) => Case | undefined
  getPhoneVisitsByCase: (caseId: string) => PhoneVisitRecord[]
  getHomeVisitsByCase: (caseId: string) => HomeVisitRecord[]
}

export const useStore = create<StoreState & StoreActions>()(
  persist(
    (set, get) => ({
      cases: [],
      phoneVisits: [],
      homeVisits: [],
      sentences: DEFAULT_SENTENCES,
      settings: {
        appsScriptUrl: '',
        claudeApiKey: '',
        organizationName: '',
        managerName: '林侑萱',
        managerPhone: '0902692567',
      },

      setCases: (cases) => set({ cases }),

      addPhoneVisit: (visit) =>
        set((state) => ({ phoneVisits: [visit, ...state.phoneVisits] })),

      deletePhoneVisit: (id) =>
        set((state) => ({ phoneVisits: state.phoneVisits.filter((v) => v.id !== id) })),

      addHomeVisit: (visit) =>
        set((state) => ({ homeVisits: [visit, ...state.homeVisits] })),

      deleteHomeVisit: (id) =>
        set((state) => ({ homeVisits: state.homeVisits.filter((v) => v.id !== id) })),

      addSentence: (sentence) =>
        set((state) => ({ sentences: [...state.sentences, sentence] })),

      deleteSentence: (id) =>
        set((state) => ({ sentences: state.sentences.filter((s) => s.id !== id) })),

      setSentences: (sentences) => set({ sentences }),

      updateSettings: (settings) =>
        set((state) => ({ settings: { ...state.settings, ...settings } })),

      getCaseById: (id) => get().cases.find((c) => c.id === id),

      getPhoneVisitsByCase: (caseId) =>
        get().phoneVisits.filter((v) => v.caseId === caseId),

      getHomeVisitsByCase: (caseId) =>
        get().homeVisits.filter((v) => v.caseId === caseId),
    }),
    { name: 'case-mgmt-v1' }
  )
)
FILEOF_LIB_STORE_TS

# ── app/globals.css ──
cat > app/globals.css << 'FILEOF_APP_GLOBALS_CSS'
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: 'Noto Sans TC', system-ui, -apple-system, sans-serif;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
FILEOF_APP_GLOBALS_CSS

# ── app/layout.tsx ──
cat > app/layout.tsx << 'FILEOF_APP_LAYOUT_TSX'
import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: '個案管理系統',
  description: '個案管理師工作系統',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-gray-50 min-h-screen">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
FILEOF_APP_LAYOUT_TSX

# ── components/Sidebar.tsx ──
cat > components/Sidebar.tsx << 'FILEOF_COMPONENTS_SIDEBAR_TSX'
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

  const handleSync = async () => {
    if (!settings.appsScriptUrl) {
      setSyncMsg('請先在設定頁面填入 Apps Script URL')
      setTimeout(() => setSyncMsg(''), 3000)
      return
    }
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch(`/api/sync?url=${encodeURIComponent(settings.appsScriptUrl)}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.cases) setCases(data.cases)
      if (data.sentences) setSentences(data.sentences)
      setSyncMsg(`已同步 ${data.cases?.length || 0} 筆個案`)
    } catch (e: unknown) {
      setSyncMsg(e instanceof Error ? e.message : '同步失敗')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(''), 4000)
    }
  }

  const activeCases = cases.filter(c => c.status === 'active').length

  return (
    <aside className="w-56 bg-[#1b4332] text-white flex flex-col h-full flex-shrink-0">
      <div className="p-5 border-b border-white/10">
        <h1 className="text-base font-bold leading-tight">個案管理系統</h1>
        <p className="text-xs text-[#95d5b2] mt-1">
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
          onClick={handleSync}
          disabled={syncing}
          className="w-full flex items-center justify-center gap-2 py-2 bg-[#52b788] hover:bg-[#74c69d] disabled:opacity-60 rounded-lg text-sm font-medium transition-colors"
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
          <p className="text-xs text-center text-[#95d5b2] leading-tight">{syncMsg}</p>
        )}
        {settings.managerName && (
          <p className="text-xs text-white/50 text-center">{settings.managerName}</p>
        )}
      </div>
    </aside>
  )
}
FILEOF_COMPONENTS_SIDEBAR_TSX

# ── app/page.tsx ──
cat > app/page.tsx << 'FILEOF_APP_PAGE_TSX'
'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import type { Case } from '@/lib/types'

const STATUS_LABEL: Record<string, string> = {
  active: '在案',
  suspended: '暫停',
  closed: '結案',
}

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-gray-100 text-gray-500',
}

const STATUS_FILTERS = [
  { value: 'active', label: '在案' },
  { value: 'suspended', label: '暫停' },
  { value: 'closed', label: '結案' },
  { value: 'all', label: '全部' },
]

export default function HomePage() {
  const { cases } = useStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')

  const counts = useMemo(() => ({
    active: cases.filter(c => c.status === 'active').length,
    suspended: cases.filter(c => c.status === 'suspended').length,
    closed: cases.filter(c => c.status === 'closed').length,
  }), [cases])

  const filtered = useMemo(() => {
    return cases.filter(c => {
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      if (!matchStatus) return false
      const q = search.trim().toLowerCase()
      if (!q) return true
      return (
        c.name.includes(q) ||
        (c.caseNumber || '').includes(q) ||
        (c.phone || '').includes(q) ||
        (c.address || '').toLowerCase().includes(q)
      )
    })
  }, [cases, search, statusFilter])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">個案列表</h2>
        <div className="flex gap-2 text-sm">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">在案 {counts.active}</span>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">暫停 {counts.suspended}</span>
          <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full font-medium">結案 {counts.closed}</span>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="搜尋姓名、個案編號、電話、地址..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788] bg-white"
        />
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                statusFilter === f.value
                  ? 'bg-[#2d6a4f] text-white font-medium'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-5xl mb-4">☁️</p>
          <p className="text-lg font-medium mb-1">尚無個案資料</p>
          <p className="text-sm">請點擊左側「同步個案」按鈕，從 Google Sheet 載入資料</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>找不到符合「{search}」的個案</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map(c => <CaseRow key={c.id} case_={c} />)}
        </div>
      )}
    </div>
  )
}

function CaseRow({ case_: c }: { case_: Case }) {
  return (
    <Link
      href={`/cases/${c.id}`}
      className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 px-5 py-3.5 hover:shadow-md hover:border-[#52b788]/40 transition-all group"
    >
      <div className="w-9 h-9 rounded-full bg-[#d8f3dc] flex items-center justify-center text-[#2d6a4f] font-bold text-sm flex-shrink-0">
        {c.name?.[0] || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800 group-hover:text-[#2d6a4f] transition-colors">{c.name}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[c.status] || STATUS_COLOR.active}`}>
            {STATUS_LABEL[c.status] || '在案'}
          </span>
        </div>
        <div className="flex gap-4 mt-0.5 text-sm text-gray-400">
          {c.caseNumber && <span>編號 {c.caseNumber}</span>}
          {c.careLevel && <span>等級 {c.careLevel}</span>}
          {c.guardian && <span>照顧者 {c.guardian}</span>}
        </div>
      </div>
      <div className="text-right text-sm text-gray-400 flex-shrink-0 hidden sm:block">
        {c.phone && <div>{c.phone}</div>}
        {c.address && <div className="truncate max-w-[180px] text-xs mt-0.5">{c.address}</div>}
      </div>
      <span className="text-gray-300 group-hover:text-[#2d6a4f] transition-colors text-lg">›</span>
    </Link>
  )
}
FILEOF_APP_PAGE_TSX

# ── app/cases/[id]/page.tsx ──
cat > "app/cases/[id]/page.tsx" << 'FILEOF_APP_CASES_ID_PAGE_TSX'
'use client'
import Link from 'next/link'
import { useStore } from '@/lib/store'

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const { getCaseById, getPhoneVisitsByCase, getHomeVisitsByCase } = useStore()
  const c = getCaseById(params.id)
  const phoneVisits = getPhoneVisitsByCase(params.id)
  const homeVisits = getHomeVisitsByCase(params.id)

  if (!c) {
    return (
      <div className="text-center py-24 text-gray-400">
        <p className="text-4xl mb-3">🔍</p>
        <p className="mb-4">找不到此個案</p>
        <Link href="/" className="text-[#2d6a4f] hover:underline">← 返回列表</Link>
      </div>
    )
  }

  const statusLabel = c.status === 'active' ? '在案' : c.status === 'suspended' ? '暫停' : '結案'
  const statusColor = c.status === 'active' ? 'bg-green-100 text-green-700' : c.status === 'suspended' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 返回</Link>
        <div className="w-px h-4 bg-gray-200" />
        <h2 className="text-2xl font-bold text-gray-800">{c.name}</h2>
        <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${statusColor}`}>{statusLabel}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-50">基本資料</h3>
          <dl className="space-y-2.5">
            <InfoRow label="個案編號" value={c.caseNumber} />
            <InfoRow label="生日" value={c.birthDate} />
            <InfoRow label="身分證" value={c.idNumber} />
            <InfoRow label="電話" value={c.phone} />
            <InfoRow label="地址" value={c.address} />
            <InfoRow label="開案日期" value={c.startDate} />
          </dl>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-50">照顧資訊</h3>
          <dl className="space-y-2.5">
            <InfoRow label="照顧等級" value={c.careLevel} />
            <InfoRow label="失能狀況" value={c.disability} />
            <InfoRow label="主要照顧者" value={c.guardian} />
            <InfoRow label="照顧者電話" value={c.guardianPhone} />
          </dl>
          {c.services && c.services.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              <dt className="text-xs text-gray-400 mb-1.5">服務項目</dt>
              <div className="flex flex-wrap gap-1">
                {c.services.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 bg-[#d8f3dc] text-[#2d6a4f] rounded-full text-xs font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {c.notes && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5">
          <h3 className="font-medium text-amber-800 mb-1 text-sm">備註</h3>
          <p className="text-sm text-amber-700 whitespace-pre-wrap">{c.notes}</p>
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <Link
          href={`/phone-visit?caseId=${c.id}`}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#2d6a4f] text-white rounded-xl hover:bg-[#1b4332] transition-colors font-medium"
        >
          📞 產生電訪紀錄
        </Link>
        <Link
          href={`/home-visit?caseId=${c.id}`}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border-2 border-[#2d6a4f] text-[#2d6a4f] rounded-xl hover:bg-[#d8f3dc] transition-colors font-medium"
        >
          🏠 產生家訪計劃
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <VisitHistory
          title="電訪紀錄"
          visits={phoneVisits.map(v => ({ id: v.id, date: v.date, preview: v.content }))}
        />
        <VisitHistory
          title="家訪紀錄"
          visits={homeVisits.map(v => ({ id: v.id, date: v.date, preview: v.planContent }))}
        />
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex gap-2">
      <dt className="w-24 text-xs text-gray-400 pt-0.5 flex-shrink-0">{label}</dt>
      <dd className="text-sm text-gray-700">{value}</dd>
    </div>
  )
}

function VisitHistory({ title, visits }: { title: string; visits: { id: string; date: string; preview: string }[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-700 mb-3">
        {title} <span className="text-gray-400 font-normal text-sm">({visits.length})</span>
      </h3>
      {visits.length === 0 ? (
        <p className="text-sm text-gray-400">尚無紀錄</p>
      ) : (
        <div className="space-y-2">
          {visits.slice(0, 5).map(v => (
            <div key={v.id} className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-400 mb-0.5">{v.date}</p>
              <p className="text-sm text-gray-600 line-clamp-2">{v.preview}</p>
            </div>
          ))}
          {visits.length > 5 && (
            <p className="text-xs text-gray-400 text-center">還有 {visits.length - 5} 筆...</p>
          )}
        </div>
      )}
    </div>
  )
}
FILEOF_APP_CASES_ID_PAGE_TSX

# ── app/phone-visit/page.tsx ──
cat > app/phone-visit/page.tsx << 'FILEOF_APP_PHONE-VISIT_PAGE_TSX'
'use client'
import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import type { Case, Sentence } from '@/lib/types'

function buildPrompt(c: Case, sentences: string[], target: string, customNote: string, date: string, managerName: string): string {
  return `你是一位專業的個案管理師（${managerName}），請根據以下資訊產生一份正式的電訪紀錄，使用繁體中文，語氣專業具體。

個案資料：
- 姓名：${c.name}
- 個案編號：${c.caseNumber || ''}
- 照顧等級：${c.careLevel || ''}
- 失能狀況：${c.disability || ''}
- 目前服務：${c.services?.join('、') || ''}
- 主要照顧者：${c.guardian || ''}

電訪日期：${date}
電訪對象：${target || c.guardian || c.name}
電訪人員：${managerName}

本次電訪重點：
${sentences.length > 0 ? sentences.map(s => `- ${s}`).join('\n') : '- 例行追蹤確認'}
${customNote ? `\n補充說明：${customNote}` : ''}

請依照以下固定格式產生電訪紀錄（直接輸出格式內容，不要加任何說明文字）：

一、電訪日期：${date}
二、電訪對象：${target || c.guardian || c.name}
三、訪談內容：
（請用150-250字流暢敘述電訪過程，融入上述重點，以第三人稱書寫，不使用條列式）

一、照顧及專業服務：（根據情況填寫，如無異動則寫「服務穩定無須異動。」）
二、交通接送服務：（根據情況填寫，如無新增則寫「暫無新增照會。」）
三、輔具及居家無障礙環境改善：（根據情況填寫，如無需求則寫「無新增需求。」）
四、喘息服務：（根據情況填寫，如無需求則寫「與案家屬確認暫無需求。」）
五、轉介其他資源：（根據情況填寫，如無則寫「無轉介。」）`
}

function PhoneVisitContent() {
  const searchParams = useSearchParams()
  const { cases, sentences, settings, addPhoneVisit, getPhoneVisitsByCase } = useStore()

  const activeCases = cases.filter(c => c.status !== 'closed')
  const [selectedCaseId, setSelectedCaseId] = useState(searchParams.get('caseId') || '')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [target, setTarget] = useState('')
  const [selectedSentences, setSelectedSentences] = useState<string[]>([])
  const [customNote, setCustomNote] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [caseSearch, setCaseSearch] = useState('')

  const selectedCase = cases.find(c => c.id === selectedCaseId)
  const recentVisits = selectedCaseId ? getPhoneVisitsByCase(selectedCaseId).slice(0, 2) : []

  const filteredCases = useMemo(() => {
    const q = caseSearch.trim().toLowerCase()
    if (!q) return activeCases
    return activeCases.filter(c =>
      c.name.includes(q) || (c.caseNumber || '').includes(q) || (c.phone || '').includes(q)
    )
  }, [activeCases, caseSearch])

  const sentencesByCategory = useMemo(() => {
    const cats: Record<string, Sentence[]> = {}
    sentences.forEach(s => {
      if (!cats[s.category]) cats[s.category] = []
      cats[s.category].push(s)
    })
    return cats
  }, [sentences])

  const toggleSentence = (text: string) => {
    setSelectedSentences(prev =>
      prev.includes(text) ? prev.filter(s => s !== text) : [...prev, text]
    )
  }

  const handleGenerate = async () => {
    if (!selectedCase) { setError('請選擇個案'); return }
    if (!settings.claudeApiKey) { setError('請先在「設定」頁面填入 Claude API Key'); return }
    setGenerating(true)
    setError('')
    setGenerated('')
    setSaved(false)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: buildPrompt(selectedCase, selectedSentences, target, customNote, date, settings.managerName),
          apiKey: settings.claudeApiKey,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setGenerated(data.content)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '產生失敗，請再試一次')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = () => {
    if (!selectedCase || !generated) return
    addPhoneVisit({
      id: Date.now().toString(),
      caseId: selectedCase.id,
      caseName: selectedCase.name,
      date,
      target: target || selectedCase.guardian || selectedCase.name,
      content: generated,
      createdAt: new Date().toISOString(),
    })
    setSaved(true)
  }

  return (
    <div className="max-w-6xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">電訪紀錄產生</h2>

      <div className="grid grid-cols-[280px,1fr] gap-6">
        {/* Left panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">選擇個案</label>
            <input
              type="text"
              placeholder="搜尋..."
              value={caseSearch}
              onChange={e => setCaseSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-[#52b788]"
            />
            <div className="max-h-52 overflow-y-auto space-y-0.5">
              {filteredCases.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCaseId(c.id); setCaseSearch(''); setGenerated(''); setSaved(false); setSelectedSentences([]) }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCaseId === c.id
                      ? 'bg-[#d8f3dc] text-[#2d6a4f] font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="font-medium">{c.name}</div>
                  {c.caseNumber && <div className="text-xs text-gray-400">{c.caseNumber}</div>}
                </button>
              ))}
              {filteredCases.length === 0 && <p className="text-sm text-gray-400 px-3 py-2">找不到個案</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">電訪日期</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">電訪對象</label>
              <input
                type="text"
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder={selectedCase?.guardian || '個案或照顧者姓名'}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
              />
            </div>
          </div>

          {selectedCase && (
            <div className="bg-[#d8f3dc] rounded-xl p-4">
              <p className="font-semibold text-[#2d6a4f] text-sm">{selectedCase.name}</p>
              {selectedCase.careLevel && <p className="text-xs text-[#2d6a4f]/70 mt-1">照顧等級：{selectedCase.careLevel}</p>}
              {selectedCase.services?.length > 0 && (
                <p className="text-xs text-[#2d6a4f]/70">服務：{selectedCase.services.join('、')}</p>
              )}
              {recentVisits.length > 0 && (
                <p className="text-xs text-[#2d6a4f]/50 mt-1.5">上次電訪：{recentVisits[0].date}</p>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-700 mb-3">
              選擇句型
              <span className="text-xs font-normal text-gray-400 ml-2">點選後 AI 會融入這些重點產生紀錄</span>
            </h3>
            {Object.entries(sentencesByCategory).map(([cat, items]) => (
              <div key={cat} className="mb-3">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">{cat}</p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map(s => (
                    <button
                      key={s.id}
                      onClick={() => toggleSentence(s.text)}
                      title={s.text}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                        selectedSentences.includes(s.text)
                          ? 'bg-[#2d6a4f] text-white border-[#2d6a4f] shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-[#52b788] hover:text-[#2d6a4f]'
                      }`}
                    >
                      {s.text.length > 20 ? s.text.slice(0, 20) + '…' : s.text}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              補充說明 <span className="font-normal text-gray-400">（選填，本次特殊狀況）</span>
            </label>
            <textarea
              value={customNote}
              onChange={e => setCustomNote(e.target.value)}
              placeholder="例：個案本週回診，醫師調整血壓藥劑量..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788] resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">{error}</div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || !selectedCaseId}
            className="w-full py-3 bg-[#2d6a4f] text-white rounded-xl font-semibold hover:bg-[#1b4332] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                AI 產生中，請稍候...
              </>
            ) : '✨ AI 產生電訪紀錄'}
          </button>

          {generated && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">產生結果</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setGenerated(''); setSaved(false) }}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500"
                  >
                    重新產生
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(generated)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    📋 複製
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saved}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      saved ? 'bg-green-100 text-green-700' : 'bg-[#2d6a4f] text-white hover:bg-[#1b4332]'
                    }`}
                  >
                    {saved ? '✓ 已儲存' : '💾 儲存'}
                  </button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed bg-gray-50 rounded-lg p-4">{generated}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PhoneVisitPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">載入中...</div>}>
      <PhoneVisitContent />
    </Suspense>
  )
}
FILEOF_APP_PHONE-VISIT_PAGE_TSX

# ── app/home-visit/page.tsx ──
cat > app/home-visit/page.tsx << 'FILEOF_APP_HOME-VISIT_PAGE_TSX'
'use client'
import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import type { Case } from '@/lib/types'

const ASSESSMENT_FIELDS = [
  { key: 'diseaseHistory', label: '疾病史', placeholder: '例：高血壓、糖尿病、心臟病、中風...' },
  { key: 'caseCondition', label: '個案狀況', placeholder: '目前身體功能、活動能力、ADL/IADL 狀況...' },
  { key: 'caregiverAssessment', label: '主要照顧者評估', placeholder: '照顧者身心狀況、照顧負荷、支持需求...' },
  { key: 'problems', label: '照顧問題', placeholder: '列出主要照顧問題（可用1.2.分點）' },
  { key: 'shortTermGoal', label: '短期目標', placeholder: '預計3個月內達成的目標...' },
  { key: 'midTermGoal', label: '中期目標', placeholder: '預計6個月內達成的目標...' },
  { key: 'longTermGoal', label: '長期目標', placeholder: '長期照顧目標...' },
  { key: 'formalCareService', label: '照顧及專業服務', placeholder: '目前使用的正式照顧服務（居家服務、日照等）...' },
  { key: 'transportService', label: '交通接送服務', placeholder: '例：1840元/月，至台北馬偕醫院，或「暫無需求」' },
  { key: 'assistiveDevice', label: '輔具及居家無障礙', placeholder: '輔具需求或居家環境改善需求，或「暫無需求」' },
  { key: 'respiteService', label: '喘息服務', placeholder: '喘息服務使用狀況及剩餘額度...' },
  { key: 'referral', label: '轉介其他資源', placeholder: '轉介內容，或「暫無」' },
]

function buildPrompt(c: Case, guardian: string, assessment: Record<string, string>, date: string, managerName: string, managerPhone: string): string {
  const year = new Date(date).getFullYear() - 1911
  const month = new Date(date).getMonth() + 1
  const day = new Date(date).getDate()

  return `你是一位專業的長照個案管理師，請根據以下評估內容，依照固定格式產生家訪記錄，使用繁體中文，語氣客觀專業。

個案資料：
- 姓名：${c.name}
- 個案編號：${c.caseNumber || ''}
- 照顧等級：${c.careLevel || ''}
- 失能狀況：${c.disability || ''}
- 主要照顧者：${c.guardian || guardian}
- 地址：${c.address || ''}
- 目前服務：${c.services?.join('、') || ''}

家訪日期：民國${year}年${month}月${day}日
家訪人員：個管${managerName} ${managerPhone}
家屬/陪同者：${guardian || c.guardian || ''}

評估內容：
${Object.entries(assessment).filter(([, v]) => v.trim()).map(([k, v]) => {
  const field = ASSESSMENT_FIELDS.find(f => f.key === k)
  return `【${field?.label || k}】${v}`
}).join('\n')}

請依照以下固定格式輸出（直接輸出，不要加說明文字或標題之外的內容）：

一、本案於民國${year}年${month}月${day}日家訪，與個案及家屬${guardian || c.guardian || ''}討論照顧計畫/個管${managerName} ${managerPhone}。
二、個案摘述
1.疾病史：${assessment.diseaseHistory || '（請根據評估填寫）'}
2.個案狀況：（根據個案狀況資料，用2-4句具體描述現況）
3.主要照顧者評估：（根據照顧者評估資料，用2-3句描述）
三、照顧問題
（將照顧問題整理為條列式，至少2點）
四、照顧計畫目標
1.短期目標：${assessment.shortTermGoal || '（根據評估填寫）'}
2.中期目標：${assessment.midTermGoal || '（根據評估填寫）'}
3.長期目標：${assessment.longTermGoal || '（根據評估填寫）'}

一、照顧及專業服務：${assessment.formalCareService || '（根據服務使用情形填寫）'}
二、交通接送服務：${assessment.transportService || '暫無需求。'}
三、輔具及居家無障礙環境改善服務：${assessment.assistiveDevice || '暫無需求。'}
四、喘息服務/短照服務：${assessment.respiteService || '（根據喘息使用情形填寫）'}
五、轉介其他資源：${assessment.referral || '暫無。'}`
}

function HomeVisitContent() {
  const searchParams = useSearchParams()
  const { cases, settings, addHomeVisit, getHomeVisitsByCase } = useStore()

  const activeCases = cases.filter(c => c.status !== 'closed')
  const [selectedCaseId, setSelectedCaseId] = useState(searchParams.get('caseId') || '')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [guardian, setGuardian] = useState('')
  const [assessment, setAssessment] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [caseSearch, setCaseSearch] = useState('')

  const selectedCase = cases.find(c => c.id === selectedCaseId)
  const recentVisits = selectedCaseId ? getHomeVisitsByCase(selectedCaseId).slice(0, 2) : []

  const filteredCases = useMemo(() => {
    const q = caseSearch.trim().toLowerCase()
    if (!q) return activeCases
    return activeCases.filter(c =>
      c.name.includes(q) || (c.caseNumber || '').includes(q) || (c.phone || '').includes(q)
    )
  }, [activeCases, caseSearch])

  const setField = (key: string, value: string) =>
    setAssessment(prev => ({ ...prev, [key]: value }))

  const handleGenerate = async () => {
    if (!selectedCase) { setError('請選擇個案'); return }
    if (!settings.claudeApiKey) { setError('請先在「設定」頁面填入 Claude API Key'); return }
    setGenerating(true)
    setError('')
    setGenerated('')
    setSaved(false)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: buildPrompt(selectedCase, guardian, assessment, date, settings.managerName, settings.managerPhone),
          apiKey: settings.claudeApiKey,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setGenerated(data.content)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '產生失敗，請再試一次')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = () => {
    if (!selectedCase || !generated) return
    addHomeVisit({
      id: Date.now().toString(),
      caseId: selectedCase.id,
      caseName: selectedCase.name,
      date,
      planContent: generated,
      createdAt: new Date().toISOString(),
    })
    setSaved(true)
  }

  return (
    <div className="max-w-6xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">家訪計劃產生</h2>

      <div className="grid grid-cols-[280px,1fr] gap-6">
        {/* Left panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">選擇個案</label>
            <input
              type="text"
              placeholder="搜尋..."
              value={caseSearch}
              onChange={e => setCaseSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-[#52b788]"
            />
            <div className="max-h-52 overflow-y-auto space-y-0.5">
              {filteredCases.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCaseId(c.id); setCaseSearch(''); setGenerated(''); setSaved(false); setAssessment({}) }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCaseId === c.id
                      ? 'bg-[#d8f3dc] text-[#2d6a4f] font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="font-medium">{c.name}</div>
                  {c.caseNumber && <div className="text-xs text-gray-400">{c.caseNumber}</div>}
                </button>
              ))}
              {filteredCases.length === 0 && <p className="text-sm text-gray-400 px-3 py-2">找不到個案</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">家訪日期</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">陪同家屬</label>
              <input
                type="text"
                value={guardian}
                onChange={e => setGuardian(e.target.value)}
                placeholder={selectedCase?.guardian || '家屬姓名'}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
              />
            </div>
          </div>

          {selectedCase && (
            <div className="bg-[#d8f3dc] rounded-xl p-4">
              <p className="font-semibold text-[#2d6a4f] text-sm">{selectedCase.name}</p>
              {selectedCase.careLevel && <p className="text-xs text-[#2d6a4f]/70 mt-1">照顧等級：{selectedCase.careLevel}</p>}
              {selectedCase.disability && <p className="text-xs text-[#2d6a4f]/70">失能：{selectedCase.disability}</p>}
              {recentVisits.length > 0 && (
                <p className="text-xs text-[#2d6a4f]/50 mt-1.5">上次家訪：{recentVisits[0].date}</p>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-700 mb-4">家訪評估填寫</h3>
            <div className="grid grid-cols-2 gap-4">
              {ASSESSMENT_FIELDS.map(field => (
                <div key={field.key} className={field.key === 'problems' || field.key === 'caseCondition' || field.key === 'caregiverAssessment' ? 'col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    {field.label}
                  </label>
                  <textarea
                    value={assessment[field.key] || ''}
                    onChange={e => setField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={field.key === 'problems' || field.key === 'caseCondition' ? 3 : 2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788] resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">{error}</div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || !selectedCaseId}
            className="w-full py-3 bg-[#2d6a4f] text-white rounded-xl font-semibold hover:bg-[#1b4332] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                AI 產生中，請稍候...
              </>
            ) : '✨ AI 產生家訪計劃'}
          </button>

          {generated && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">產生結果</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setGenerated(''); setSaved(false) }}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500"
                  >
                    重新產生
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(generated)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    📋 複製
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saved}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      saved ? 'bg-green-100 text-green-700' : 'bg-[#2d6a4f] text-white hover:bg-[#1b4332]'
                    }`}
                  >
                    {saved ? '✓ 已儲存' : '💾 儲存'}
                  </button>
                </div>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed bg-gray-50 rounded-lg p-4">{generated}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function HomeVisitPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">載入中...</div>}>
      <HomeVisitContent />
    </Suspense>
  )
}
FILEOF_APP_HOME-VISIT_PAGE_TSX

# ── app/settings/page.tsx ──
cat > app/settings/page.tsx << 'FILEOF_APP_SETTINGS_PAGE_TSX'
'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'

export default function SettingsPage() {
  const { settings, updateSettings, sentences, addSentence, deleteSentence } = useStore()
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState('')
  const [newSentence, setNewSentence] = useState({ category: '', text: '' })

  const categories = [...new Set(sentences.map(s => s.category))]

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTestSync = async () => {
    if (!settings.appsScriptUrl) {
      setTestResult('請先填入 Apps Script URL')
      return
    }
    setTesting(true)
    setTestResult('')
    try {
      const res = await fetch(`/api/sync?url=${encodeURIComponent(settings.appsScriptUrl)}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTestResult(`✓ 連線成功！找到 ${data.cases?.length || 0} 筆個案資料`)
    } catch (e: unknown) {
      setTestResult('✗ ' + (e instanceof Error ? e.message : '連線失敗'))
    } finally {
      setTesting(false)
    }
  }

  const handleAddSentence = () => {
    if (!newSentence.category.trim() || !newSentence.text.trim()) return
    addSentence({
      id: Date.now().toString(),
      category: newSentence.category.trim(),
      text: newSentence.text.trim(),
    })
    setNewSentence({ category: '', text: '' })
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">系統設定</h2>

      {/* Basic Info */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-5">
        <h3 className="font-semibold text-gray-700 mb-4">基本資料</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">單位名稱</label>
            <input
              type="text"
              value={settings.organizationName}
              onChange={e => updateSettings({ organizationName: e.target.value })}
              placeholder="長照機構或單位名稱"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">個管師姓名</label>
            <input
              type="text"
              value={settings.managerName}
              onChange={e => updateSettings({ managerName: e.target.value })}
              placeholder="姓名"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">個管師電話</label>
            <input
              type="text"
              value={settings.managerPhone}
              onChange={e => updateSettings({ managerPhone: e.target.value })}
              placeholder="0900000000"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          className={`mt-4 px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
            saved ? 'bg-green-500 text-white' : 'bg-[#2d6a4f] text-white hover:bg-[#1b4332]'
          }`}
        >
          {saved ? '✓ 已儲存' : '儲存'}
        </button>
      </div>

      {/* Google Apps Script */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-5">
        <h3 className="font-semibold text-gray-700 mb-1">Google Apps Script URL</h3>
        <p className="text-xs text-gray-400 mb-3">用於從 Google Sheet「個案資料管理」同步個案資料</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={settings.appsScriptUrl}
            onChange={e => updateSettings({ appsScriptUrl: e.target.value })}
            placeholder="https://script.google.com/macros/s/.../exec"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
          />
          <button
            onClick={handleTestSync}
            disabled={testing}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors whitespace-nowrap"
          >
            {testing ? '測試中...' : '🔌 測試連線'}
          </button>
        </div>
        {testResult && (
          <p className={`text-sm mt-2 ${testResult.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
            {testResult}
          </p>
        )}
        <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg p-4 text-sm text-amber-700">
          <p className="font-medium mb-1">📋 設定步驟</p>
          <ol className="space-y-1 text-xs">
            <li>1. 開啟 Google Sheet「個案資料管理」</li>
            <li>2. 點選「擴充功能」→「Apps Script」</li>
            <li>3. 複製 <code className="bg-amber-100 px-1 rounded">google-apps-script/Code.gs</code> 的程式碼貼入</li>
            <li>4. 修改 <code className="bg-amber-100 px-1 rounded">SHEET_NAME</code> 為您的工作表名稱</li>
            <li>5. 「部署」→「新增部署作業」→「網頁應用程式」</li>
            <li>6. 執行身分：「我」；存取：「所有人」→ 部署</li>
            <li>7. 複製網址貼到上方</li>
          </ol>
        </div>
      </div>

      {/* Claude API Key */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-5">
        <h3 className="font-semibold text-gray-700 mb-1">Claude API Key</h3>
        <p className="text-xs text-gray-400 mb-3">用於 AI 產生電訪和家訪內容。金鑰儲存於瀏覽器本地，不會上傳。</p>
        <input
          type="password"
          value={settings.claudeApiKey}
          onChange={e => updateSettings({ claudeApiKey: e.target.value })}
          placeholder="sk-ant-..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
        />
        <p className="text-xs text-gray-400 mt-2">
          到 <span className="font-medium">console.anthropic.com</span> 申請 API Key（需信用卡，約 $5 可用數百次）
        </p>
      </div>

      {/* Sentence Management */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 mb-4">電訪句型管理</h3>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-gray-600 mb-2">新增句型</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSentence.category}
              onChange={e => setNewSentence(prev => ({ ...prev, category: e.target.value }))}
              placeholder="分類"
              list="cat-list"
              className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
            />
            <datalist id="cat-list">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
            <input
              type="text"
              value={newSentence.text}
              onChange={e => setNewSentence(prev => ({ ...prev, text: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAddSentence()}
              placeholder="句型內容"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#52b788]"
            />
            <button
              onClick={handleAddSentence}
              className="px-4 py-2 bg-[#2d6a4f] text-white rounded-lg text-sm hover:bg-[#1b4332] transition-colors"
            >
              新增
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {categories.map(cat => (
            <div key={cat}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{cat}</p>
              <div className="space-y-1">
                {sentences.filter(s => s.category === cat).map(s => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg group">
                    <p className="flex-1 text-sm text-gray-700">{s.text}</p>
                    <button
                      onClick={() => deleteSentence(s.id)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition-opacity px-2"
                    >
                      刪除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
FILEOF_APP_SETTINGS_PAGE_TSX

# ── app/api/generate/route.ts ──
cat > app/api/generate/route.ts << 'FILEOF_APP_API_GENERATE_ROUTE_TS'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { prompt, apiKey } = body

  const key = process.env.ANTHROPIC_API_KEY || apiKey
  if (!key) {
    return NextResponse.json(
      { error: '請先設定 Claude API Key（設定頁面或 Vercel 環境變數 ANTHROPIC_API_KEY）' },
      { status: 400 }
    )
  }

  try {
    const client = new Anthropic({ apiKey: key })
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const block = message.content[0]
    if (block.type !== 'text') {
      return NextResponse.json({ error: 'AI 回應格式錯誤' }, { status: 500 })
    }

    return NextResponse.json({ content: block.text })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI 產生失敗'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
FILEOF_APP_API_GENERATE_ROUTE_TS

# ── app/api/sync/route.ts ──
cat > app/api/sync/route.ts << 'FILEOF_APP_API_SYNC_ROUTE_TS'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: '缺少 Apps Script URL' }, { status: 400 })
  }

  try {
    const apiUrl = `${url}?action=getCasesOnly`
    const res = await fetch(apiUrl, { redirect: 'follow', cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = await res.json()
    if (!json.ok) throw new Error(json.error || 'Apps Script 回傳錯誤')

    return NextResponse.json(json.data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '同步失敗'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
FILEOF_APP_API_SYNC_ROUTE_TS

# ── google-apps-script/Code.gs ──
cat > google-apps-script/Code.gs << 'FILEOF_GOOGLE-APPS-SCRIPT_CODE_GS'
// ====================================================
// 個案管理系統 - Google Apps Script
// 用途：讓 Next.js 網站可從 Google Sheet 同步個案資料
// ====================================================
// 使用說明：
// 1. 開啟 Google Sheet「個案資料管理」
// 2. 點選「擴充功能」→「Apps Script」
// 3. 貼上此程式碼，修改下方 SHEET_NAME
// 4. 部署 → 新增部署作業 → 網頁應用程式
//    執行身分：「我」，存取：「所有人」
// 5. 複製網址到系統設定
// ====================================================

const SHEET_NAME = '個案資料管理'; // ← 修改為您的工作表名稱

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'getCasesOnly';
  try {
    let result;
    if (action === 'getCasesOnly') {
      result = { cases: getCases() };
    } else {
      throw new Error('Unknown action: ' + action);
    }
    return output({ ok: true, data: result });
  } catch (err) {
    return output({ ok: false, error: err.message });
  }
}

function getCases() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(function(h) { return String(h).trim(); });
  const rows = data.slice(1);

  // 欄位對應（支援各種中文欄位名稱）
  const FIELD_MAP = {
    '姓名': 'name', '個案姓名': 'name',
    '個案編號': 'caseNumber', '編號': 'caseNumber',
    '電話': 'phone', '聯絡電話': 'phone', '手機': 'phone',
    '地址': 'address', '居住地址': 'address',
    '生日': 'birthDate', '出生日期': 'birthDate', '生日（西元）': 'birthDate',
    '身分證': 'idNumber', '身分證字號': 'idNumber', '證號': 'idNumber',
    '狀態': 'status', '在案狀態': 'status', '個案狀態': 'status',
    '開案日期': 'startDate', '開案': 'startDate',
    '照顧等級': 'careLevel', '長照等級': 'careLevel', '失能等級': 'careLevel',
    '失能狀況': 'disability', '失能': 'disability',
    '主要照顧者': 'guardian', '照顧者': 'guardian', '家屬': 'guardian',
    '照顧者電話': 'guardianPhone', '家屬電話': 'guardianPhone',
    '服務項目': 'services', '使用服務': 'services', '服務': 'services',
    '備註': 'notes', '注意事項': 'notes',
  };

  const STATUS_MAP = {
    '在案': 'active', '服務中': 'active', 'active': 'active',
    '暫停': 'suspended', '暫停服務': 'suspended', 'suspended': 'suspended',
    '結案': 'closed', '已結案': 'closed', 'closed': 'closed',
  };

  return rows
    .filter(function(row) { return row[0] && String(row[0]).trim(); })
    .map(function(row, idx) {
      const obj = { id: String(idx + 1), status: 'active', services: [] };
      headers.forEach(function(h, i) {
        const field = FIELD_MAP[h];
        if (!field) return;
        const val = String(row[i] !== null && row[i] !== undefined ? row[i] : '').trim();
        if (field === 'status') {
          obj.status = STATUS_MAP[val] || 'active';
        } else if (field === 'services') {
          obj.services = val ? val.split(/[,、，；;]/).map(function(s) { return s.trim(); }).filter(Boolean) : [];
        } else {
          obj[field] = val;
        }
      });
      return obj;
    });
}

function output(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
FILEOF_GOOGLE-APPS-SCRIPT_CODE_GS

echo ""
echo "✅ 全部完成！接下來執行："
echo "  git add ."
echo "  git commit -m 'rebuild as Next.js case management'"
echo "  git push origin main"
