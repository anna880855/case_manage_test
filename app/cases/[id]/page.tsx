'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import type { Case } from '@/lib/types'

const STATUS_OPTIONS: { value: Case['status']; label: string; color: string }[] = [
  { value: 'active', label: '在案', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'suspended', label: '暫停', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'closed', label: '結案', color: 'bg-gray-100 text-gray-500 border-gray-200' },
]

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { getCaseById, getPhoneVisitsByCase, getHomeVisitsByCase, updateCaseStatus, updateCase, deleteCase, settings } = useStore()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const c = getCaseById(params.id)
  const phoneVisits = getPhoneVisitsByCase(params.id)
  const homeVisits = getHomeVisitsByCase(params.id)
  const [syncMsg, setSyncMsg] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [editing, setEditing] = useState(false)
  const [editFields, setEditFields] = useState<Partial<Case>>({})
  const [saving, setSaving] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')

  if (!mounted) return <div className="text-center py-20 text-gray-400 text-sm">載入中...</div>

  if (!c) {
    return (
      <div className="text-center py-24 text-gray-400">
        <p className="text-4xl mb-3">🔍</p>
        <p className="mb-4">找不到此個案</p>
        <Link href="/" className="text-[#7a9985] hover:underline">← 返回列表</Link>
      </div>
    )
  }

  const currentStatus = STATUS_OPTIONS.find(s => s.value === c.status) || STATUS_OPTIONS[0]

  const startEditing = () => {
    setEditFields({
      name: c.name,
      caseNumber: c.caseNumber,
      phone: c.phone,
      address: c.address,
      birthDate: c.birthDate,
      idNumber: c.idNumber,
      gender: c.gender || '',
      careLevel: c.careLevel,
      disability: c.disability,
      disabilityExpiry: c.disabilityExpiry || '',
      guardian: c.guardian,
      guardianPhone: c.guardianPhone,
      lastHomeVisitDate: c.lastHomeVisitDate || '',
      notes: c.notes,
      shortGoal: c.shortGoal || '',
      midGoal: c.midGoal || '',
      longGoal: c.longGoal || '',
      responsibleWorker: c.responsibleWorker || '',
      services: c.services || [],
    })
    setEditing(true)
  }

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
      setEditFields(prev => ({
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

  const handleEditSave = async () => {
    setSaving(true)
    updateCase(c.id, editFields)
    setSyncMsg('更新中...')
    try {
      const res = await fetch('/api/update-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appsScriptUrl: settings.appsScriptUrl,
          action: 'updateCase',
          caseName: c.name,
          caseNumber: c.caseNumber,
          fields: editFields,
        }),
      })
      const data = await res.json()
      setSyncMsg(data.synced ? '✓ 已同步至 Google Sheet' : '✓ 已更新（未同步 Google Sheet）')
    } catch {
      setSyncMsg('✓ 已更新（未同步 Google Sheet）')
    }
    setSaving(false)
    setEditing(false)
    setTimeout(() => setSyncMsg(''), 4000)
  }

  const handleStatusChange = async (newStatus: Case['status']) => {
    if (newStatus === c.status) return
    updateCaseStatus(c.id, newStatus)
    setSyncMsg('更新中...')
    try {
      const res = await fetch('/api/update-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appsScriptUrl: settings.appsScriptUrl,
          action: 'updateStatus',
          caseName: c.name,
          caseNumber: c.caseNumber,
          status: newStatus,
        }),
      })
      const data = await res.json()
      setSyncMsg(data.synced ? '✓ 已同步至 Google Sheet' : '✓ 已更新（未同步 Google Sheet）')
    } catch {
      setSyncMsg('✓ 已更新（未同步 Google Sheet）')
    }
    setTimeout(() => setSyncMsg(''), 4000)
  }

  const handleDelete = async () => {
    setDeleting(true)
    if (settings.appsScriptUrl) {
      try {
        const res = await fetch('/api/update-case', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appsScriptUrl: settings.appsScriptUrl,
            action: 'deleteCase',
            caseName: c.name,
            caseNumber: c.caseNumber,
          }),
        })
        const data = await res.json()
        if (data.synced === false) {
          setDeleting(false)
          setDeleteError(data.error || '同步失敗，Google Sheet 中的資料未被刪除')
          return
        }
      } catch (e: unknown) {
        setDeleting(false)
        setDeleteError(e instanceof Error ? e.message : '同步失敗，Google Sheet 中的資料未被刪除')
        return
      }
    }
    deleteCase(c.id)
    router.push('/')
  }

  const ef = editFields

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← 返回</Link>
        <div className="w-px h-4 bg-gray-200" />
        <h2 className="text-2xl font-bold text-gray-800">{c.name}</h2>
        <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${currentStatus.color}`}>
          {currentStatus.label}
        </span>
        {syncMsg && <span className="text-xs text-[#7a9985] ml-1">{syncMsg}</span>}
      </div>

      {/* Status change */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex items-center gap-4">
        <span className="text-sm text-gray-500 font-medium">變更狀態：</span>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(opt.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                c.status === opt.value
                  ? opt.color + ' ring-2 ring-offset-1 ring-current'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Edit form */}
      {editing ? (
        <div className="bg-white rounded-xl border border-[#a3bcaa]/40 p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">編輯個案資料</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="px-4 py-1.5 text-sm bg-[#7a9985] text-white rounded-lg hover:bg-[#50665b] disabled:opacity-50"
              >
                {saving ? '儲存中...' : '儲存並同步'}
              </button>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">📄 上傳照管中心評估量表 PDF，自動更新個案資料</label>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">基本資料</p>
              <EditField label="姓名" value={ef.name || ''} onChange={v => setEditFields(p => ({ ...p, name: v }))} />
              <EditField label="個案編號" value={ef.caseNumber || ''} onChange={v => setEditFields(p => ({ ...p, caseNumber: v }))} />
              <EditField label="性別" value={ef.gender || ''} onChange={v => setEditFields(p => ({ ...p, gender: v }))} />
              <EditField label="生日" value={ef.birthDate || ''} onChange={v => setEditFields(p => ({ ...p, birthDate: v }))} />
              <EditField label="身分證" value={ef.idNumber || ''} onChange={v => setEditFields(p => ({ ...p, idNumber: v }))} />
              <EditField label="電話" value={ef.phone || ''} onChange={v => setEditFields(p => ({ ...p, phone: v }))} />
              <EditField label="地址" value={ef.address || ''} onChange={v => setEditFields(p => ({ ...p, address: v }))} />
              <EditField label="負責社工" value={ef.responsibleWorker || ''} onChange={v => setEditFields(p => ({ ...p, responsibleWorker: v }))} />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">照顧資訊</p>
              <EditField label="身障類別" value={ef.disability || ''} onChange={v => setEditFields(p => ({ ...p, disability: v }))} />
              <EditField label="身障期限" value={ef.disabilityExpiry || ''} onChange={v => setEditFields(p => ({ ...p, disabilityExpiry: v }))} />
              <EditField label="照顧等級" value={ef.careLevel || ''} onChange={v => setEditFields(p => ({ ...p, careLevel: v }))} />
              <EditField label="主要照顧者" value={ef.guardian || ''} onChange={v => setEditFields(p => ({ ...p, guardian: v }))} />
              <EditField label="照顧者電話" value={ef.guardianPhone || ''} onChange={v => setEditFields(p => ({ ...p, guardianPhone: v }))} />
              <EditField label="最近家訪日" value={ef.lastHomeVisitDate || ''} onChange={v => setEditFields(p => ({ ...p, lastHomeVisitDate: v }))} />
              <EditField label="短期目標" value={ef.shortGoal || ''} onChange={v => setEditFields(p => ({ ...p, shortGoal: v }))} />
              <EditField label="中期目標" value={ef.midGoal || ''} onChange={v => setEditFields(p => ({ ...p, midGoal: v }))} />
              <EditField label="長期目標" value={ef.longGoal || ''} onChange={v => setEditFields(p => ({ ...p, longGoal: v }))} />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">服務項目（長照服務大項目，供電訪句型篩選使用）</p>
            <div className="flex flex-wrap gap-2">
              {['居家照顧', '日間照顧', '交通車服務', '喘息服務'].map(svc => {
                const checked = (ef.services || []).includes(svc)
                return (
                  <button
                    key={svc}
                    type="button"
                    onClick={() => setEditFields(p => {
                      const cur = p.services || []
                      return { ...p, services: checked ? cur.filter(s => s !== svc) : [...cur, svc] }
                    })}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      checked
                        ? 'bg-[#7a9985] text-white border-[#7a9985]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#a3bcaa]'
                    }`}
                  >
                    {svc}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">備註</p>
            <div>
              <textarea
                value={ef.notes || ''}
                onChange={e => setEditFields(p => ({ ...p, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
                <h3 className="font-semibold text-gray-700">基本資料</h3>
              </div>
              <dl className="space-y-2.5">
                <InfoRow label="個案編號" value={c.caseNumber} />
                <InfoRow label="性別" value={c.gender} />
                <InfoRow label="生日" value={c.birthDate} />
                <InfoRow label="身分證" value={c.idNumber} />
                <InfoRow label="電話" value={c.phone} />
                <InfoRow label="地址" value={c.address} />
                <InfoRow label="負責社工" value={c.responsibleWorker} />
              </dl>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-50">照顧資訊</h3>
              <dl className="space-y-2.5">
                <InfoRow label="身障類別" value={c.disability} />
                <InfoRow label="身障期限" value={c.disabilityExpiry} />
                <InfoRow label="主要照顧者" value={c.guardian} />
                <InfoRow label="照顧者電話" value={c.guardianPhone} />
                <InfoRow label="最近家訪日" value={c.lastHomeVisitDate} />
              </dl>
              {c.services && c.services.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <dt className="text-xs text-gray-400 mb-1.5">服務項目</dt>
                  <div className="flex flex-wrap gap-1">
                    {c.services.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-[#e6ede7] text-[#7a9985] rounded-full text-xs font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {(c.shortGoal || c.midGoal || c.longGoal) && (
                <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5">
                  <p className="text-xs text-gray-400 mb-1">照顧目標</p>
                  <InfoRow label="短期目標" value={c.shortGoal} />
                  <InfoRow label="中期目標" value={c.midGoal} />
                  <InfoRow label="長期目標" value={c.longGoal} />
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
        </>
      )}

      {!editing && (
        <div className="mb-5">
          <button
            onClick={startEditing}
            className="px-4 py-2 text-sm text-[#7a9985] border border-[#a3bcaa] rounded-lg hover:bg-[#e6ede7] transition-colors"
          >
            ✏️ 編輯個案資料
          </button>
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <Link
          href={`/phone-visit?caseId=${c.id}`}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#7a9985] text-white rounded-xl hover:bg-[#50665b] transition-colors font-medium"
        >
          📞 產生電訪紀錄
        </Link>
        <Link
          href={`/home-visit?caseId=${c.id}`}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border-2 border-[#7a9985] text-[#7a9985] rounded-xl hover:bg-[#e6ede7] transition-colors font-medium"
        >
          🏠 產生家訪計劃
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <VisitHistory
          title="電訪紀錄"
          visits={
            phoneVisits.length > 0
              ? phoneVisits.map(v => ({ id: v.id, date: v.date, preview: v.content }))
              : c.lastPhoneVisitContent
                ? [{ id: 'latest', date: c.lastPhoneVisitDate || '', preview: c.lastPhoneVisitContent }]
                : []
          }
        />
        <VisitHistory
          title="家訪紀錄"
          visits={
            homeVisits.length > 0
              ? homeVisits.map(v => ({ id: v.id, date: v.date, preview: v.planContent }))
              : c.lastHomeVisitContent
                ? [{ id: 'latest', date: c.lastHomeVisitDate || '', preview: c.lastHomeVisitContent }]
                : []
          }
        />
      </div>

      {/* Delete section */}
      <div className="border border-red-100 rounded-xl p-4 bg-red-50/50">
        <h3 className="text-sm font-medium text-red-700 mb-2">刪除個案</h3>
        <p className="text-xs text-red-500 mb-3">刪除後將同步刪除 Google Sheet 中的整列資料，並移除所有相關紀錄。此操作無法復原。</p>
        {deleteError && (
          <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            ⚠ 同步至 Google Sheet 失敗：{deleteError}（個案尚未刪除，可重試或聯絡管理員確認 Apps Script 設定）
          </div>
        )}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            刪除此個案
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-600">確定要刪除「{c.name}」嗎？</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleting ? '刪除中...' : '確定刪除'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
      />
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
