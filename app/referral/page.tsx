'use client'
import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import type { Case, ReferralRecord, ReferralTrackingStatus, Settings } from '@/lib/types'
import { REFERRAL_TYPES, EMPTY_REFERRAL_TRACKING } from '@/lib/types'

const TRACKING_LABELS: Record<ReferralTrackingStatus, string> = {
  pending: '待回覆',
  accepted: '已提供服務',
  declined: '無法提供服務',
}
const TRACKING_COLORS: Record<ReferralTrackingStatus, string> = {
  pending: 'bg-gray-100 text-gray-500',
  accepted: 'bg-[#dce8de] text-[#607a68]',
  declined: 'bg-red-50 text-red-500',
}
const TRACKING_ORDER: ReferralTrackingStatus[] = ['pending', 'accepted', 'declined']

function rocDateParts(birthDate?: string) {
  if (!birthDate) return null
  const d = new Date(birthDate)
  if (isNaN(d.getTime())) return null
  return { year: d.getFullYear() - 1911, month: d.getMonth() + 1, day: d.getDate() }
}

function resolvePhone(c: Case | undefined, type: 'self' | 'guardian') {
  if (!c) return ''
  return type === 'guardian' ? (c.guardianPhone || '') : (c.phone || '')
}

function ReferralContent() {
  const searchParams = useSearchParams()
  const { cases, settings, addReferral, updateReferral, deleteReferral, getReferralsByCase } = useStore()

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
  const [date, setDate] = useState(todayStr)
  const [referralTypes, setReferralTypes] = useState<string[]>([])
  const [referralTypeOtherNote, setReferralTypeOtherNote] = useState('')
  const [receivingUnit, setReceivingUnit] = useState('')
  const [contactPersonType, setContactPersonType] = useState<'self' | 'guardian'>('self')
  const [relationship, setRelationship] = useState('')
  const [caseOverview, setCaseOverview] = useState('')
  const [referralNeeds, setReferralNeeds] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const resetForm = () => {
    setDate(todayStr)
    setReferralTypes([])
    setReferralTypeOtherNote('')
    setReceivingUnit('')
    setContactPersonType('self')
    setRelationship('')
    setCaseOverview('')
    setReferralNeeds('')
    setSaved(false)
    setError('')
  }

  const handleSelectCase = (id: string) => {
    setSelectedCaseId(id)
    setCaseSearch('')
    resetForm()
  }

  const toggleType = (t: string) => {
    setReferralTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const referrals = selectedCaseId ? getReferralsByCase(selectedCaseId) : []
  const phonePreview = resolvePhone(selectedCase, contactPersonType)

  const buildReferralPayload = (id: string): ReferralRecord => ({
    id,
    caseId: selectedCase!.id,
    caseName: selectedCase!.name,
    date,
    referralTypes,
    referralTypeOtherNote,
    receivingUnit: receivingUnit.trim(),
    contactPersonType,
    relationship,
    caseOverview,
    referralNeeds,
    managerName: settings.managerName,
    createdAt: new Date().toISOString(),
    ...EMPTY_REFERRAL_TRACKING,
  })

  const handleSave = async () => {
    if (!selectedCase) { setError('請選擇個案'); return }
    if (referralTypes.length === 0) { setError('請至少選擇一項轉介類型'); return }
    if (!receivingUnit.trim()) { setError('請填寫收案單位'); return }
    setSaving(true)
    setError('')
    const record = buildReferralPayload(Date.now().toString())
    addReferral(record)
    if (settings.appsScriptUrl) {
      try {
        const res = await fetch('/api/update-case', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appsScriptUrl: settings.appsScriptUrl,
            action: 'appendVisit',
            sheetName: settings.referralSheetName || '轉介紀錄',
            record: {
              kind: 'referral',
              id: record.id,
              caseName: selectedCase.name,
              caseNumber: selectedCase.caseNumber,
              idNumber: selectedCase.idNumber,
              date,
              referralTypes,
              referralTypeOtherNote,
              receivingUnit: record.receivingUnit,
              contactPersonType,
              contactPhone: phonePreview,
              relationship,
              caseOverview,
              referralNeeds,
              managerName: settings.managerName,
              trackingStatus: record.trackingStatus,
              trackingNote: record.trackingNote,
              trackingDate: record.trackingDate,
            },
          }),
        })
        const data = await res.json()
        if (!data.synced) {
          setError(`已儲存在本機，但雲端同步失敗${data.error ? '：' + data.error : ''}。換電腦前請確認此筆紀錄已同步。`)
        }
      } catch {
        setError('已儲存在本機，但雲端同步失敗（網路錯誤）。')
      }
    } else {
      setError('尚未設定 Apps Script URL，此筆紀錄只存在本機瀏覽器，換電腦將無法看到。')
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleTrackingChange = async (r: ReferralRecord, fields: Partial<ReferralRecord>) => {
    updateReferral(r.id, fields)
    if (settings.appsScriptUrl) {
      try {
        await fetch('/api/update-case', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appsScriptUrl: settings.appsScriptUrl,
            action: 'updateReferralTracking',
            sheetName: settings.referralSheetName || '轉介紀錄',
            id: r.id,
            fields,
          }),
        })
      } catch {}
    }
  }

  const handleDelete = (id: string) => {
    if (!confirm('確定要刪除這筆轉介紀錄嗎？（僅刪除本機紀錄，雲端 Sheet 資料需自行至分頁刪除）')) return
    deleteReferral(id)
  }

  // ── print
  const [printData, setPrintData] = useState<ReferralRecord | null>(null)
  useEffect(() => {
    if (!printData) return
    const t = setTimeout(() => window.print(), 150)
    const onAfterPrint = () => setPrintData(null)
    window.addEventListener('afterprint', onAfterPrint)
    return () => { clearTimeout(t); window.removeEventListener('afterprint', onAfterPrint) }
  }, [printData])

  const handleExportForm = () => {
    if (!selectedCase) { setError('請選擇個案'); return }
    setPrintData(buildReferralPayload('preview'))
  }

  const handleExportSaved = (r: ReferralRecord) => setPrintData(r)

  if (!mounted) return <div className="text-center py-20 text-gray-400 text-sm">載入中...</div>

  return (
    <div className="max-w-6xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">轉介個案</h2>

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
              {selectedCase.guardian && (
                <p className="text-xs text-[#7a9985]/70">主要聯絡人：{selectedCase.guardian}</p>
              )}
              {referrals.length > 0 && (
                <p className="text-xs text-[#7a9985]/50 mt-1.5">共 {referrals.length} 筆轉介紀錄</p>
              )}
            </div>
          )}

          {selectedCase && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">轉介及追蹤紀錄</p>
              {referrals.length === 0 ? (
                <p className="text-xs text-gray-400">尚無轉介紀錄</p>
              ) : (
                <div className="space-y-3">
                  {referrals.map(r => (
                    <ReferralHistoryItem
                      key={r.id}
                      referral={r}
                      onTrackingChange={fields => handleTrackingChange(r, fields)}
                      onExport={() => handleExportSaved(r)}
                      onDelete={() => handleDelete(r.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 右側：轉介表單 ── */}
        <div className="min-w-0 space-y-4">
          {!selectedCase ? (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
              請先從左側選擇個案
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">轉介日期</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">收案單位</label>
                  <input
                    type="text"
                    value={receivingUnit}
                    onChange={e => setReceivingUnit(e.target.value)}
                    placeholder="欲轉介之機構或單位名稱"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">轉介類型</label>
                <div className="flex flex-wrap gap-2">
                  {REFERRAL_TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        referralTypes.includes(t)
                          ? 'bg-[#7a9985] text-white border-[#7a9985]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-[#a3bcaa]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {referralTypes.includes('其他') && (
                  <input
                    type="text"
                    value={referralTypeOtherNote}
                    onChange={e => setReferralTypeOtherNote(e.target.value)}
                    placeholder="請說明其他轉介類型"
                    className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
                  />
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">聯絡電話</label>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setContactPersonType('self')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      contactPersonType === 'self'
                        ? 'bg-[#7a9985] text-white border-[#7a9985]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#a3bcaa]'
                    }`}
                  >
                    本人
                  </button>
                  <button
                    onClick={() => setContactPersonType('guardian')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      contactPersonType === 'guardian'
                        ? 'bg-[#7a9985] text-white border-[#7a9985]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#a3bcaa]'
                    }`}
                  >
                    主要聯絡人
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  將使用：{phonePreview || '（尚未填寫電話）'}
                </p>
                {contactPersonType === 'guardian' && (
                  <div className="mt-2">
                    <label className="block text-xs text-gray-500 mb-1">主要聯絡人與個案關係</label>
                    <input
                      type="text"
                      value={relationship}
                      onChange={e => setRelationship(e.target.value)}
                      placeholder="例：配偶、子女"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
                    />
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    個案概況
                    <span className="font-normal text-gray-400 ml-1">（近三個月個案之身心、家庭概況）</span>
                  </label>
                  <button
                    onClick={() => setCaseOverview(selectedCase.physicalStatus || '')}
                    disabled={!selectedCase.physicalStatus}
                    className="text-xs text-gray-400 hover:text-[#7a9985] border border-gray-200 hover:border-[#a3bcaa] rounded px-2 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    套用個案身心狀況
                  </button>
                </div>
                <textarea
                  value={caseOverview}
                  onChange={e => setCaseOverview(e.target.value)}
                  rows={4}
                  placeholder="請描述個案近期身心狀況與家庭概況…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa] resize-none"
                />
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">轉介需求</label>
                <textarea
                  value={referralNeeds}
                  onChange={e => setReferralNeeds(e.target.value)}
                  rows={3}
                  placeholder="請描述個案此次轉介之具體需求…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa] resize-none"
                />
              </div>

              {error && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700">
                  ⚠ {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleExportForm}
                  className="flex-1 py-3 bg-white border-2 border-[#7a9985] text-[#7a9985] rounded-xl font-semibold hover:bg-[#e6ede7] transition-colors"
                >
                  🖨 匯出 PDF
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 bg-[#7a9985] text-white rounded-xl font-semibold hover:bg-[#50665b] disabled:opacity-50 transition-colors"
                >
                  {saving ? '儲存中...' : saved ? '✓ 已儲存' : '儲存轉介紀錄'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {printData && selectedCase && (
        <div className="print-area">
          <ReferralPrintView data={printData} case_={selectedCase} settings={settings} />
        </div>
      )}
    </div>
  )
}

function ReferralHistoryItem({ referral, onTrackingChange, onExport, onDelete }: {
  referral: ReferralRecord
  onTrackingChange: (fields: Partial<ReferralRecord>) => void
  onExport: () => void
  onDelete: () => void
}) {
  const [note, setNote] = useState(referral.trackingNote)
  const [replyDate, setReplyDate] = useState(referral.trackingDate)

  useEffect(() => { setNote(referral.trackingNote) }, [referral.trackingNote])
  useEffect(() => { setReplyDate(referral.trackingDate) }, [referral.trackingDate])

  return (
    <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500">{referral.date}</p>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TRACKING_COLORS[referral.trackingStatus]}`}>
          {TRACKING_LABELS[referral.trackingStatus]}
        </span>
      </div>
      <p className="text-sm text-gray-700 font-medium">{referral.receivingUnit || '（未填收案單位）'}</p>
      <p className="text-xs text-gray-400 mb-2">{referral.referralTypes.join('、')}</p>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {TRACKING_ORDER.map(s => (
          <button
            key={s}
            onClick={() => onTrackingChange({ trackingStatus: s })}
            className={`px-2 py-0.5 text-xs rounded-lg border transition-colors ${
              referral.trackingStatus === s
                ? 'bg-[#7a9985] text-white border-[#7a9985]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#a3bcaa]'
            }`}
          >
            {TRACKING_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <input
          type="date"
          value={replyDate}
          onChange={e => setReplyDate(e.target.value)}
          onBlur={() => replyDate !== referral.trackingDate && onTrackingChange({ trackingDate: replyDate })}
          className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]"
        />
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          onBlur={() => note !== referral.trackingNote && onTrackingChange({ trackingNote: note })}
          placeholder="追蹤備註 / 無法提供原因"
          className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]"
        />
      </div>

      <div className="flex gap-2">
        <button onClick={onExport} className="text-xs text-[#7a9985] border border-[#a3bcaa] rounded px-2 py-1 hover:bg-[#e6ede7] transition-colors">
          🖨 匯出PDF
        </button>
        <button onClick={onDelete} className="text-xs text-red-400 border border-red-100 rounded px-2 py-1 hover:bg-red-50 transition-colors">
          刪除
        </button>
      </div>
    </div>
  )
}

function ReferralPrintView({ data, case_, settings }: { data: ReferralRecord; case_: Case; settings: Settings }) {
  const birth = rocDateParts(case_.birthDate)
  const phone = resolvePhone(case_, data.contactPersonType)
  const d = data.date ? new Date(data.date) : null
  const managerDateStr = d && !isNaN(d.getTime())
    ? `民國${d.getFullYear() - 1911}年${d.getMonth() + 1}月${d.getDate()}日`
    : ''
  const cellCls = 'border border-black px-2 py-1.5 align-top text-sm'
  const labelCls = `${cellCls} bg-gray-100 font-medium w-28 whitespace-nowrap`

  return (
    <div className="p-10 text-black bg-white" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
      <p className="text-right text-xs text-gray-500 mb-1">第一版1130507訂</p>
      <h1 className="text-center text-xl font-bold mb-4">其他服務轉介單</h1>
      <table className="w-full border-collapse mb-4">
        <tbody>
          <tr>
            <td className={labelCls}>姓名</td>
            <td className={cellCls}>{case_.name}</td>
            <td className={labelCls}>出生日期</td>
            <td className={cellCls}>{birth ? `民國 ${birth.year} 年 ${birth.month} 月 ${birth.day} 日` : ''}</td>
          </tr>
          <tr>
            <td className={labelCls}>性別</td>
            <td className={cellCls}>
              {case_.gender === '男' ? '☑男　□女' : case_.gender === '女' ? '□男　☑女' : '□男　□女'}
            </td>
            <td className={labelCls}>身份證字號</td>
            <td className={cellCls}>{case_.idNumber}</td>
          </tr>
          <tr>
            <td className={labelCls}>居住地址</td>
            <td className={cellCls} colSpan={3}>{case_.address}</td>
          </tr>
          <tr>
            <td className={labelCls}>主要聯絡人</td>
            <td className={cellCls}>{case_.guardian}</td>
            <td className={labelCls}>關係</td>
            <td className={cellCls}>{data.relationship}</td>
          </tr>
          <tr>
            <td className={labelCls}>聯絡電話</td>
            <td className={cellCls} colSpan={3}>
              {data.contactPersonType === 'self' ? '☑本人　□主要聯絡人' : '□本人　☑主要聯絡人'}　{phone}
            </td>
          </tr>
          <tr>
            <td className={labelCls}>轉介類型</td>
            <td className={cellCls} colSpan={3}>
              {REFERRAL_TYPES.map(t => (
                <span key={t} className="mr-4 inline-block">
                  {data.referralTypes.includes(t) ? '☑' : '□'}{t}
                </span>
              ))}
              {data.referralTypes.includes('其他') && data.referralTypeOtherNote && (
                <span>（{data.referralTypeOtherNote}）</span>
              )}
            </td>
          </tr>
          <tr>
            <td className={labelCls}>收案單位</td>
            <td className={cellCls} colSpan={3}>{data.receivingUnit}</td>
          </tr>
          <tr>
            <td className={labelCls}>個案概況</td>
            <td className={cellCls} colSpan={3} style={{ height: '110px' }}>
              <p className="text-xs text-gray-500 mb-1">近三個月個案之身心、家庭概況：</p>
              <p className="whitespace-pre-wrap">{data.caseOverview}</p>
            </td>
          </tr>
          <tr>
            <td className={labelCls}>轉介需求</td>
            <td className={cellCls} colSpan={3} style={{ height: '80px' }}>
              <p className="whitespace-pre-wrap">{data.referralNeeds}</p>
            </td>
          </tr>
          <tr>
            <td className={labelCls}>個管核章/日期</td>
            <td className={cellCls}>{data.managerName}　{managerDateStr}</td>
            <td className={labelCls}>主管核章/日期</td>
            <td className={cellCls}></td>
          </tr>
        </tbody>
      </table>

      <div className="text-sm space-y-0.5 mb-8">
        <p>← 轉介單位：{settings.organizationName}</p>
        <p>← 聯絡電話：{settings.managerPhone}</p>
        <p>← 聯絡信箱：{settings.organizationEmail}</p>
      </div>

      <h2 className="text-center text-lg font-bold mb-3">回覆單</h2>
      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <td className={cellCls} colSpan={4} style={{ height: '100px' }}>
              <p>單位回覆：</p>
              <p className="mt-3">□提供服務</p>
              <p className="mt-3">□無法提供服務，原因：</p>
              <p className="mt-3">處理情形：</p>
            </td>
          </tr>
          <tr>
            <td className={labelCls}>收案人員</td>
            <td className={cellCls} colSpan={3}></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function ReferralPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400 text-sm">載入中...</div>}>
      <ReferralContent />
    </Suspense>
  )
}
