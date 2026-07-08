'use client'
import { useMemo, useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { buildHealthBureauRows, exportHealthBureauRowsXls, mergeRemoteRows, rocDateToYearMonth } from '@/lib/healthBureauExport'

export default function HealthBureauExportPage() {
  const { cases, phoneVisits, settings } = useStore()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

  const [remoteRows, setRemoteRows] = useState<string[][]>([])
  const [remoteError, setRemoteError] = useState('')
  const [loadingRemote, setLoadingRemote] = useState(false)

  useEffect(() => {
    if (!mounted || !settings.appsScriptUrl || !settings.phoneVisitSheetName) return
    setLoadingRemote(true)
    setRemoteError('')
    fetch('/api/update-case', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appsScriptUrl: settings.appsScriptUrl,
        action: 'getPhoneVisits',
        sheetName: settings.phoneVisitSheetName,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.synced) setRemoteRows(data.rows || [])
        else setRemoteError(`無法從雲端電訪分頁取得資料，目前只會顯示本機紀錄。${data.error ? `（${data.error}）` : ''}`)
      })
      .catch(() => setRemoteError('無法從雲端電訪分頁取得資料，目前只會顯示本機紀錄。'))
      .finally(() => setLoadingRemote(false))
  }, [mounted, settings.appsScriptUrl, settings.phoneVisitSheetName])

  const visitsInMonth = useMemo(() => {
    return phoneVisits
      .filter(v => v.date.slice(0, 7) === month)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [phoneVisits, month])

  const localRows = useMemo(
    () => buildHealthBureauRows(visitsInMonth, cases, settings.managerIdNumber),
    [visitsInMonth, cases, settings.managerIdNumber]
  )

  const remoteRowsInMonth = useMemo(
    () => remoteRows.filter(r => rocDateToYearMonth(r[1]) === month),
    [remoteRows, month]
  )

  const mergedRows = useMemo(
    () => mergeRemoteRows(localRows, remoteRowsInMonth),
    [localRows, remoteRowsInMonth]
  )

  const remoteOnlyPreview = useMemo(() => {
    const localKeys = new Set(localRows.map(r => `${r[0]}|${r[1]}`))
    return remoteRowsInMonth
      .filter(r => !localKeys.has(`${r[0]}|${r[1]}`))
      .map(r => ({ idNumber: r[0], rocDate: r[1], caseName: r[25] || '' }))
  }, [localRows, remoteRowsInMonth])

  const missingIdCount = visitsInMonth.filter(v => {
    const c = cases.find(x => x.id === v.caseId)
    return !c?.idNumber
  }).length

  const handleExport = () => {
    exportHealthBureauRowsXls(mergedRows, `電訪紀錄_${month}.xls`)
  }

  if (!mounted) {
    return <div className="text-center py-20 text-gray-400 text-sm">載入中...</div>
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">衛生局電訪報表匯出</h2>

      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">選擇月份</label>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
          />
        </div>

        <p className="text-sm text-gray-500">
          本月共 <span className="font-semibold text-[#7a9985]">{mergedRows.length}</span> 筆電訪紀錄
          {remoteOnlyPreview.length > 0 && (
            <span className="text-gray-400">（其中 {remoteOnlyPreview.length} 筆只存在雲端電訪分頁，本機沒有）</span>
          )}
          {loadingRemote && <span className="text-gray-400">　雲端資料載入中…</span>}
        </p>

        {remoteError && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-700 text-sm">{remoteError}</div>
        )}

        {!settings.managerIdNumber && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-700 text-sm">
            尚未設定「主責個管員身分證號」，匯出後該欄位將留空，請至
            <a href="/settings" className="underline font-medium mx-1">設定頁面</a>
            補上。
          </div>
        )}

        {missingIdCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-700 text-sm">
            有 {missingIdCount} 筆紀錄的個案缺少身分證字號，匯出後該欄位將留空，請至個案資料補上。
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={mergedRows.length === 0}
          className="px-5 py-2.5 bg-[#7a9985] text-white rounded-lg font-medium hover:bg-[#50665b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          📤 下載本月電訪報表
        </button>
      </div>

      {visitsInMonth.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mt-4 overflow-x-auto">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">本機電訪紀錄預覽</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-1.5 pr-4">日期</th>
                <th className="py-1.5 pr-4">個案</th>
                <th className="py-1.5">電訪對象</th>
              </tr>
            </thead>
            <tbody>
              {visitsInMonth.map(v => (
                <tr key={v.id} className="border-b border-gray-50">
                  <td className="py-1.5 pr-4 text-gray-500">{v.date}</td>
                  <td className="py-1.5 pr-4 text-gray-700">{v.caseName}</td>
                  <td className="py-1.5 text-gray-500">{v.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {remoteOnlyPreview.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mt-4 overflow-x-auto">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">雲端電訪分頁額外紀錄預覽（本機沒有）</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-1.5 pr-4">服務日期(7碼)</th>
                <th className="py-1.5 pr-4">身分證字號</th>
                <th className="py-1.5">個案姓名</th>
              </tr>
            </thead>
            <tbody>
              {remoteOnlyPreview.map((r, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-1.5 pr-4 text-gray-500">{r.rocDate}</td>
                  <td className="py-1.5 pr-4 text-gray-700">{r.idNumber}</td>
                  <td className="py-1.5 text-gray-500">{r.caseName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
