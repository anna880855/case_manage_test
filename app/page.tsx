'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import type { Case } from '@/lib/types'

const STATUS_LABEL: Record<string, string> = {
  active: '在案',
  suspended: '暫停',
  closed: '結案',
}

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-[#dce8de] text-[#607a68]',
  suspended: 'bg-[#ede9d8] text-[#7a7048]',
  closed: 'bg-gray-100 text-gray-500',
}

const STATUS_FILTERS = [
  { value: 'active', label: '在案' },
  { value: 'suspended', label: '暫停' },
  { value: 'closed', label: '結案' },
  { value: 'all', label: '全部' },
]

type VisitFilter = 'all' | 'no-phone' | 'no-home'

function useVisitStatus(c: Case) {
  const { phoneVisits, homeVisits } = useStore()
  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth()
  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const isThisMonth = (raw?: string) => {
    if (!raw) return false
    const d = new Date(raw)
    return !isNaN(d.getTime()) && d.getFullYear() === thisYear && d.getMonth() === thisMonth
  }

  const hasPhoneThisMonth = isThisMonth(c.lastPhoneVisitDate) || isThisMonth(c.lastHomeVisitDate) ||
    phoneVisits.some(v => v.caseId === c.id && isThisMonth(v.date)) ||
    homeVisits.some(v => v.caseId === c.id && isThisMonth(v.date))

  const isWithinSixMonths = (raw?: string) => {
    if (!raw) return false
    const d = new Date(raw)
    return !isNaN(d.getTime()) && d >= sixMonthsAgo
  }

  const hasHomeInSixMonths = isWithinSixMonths(c.lastHomeVisitDate) ||
    homeVisits.some(v => v.caseId === c.id && isWithinSixMonths(v.date))

  return { hasPhoneThisMonth, hasHomeInSixMonths }
}

const EMPTY_FORM = {
  name: '', caseNumber: '', phone: '', address: '',
  careLevel: '', guardian: '', guardianPhone: '',
  birthDate: '', disability: '', disabilityExpiry: '', idNumber: '', gender: '', notes: '',
  status: 'active' as Case['status'],
}

function Field({ label, field, value, onChange, placeholder = '', type = 'text' }: { label: string; field: string; value: string; onChange: (field: string, value: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(field, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
      />
    </div>
  )
}

function NewCaseModal({ onClose }: { onClose: () => void }) {
  const { addCase, settings } = useStore()
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [pendingCase, setPendingCase] = useState<Case | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handlePdfUpload = async (file: File) => {
    if (!settings.claudeApiKey) { setParseError('請先在「設定」頁面填入 Claude API Key'); return }
    setParsing(true)
    setParseError('')
    try {
      const buffer = await file.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const res = await fetch('/api/parse-case-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: settings.claudeApiKey, base64 }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setForm(prev => ({
        ...prev,
        name: data.fields.name || prev.name,
        idNumber: data.fields.idNumber || prev.idNumber,
        phone: data.fields.phone || prev.phone,
        address: data.fields.address || prev.address,
        birthDate: data.fields.birthDate || prev.birthDate,
        gender: data.fields.gender || prev.gender,
        careLevel: data.fields.careLevel || prev.careLevel,
        disability: data.fields.disability || prev.disability,
        disabilityExpiry: data.fields.disabilityExpiry || prev.disabilityExpiry,
        guardian: data.fields.guardian || prev.guardian,
        guardianPhone: data.fields.guardianPhone || prev.guardianPhone,
        notes: data.fields.notes || prev.notes,
      }))
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : 'PDF 解析失敗')
    } finally {
      setParsing(false)
    }
  }

  const handleSubmit = async () => {
    if (!pendingCase && !form.name.trim()) return
    setSaving(true)
    setSyncError('')
    const newCase: Case = pendingCase || {
      id: Date.now().toString(),
      name: form.name.trim(),
      caseNumber: form.caseNumber.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      birthDate: form.birthDate,
      idNumber: form.idNumber.trim(),
      gender: form.gender.trim(),
      status: form.status,
      careLevel: form.careLevel.trim(),
      disability: form.disability.trim(),
      disabilityExpiry: form.disabilityExpiry.trim(),
      guardian: form.guardian.trim(),
      guardianPhone: form.guardianPhone.trim(),
      notes: form.notes.trim(),
      services: [],
    }
    if (!pendingCase) {
      addCase(newCase)
      setPendingCase(newCase)
    }
    if (settings.appsScriptUrl) {
      try {
        const res = await fetch('/api/update-case', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appsScriptUrl: settings.appsScriptUrl,
            action: 'createCase',
            fields: newCase,
          }),
        })
        const data = await res.json()
        if (data.synced === false) {
          setSaving(false)
          setSyncError(data.error || '同步失敗，個案已存於本機但尚未寫入 Google Sheet')
          return
        }
      } catch (e: unknown) {
        setSaving(false)
        setSyncError(e instanceof Error ? e.message : '同步失敗，個案已存於本機但尚未寫入 Google Sheet')
        return
      }
    }
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">新增個案</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <label className="block text-xs font-medium text-gray-600 mb-2">📄 上傳照管中心評估量表 PDF，自動填寫個案資料</label>
            <input
              type="file"
              accept="application/pdf"
              disabled={parsing}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handlePdfUpload(file)
                e.target.value = ''
              }}
              className="block w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#7a9985] file:text-white hover:file:bg-[#6b8a76] file:cursor-pointer disabled:opacity-50"
            />
            {parsing && <p className="text-xs text-gray-500 mt-2">解析中，請稍候...</p>}
            {parseError && <p className="text-xs text-red-500 mt-2">⚠ {parseError}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">姓名 <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="請輸入個案姓名"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
                autoFocus
              />
            </div>
            <Field label="個案編號" field="caseNumber" value={form.caseNumber} onChange={set} placeholder="選填" />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">狀態</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
              >
                <option value="active">在案</option>
                <option value="suspended">暫停</option>
                <option value="closed">結案</option>
              </select>
            </div>
            <Field label="身分證字號" field="idNumber" value={form.idNumber} onChange={set} placeholder="選填" />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">性別</label>
              <select
                value={form.gender}
                onChange={e => set('gender', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
              >
                <option value="">未填</option>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </div>
            <Field label="電話" field="phone" value={form.phone} onChange={set} placeholder="選填" />
            <Field label="生日" field="birthDate" value={form.birthDate} onChange={set} type="date" />
            <div className="col-span-2">
              <Field label="地址" field="address" value={form.address} onChange={set} placeholder="選填" />
            </div>
            <Field label="照顧等級" field="careLevel" value={form.careLevel} onChange={set} placeholder="例：第三級" />
            <Field label="身心障礙" field="disability" value={form.disability} onChange={set} placeholder="選填" />
            <Field label="身障重新鑑定日" field="disabilityExpiry" value={form.disabilityExpiry} onChange={set} type="date" />
            <Field label="主要照顧者" field="guardian" value={form.guardian} onChange={set} placeholder="選填" />
            <Field label="照顧者電話" field="guardianPhone" value={form.guardianPhone} onChange={set} placeholder="選填" />
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">備註</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={2}
                placeholder="選填"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa] resize-none"
              />
            </div>
          </div>
        </div>

        {syncError && (
          <div className="px-6 pb-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              ⚠ 個案已存於本機，但同步至 Google Sheet 失敗：{syncError}
            </div>
          </div>
        )}

        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {syncError ? '關閉' : '取消'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.name.trim() || saving}
            className="flex-1 py-2.5 bg-[#7a9985] text-white rounded-xl text-sm font-medium hover:bg-[#6b8a76] disabled:opacity-40 transition-colors"
          >
            {saving ? '儲存中...' : syncError ? '重試同步' : '新增個案'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { cases, phoneVisits, homeVisits, disabilityReminderDismissed, dismissDisabilityReminder } = useStore()
  const [mounted, setMounted] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [visitFilter, setVisitFilter] = useState<VisitFilter>('all')
  const [showNewCase, setShowNewCase] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth()
  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const oneMonthLater = new Date(now)
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1)
  const inReminderWindow = now.getDate() >= 5 && now.getDate() <= 10
  const reminderPeriodKey = `${thisYear}-${thisMonth}`

  const activeCases = useMemo(() => cases.filter(c => c.status === 'active'), [cases])

  const expiringDisabilityCases = useMemo(() => {
    if (!inReminderWindow) return []
    return activeCases.filter(c => {
      if (!c.disabilityExpiry) return false
      const d = new Date(c.disabilityExpiry)
      if (isNaN(d.getTime())) return false
      if (d < now || d > oneMonthLater) return false
      return disabilityReminderDismissed[c.id] !== reminderPeriodKey
    })
  }, [activeCases, inReminderWindow, reminderPeriodKey, disabilityReminderDismissed]) // eslint-disable-line react-hooks/exhaustive-deps

  const isThisMonth = (raw?: string) => {
    if (!raw) return false
    const d = new Date(raw)
    return !isNaN(d.getTime()) && d.getFullYear() === thisYear && d.getMonth() === thisMonth
  }
  const isWithinSixMonths = (raw?: string) => {
    if (!raw) return false
    const d = new Date(raw)
    return !isNaN(d.getTime()) && d >= sixMonthsAgo
  }

  const noPhoneThisMonth = useMemo(() => activeCases.filter(c => {
    if (isThisMonth(c.lastPhoneVisitDate) || isThisMonth(c.lastHomeVisitDate)) return false
    const visitedThisMonth = (v: { caseId: string; date: string }) => v.caseId === c.id && isThisMonth(v.date)
    return !phoneVisits.some(visitedThisMonth) && !homeVisits.some(visitedThisMonth)
  }), [activeCases, phoneVisits, homeVisits, thisYear, thisMonth])

  const noHomeInSixMonths = useMemo(() => activeCases.filter(c => {
    if (isWithinSixMonths(c.lastHomeVisitDate)) return false
    return !homeVisits.some(v => v.caseId === c.id && isWithinSixMonths(v.date))
  }), [activeCases, homeVisits, sixMonthsAgo])

  const counts = useMemo(() => ({
    active: cases.filter(c => c.status === 'active').length,
    suspended: cases.filter(c => c.status === 'suspended').length,
    closed: cases.filter(c => c.status === 'closed').length,
  }), [cases])

  const filtered = useMemo(() => {
    let pool = cases
    if (visitFilter === 'no-phone') pool = noPhoneThisMonth
    else if (visitFilter === 'no-home') pool = noHomeInSixMonths
    else pool = cases.filter(c => statusFilter === 'all' || c.status === statusFilter)

    const q = search.trim().toLowerCase()
    if (!q) return pool
    return pool.filter(c =>
      c.name.includes(q) ||
      (c.caseNumber || '').includes(q) ||
      (c.phone || '').includes(q) ||
      (c.address || '').toLowerCase().includes(q)
    )
  }, [cases, search, statusFilter, visitFilter, noPhoneThisMonth, noHomeInSixMonths])

  if (!mounted) return <div className="text-center py-20 text-gray-400 text-sm">載入中...</div>

  return (
    <div>
      {showNewCase && <NewCaseModal onClose={() => setShowNewCase(false)} />}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">個案列表</h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-sm">
            <span className="px-3 py-1 bg-[#dce8de] text-[#607a68] rounded-full font-medium">在案 {counts.active}</span>
            <span className="px-3 py-1 bg-[#ede9d8] text-[#7a7048] rounded-full font-medium">暫停 {counts.suspended}</span>
            <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full font-medium">結案 {counts.closed}</span>
          </div>
          <button
            onClick={() => setShowNewCase(true)}
            className="px-4 py-2 bg-[#7a9985] text-white rounded-xl text-sm font-medium hover:bg-[#6b8a76] transition-colors"
          >
            ＋ 新增個案
          </button>
        </div>
      </div>

      {/* 待訪視提醒 */}
      {cases.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setVisitFilter(v => v === 'no-phone' ? 'all' : 'no-phone')}
            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
              visitFilter === 'no-phone'
                ? 'bg-red-50 border-red-200 ring-2 ring-red-200'
                : 'bg-white border-gray-100 hover:border-red-200'
            }`}
          >
            <div className="text-left">
              <p className="text-xs text-gray-500">本月未電訪</p>
              <p className="text-2xl font-bold text-[#b87c7c]">{noPhoneThisMonth.length}</p>
              <p className="text-xs text-gray-400">位在案個案</p>
            </div>
            <span className="text-2xl">📞</span>
          </button>
          <button
            onClick={() => setVisitFilter(v => v === 'no-home' ? 'all' : 'no-home')}
            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
              visitFilter === 'no-home'
                ? 'bg-orange-50 border-orange-200 ring-2 ring-orange-200'
                : 'bg-white border-gray-100 hover:border-orange-200'
            }`}
          >
            <div className="text-left">
              <p className="text-xs text-gray-500">6個月未家訪</p>
              <p className="text-2xl font-bold text-[#b8956a]">{noHomeInSixMonths.length}</p>
              <p className="text-xs text-gray-400">位在案個案</p>
            </div>
            <span className="text-2xl">🏠</span>
          </button>
        </div>
      )}

      {expiringDisabilityCases.length > 0 && (
        <div className="mb-4 bg-[#fdf2e3] border border-[#e8c79a] rounded-xl px-4 py-3">
          <p className="text-sm font-medium text-[#8a5a1f] mb-2">⚠️ 身障證明即將過期提醒（1個月內到期）</p>
          <div className="space-y-1.5">
            {expiringDisabilityCases.map(c => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <Link href={`/cases/${c.id}`} className="text-[#8a5a1f] hover:underline">
                  {c.name}（編號 {c.caseNumber || '－'}）－ 到期日：{c.disabilityExpiry}
                </Link>
                <button
                  onClick={() => dismissDisabilityReminder(c.id, reminderPeriodKey)}
                  className="text-xs text-[#8a5a1f]/70 hover:text-[#8a5a1f] px-2 py-0.5 rounded border border-[#e8c79a] hover:bg-[#f5e2c2]"
                >
                  知道了
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="搜尋姓名、個案編號、電話、地址..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa] bg-white"
        />
        {visitFilter === 'all' && (
          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  statusFilter === f.value
                    ? 'bg-[#7a9985] text-white font-medium'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
        {visitFilter !== 'all' && (
          <button
            onClick={() => setVisitFilter('all')}
            className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            ✕ 清除篩選
          </button>
        )}
      </div>

      {visitFilter !== 'all' && (
        <div className={`mb-3 px-4 py-2 rounded-lg text-sm font-medium ${
          visitFilter === 'no-phone' ? 'bg-[#f0e6e6] text-[#9b6464]' : 'bg-[#f0ebe0] text-[#9b7a50]'
        }`}>
          {visitFilter === 'no-phone' ? `📞 本月（${thisMonth + 1}月）尚未電訪的在案個案` : '🏠 近6個月尚未家訪的在案個案'}
          {' '}共 {filtered.length} 位
        </div>
      )}

      {cases.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-5xl mb-4">☁️</p>
          <p className="text-lg font-medium mb-1">尚無個案資料</p>
          <p className="text-sm">點擊右上角「新增個案」手動新增，或按左側「同步個案」從 Google Sheet 載入</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>{search ? `找不到符合「${search}」的個案` : '所有個案均已完成訪視'}</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map(c => <CaseRow key={c.id} case_={c} visitFilter={visitFilter} />)}
        </div>
      )}
    </div>
  )
}

function CaseRow({ case_: c, visitFilter }: { case_: Case; visitFilter: VisitFilter }) {
  const { hasPhoneThisMonth, hasHomeInSixMonths } = useVisitStatus(c)

  return (
    <Link
      href={`/cases/${c.id}`}
      className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 px-5 py-3.5 hover:shadow-md hover:border-[#a3bcaa]/40 transition-all group"
    >
      <div className="w-9 h-9 rounded-full bg-[#e6ede7] flex items-center justify-center text-[#7a9985] font-bold text-sm flex-shrink-0">
        {c.name?.[0] || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-800 group-hover:text-[#7a9985] transition-colors">{c.name}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[c.status] || STATUS_COLOR.active}`}>
            {STATUS_LABEL[c.status] || '在案'}
          </span>
          {c.status === 'active' && !hasPhoneThisMonth && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#f0e6e6] text-[#9b6464]">未電訪</span>
          )}
          {c.status === 'active' && !hasHomeInSixMonths && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#f0ebe0] text-[#9b7a50]">未家訪</span>
          )}
        </div>
        <div className="flex gap-4 mt-0.5 text-sm text-gray-400">
          {c.caseNumber && <span>編號 {c.caseNumber}</span>}
          {c.careLevel && <span>等級 {c.careLevel}</span>}
          {c.guardian && <span>照顧者 {c.guardian}</span>}
        </div>
        {c.notes && (
          <p className="mt-1 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 truncate">
            📌 {c.notes}
          </p>
        )}
      </div>
      <div className="text-right text-sm text-gray-400 flex-shrink-0 hidden sm:block">
        {c.phone && <div>{c.phone}</div>}
        {c.address && <div className="truncate max-w-[180px] text-xs mt-0.5">{c.address}</div>}
      </div>
      <span className="text-gray-300 group-hover:text-[#7a9985] transition-colors text-lg">›</span>
    </Link>
  )
}
