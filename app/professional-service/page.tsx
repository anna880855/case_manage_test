'use client'
import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import type { ProfessionalServiceRecord, ProfessionalServiceStatus } from '@/lib/types'
import { getServicePeriodProgress, SERVICE_PERIOD_REMINDER_THRESHOLD } from '@/lib/types'

const STATUS_LABELS: Record<ProfessionalServiceStatus, string> = {
  active: '進行中',
  completed: '已完成',
  stopped: '已中止',
}
const STATUS_COLORS: Record<ProfessionalServiceStatus, string> = {
  active: 'bg-[#dce8de] text-[#607a68]',
  completed: 'bg-gray-100 text-gray-500',
  stopped: 'bg-red-50 text-red-500',
}
const STATUS_ORDER: ProfessionalServiceStatus[] = ['active', 'completed', 'stopped']

function ProfessionalServiceContent() {
  const searchParams = useSearchParams()
  const {
    cases,
    professionalServices,
    serviceReminderDismissed,
    addProfessionalService,
    updateProfessionalService,
    deleteProfessionalService,
    getProfessionalServicesByCase,
    dismissServiceReminder,
  } = useStore()

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const todayStr = new Date().toISOString().split('T')[0]
  const activeCases = cases.filter(c => c.status !== 'closed')

  const [caseSearch, setCaseSearch] = useState('')
  const [selectedCaseId, setSelectedCaseId] = useState(searchParams.get('caseId') || '')
  const selectedCase = cases.find(c => c.id === selectedCaseId)

  const filteredCases = useMemo(() => {
    const q = caseSearch.trim().toLowerCase()
    if (!q) return activeCases
    return activeCases.filter(c =>
      c.name.includes(q) || (c.caseNumber || '').includes(q) || (c.phone || '').includes(q)
    )
  }, [activeCases, caseSearch])

  // ── form state
  const [serviceName, setServiceName] = useState('')
  const [goal, setGoal] = useState('')
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState('')
  const [plannedSessions, setPlannedSessions] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const resetForm = () => {
    setServiceName('')
    setGoal('')
    setStartDate(todayStr)
    setEndDate('')
    setPlannedSessions('')
    setNotes('')
    setError('')
  }

  const handleSelectCase = (id: string) => {
    setSelectedCaseId(id)
    setCaseSearch('')
    resetForm()
  }

  const records = selectedCaseId ? getProfessionalServicesByCase(selectedCaseId) : []

  // 期程進度達 2/3 且尚未結案的提醒
  const dueReminders = useMemo(() => {
    return professionalServices.filter(r => {
      if (r.status !== 'active') return false
      if (serviceReminderDismissed[r.id]) return false
      const progress = getServicePeriodProgress(r)
      return progress !== null && progress >= SERVICE_PERIOD_REMINDER_THRESHOLD
    })
  }, [professionalServices, serviceReminderDismissed])

  const handleSave = () => {
    if (!selectedCase) { setError('請選擇個案'); return }
    if (!serviceName.trim()) { setError('請填寫服務項目'); return }
    if (!startDate || !endDate) { setError('請填寫計劃期程起訖日期'); return }
    if (endDate < startDate) { setError('結束日期不可早於起始日期'); return }
    const record: ProfessionalServiceRecord = {
      id: Date.now().toString(),
      caseId: selectedCase.id,
      caseName: selectedCase.name,
      serviceName: serviceName.trim(),
      goal: goal.trim(),
      startDate,
      endDate,
      plannedSessions: Number(plannedSessions) || 0,
      completedSessions: 0,
      status: 'active',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    }
    addProfessionalService(record)
    resetForm()
  }

  const handleDelete = (id: string) => {
    if (!confirm('確定要刪除這筆專業服務追蹤紀錄嗎？')) return
    deleteProfessionalService(id)
  }

  if (!mounted) return <div className="text-center py-20 text-gray-400 text-sm">載入中...</div>

  return (
    <div className="max-w-6xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">專業服務追蹤</h2>

      {dueReminders.length > 0 && (
        <div className="mb-4 bg-[#fdf2e3] border border-[#e8c79a] rounded-xl px-4 py-3">
          <p className="text-sm font-medium text-[#8a5a1f] mb-2">⚠️ 計劃期程已達 2/3，請留意服務進度與後續安排</p>
          <div className="space-y-1.5">
            {dueReminders.map(r => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <button
                  onClick={() => handleSelectCase(r.caseId)}
                  className="text-[#8a5a1f] hover:underline text-left"
                >
                  {r.caseName}－{r.serviceName}（期程：{r.startDate} ～ {r.endDate}，已完成 {r.completedSessions}
                  {r.plannedSessions ? `/${r.plannedSessions}` : ''} 次）
                </button>
                <button
                  onClick={() => dismissServiceReminder(r.id)}
                  className="text-xs text-[#8a5a1f]/70 hover:text-[#8a5a1f] px-2 py-0.5 rounded border border-[#e8c79a] hover:bg-[#f5e2c2] flex-shrink-0 ml-3"
                >
                  知道了
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-[280px,1fr] gap-6">
        {/* ── 左側 ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">選擇個案</label>
            <input
              type="text"
              placeholder="搜尋姓名 / 編號…"
              value={caseSearch}
              onChange={e => setCaseSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
            />
            <div className="max-h-52 overflow-y-auto space-y-0.5">
              {filteredCases.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSelectCase(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCaseId === c.id
                      ? 'bg-[#e6ede7] text-[#7a9985] font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="font-medium">{c.name}</div>
                  {c.caseNumber && <div className="text-xs text-gray-400">{c.caseNumber}</div>}
                </button>
              ))}
              {filteredCases.length === 0 && (
                <p className="text-sm text-gray-400 px-3 py-2">找不到個案</p>
              )}
            </div>
          </div>

          {selectedCase && (
            <div className="bg-[#e6ede7] rounded-xl p-4">
              <p className="font-semibold text-[#7a9985]">{selectedCase.name}</p>
              {selectedCase.caseNumber && (
                <p className="text-xs text-[#7a9985]/70 mt-0.5">編號：{selectedCase.caseNumber}</p>
              )}
              {records.length > 0 && (
                <p className="text-xs text-[#7a9985]/50 mt-1.5">共 {records.length} 筆追蹤紀錄</p>
              )}
            </div>
          )}

          {selectedCase && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">追蹤紀錄</p>
              {records.length === 0 ? (
                <p className="text-xs text-gray-400">尚無專業服務追蹤紀錄</p>
              ) : (
                <div className="space-y-3">
                  {records.map(r => (
                    <ServiceHistoryItem
                      key={r.id}
                      record={r}
                      onChange={fields => updateProfessionalService(r.id, fields)}
                      onDelete={() => handleDelete(r.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 右側：新增表單 ── */}
        <div className="min-w-0 space-y-4">
          {!selectedCase ? (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
              請先從左側選擇個案
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">服務項目</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={e => setServiceName(e.target.value)}
                  placeholder="例：職能治療、物理治療、營養衛教…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
                />
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">服務目標</label>
                <textarea
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  rows={3}
                  placeholder="請描述此次專業服務欲達成之目標…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa] resize-none"
                />
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-3 gap-4">
                <div className="col-span-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">計劃期程起</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">計劃期程迄</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">規劃次數</label>
                  <input
                    type="number"
                    min={0}
                    value={plannedSessions}
                    onChange={e => setPlannedSessions(e.target.value)}
                    placeholder="次"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">備註</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="其他補充說明…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa] resize-none"
                />
              </div>

              {error && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700">
                  ⚠ {error}
                </div>
              )}

              <button
                onClick={handleSave}
                className="w-full py-3 bg-[#7a9985] text-white rounded-xl font-semibold hover:bg-[#50665b] transition-colors"
              >
                新增追蹤紀錄
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ServiceHistoryItem({ record, onChange, onDelete }: {
  record: ProfessionalServiceRecord
  onChange: (fields: Partial<ProfessionalServiceRecord>) => void
  onDelete: () => void
}) {
  const [notes, setNotes] = useState(record.notes)
  useEffect(() => { setNotes(record.notes) }, [record.notes])

  const progress = getServicePeriodProgress(record)
  const isDue = record.status === 'active' && progress !== null && progress >= SERVICE_PERIOD_REMINDER_THRESHOLD
  const sessionPct = record.plannedSessions > 0
    ? Math.min(100, Math.round((record.completedSessions / record.plannedSessions) * 100))
    : null

  return (
    <div className={`border rounded-lg p-3 ${isDue ? 'bg-[#fdf2e3] border-[#e8c79a]' : 'bg-gray-50 border-gray-100'}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-gray-700 font-medium">{record.serviceName}</p>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[record.status]}`}>
          {STATUS_LABELS[record.status]}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-2">{record.startDate} ～ {record.endDate}</p>

      {record.goal && <p className="text-xs text-gray-600 mb-2 whitespace-pre-wrap">🎯 {record.goal}</p>}

      {progress !== null && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-0.5">
            <span>期程進度</span>
            <span className={isDue ? 'text-[#8a5a1f] font-medium' : ''}>{Math.round(progress * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${isDue ? 'bg-[#d99b3f]' : 'bg-[#a3bcaa]'}`}
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500">
          已完成次數：{record.completedSessions}{record.plannedSessions ? ` / ${record.plannedSessions}` : ''}
          {sessionPct !== null && <span className="text-gray-400">（{sessionPct}%）</span>}
        </p>
        <div className="flex gap-1">
          <button
            onClick={() => onChange({ completedSessions: Math.max(0, record.completedSessions - 1) })}
            className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-white transition-colors"
          >
            －
          </button>
          <button
            onClick={() => onChange({ completedSessions: record.completedSessions + 1 })}
            className="w-6 h-6 flex items-center justify-center rounded border border-[#a3bcaa] text-[#7a9985] hover:bg-white transition-colors"
          >
            ＋
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {STATUS_ORDER.map(s => (
          <button
            key={s}
            onClick={() => onChange({ status: s })}
            className={`px-2 py-0.5 text-xs rounded-lg border transition-colors ${
              record.status === s
                ? 'bg-[#7a9985] text-white border-[#7a9985]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#a3bcaa]'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={() => notes !== record.notes && onChange({ notes })}
        placeholder="備註"
        className="w-full px-2 py-1 border border-gray-200 rounded text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]"
      />

      <button onClick={onDelete} className="text-xs text-red-400 border border-red-100 rounded px-2 py-1 hover:bg-red-50 transition-colors">
        刪除
      </button>
    </div>
  )
}

export default function ProfessionalServicePage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400 text-sm">載入中...</div>}>
      <ProfessionalServiceContent />
    </Suspense>
  )
}
