'use client'
import { useMemo, useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { buildHealthBureauRows, exportHealthBureauRowsXls, mergeRemoteRows, mergeVisitsForHealthBureau, rocDateToYearMonth } from '@/lib/healthBureauExport'
import { formatDateOnly } from '@/lib/types'

export default function HealthBureauExportPage() {
  const { cases, phoneVisits, settings } = useStore()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

  const [remoteRows, setRemoteRows] = useState<string[][]>([])
  const [remoteError, setRemoteError] = useState('')
  const [loadingRemote, setLoadingRemote] = useState(false)

  const fetchRemoteRows = async (): Promise<string[][]> => {
    if (!settings.appsScriptUrl || !settings.phoneVisitSheetName) return []
    setLoadingRemote(true)
    setRemoteError('')
    try {
      const res = await fetch('/api/update-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appsScriptUrl: settings.appsScriptUrl,
          action: 'getPhoneVisits',
          sheetName: settings.phoneVisitSheetName,
        }),
      })
      const data = await res.json()
      if (data.synced) {
        const rows = data.rows || []
        setRemoteRows(rows)
        return rows
      }
      setRemoteError(`無法從雲端電訪分頁取得資料，目前只會顯示本機紀錄。${data.error ? `（${data.error}）` : ''}`)
      return []
    } catch {
      setRemoteError('無法從雲端電訪分頁取得資料，目前只會顯示本機紀錄。')
      return []
    } finally {
      setLoadingRemote(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mounted || !settings.appsScriptUrl || !settings.phoneVisitSheetName) return
    fetchRemoteRows()
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

  const handleExport = async () => {
    const freshRemoteRows = await fetchRemoteRows()
    const freshRemoteRowsInMonth = freshRemoteRows.filter(r => rocDateToYearMonth(r[1]) === month)
    const freshMergedRows = mergeRemoteRows(localRows, freshRemoteRowsInMonth)
    // 本機備用匯出用 .xlsx：SheetJS 寫入舊版 .xls 二進位格式時，儲存格內容會被硬性截斷在 255 字元，
    // 電訪內容常超過這個長度，用 .xls 會實際遺失資料；.xlsx 沒有這個限制，但衛生局系統只收 .xls，
    // 正式上傳請用下面「從 Google 試算表匯出正式 .xls」，這個按鈕只供本機檢查內容用。
    exportHealthBureauRowsXls(freshMergedRows, `電訪紀錄_${month}_本機檢查用.xlsx`)
  }

  const [preparingReport, setPreparingReport] = useState(false)
  const [reportError, setReportError] = useState('')

  // 衛生局系統只收 .xls，但前端用來寫 .xls 的函式庫會把內容截斷在 255 字元；改用 Google 試算表
  // 原生的「下載為 .xls」匯出（沒有這個字數限制）。流程：先把本機才有、雲端這個月份還沒有的
  // 紀錄同步上去，確保雲端資料完整，再請 Apps Script 把這個月已篩選合併好的紀錄複製到一個
  // 獨立分頁，最後用 Google 官方匯出網址直接下載該分頁的 .xls。
  const handleGoogleNativeExport = async () => {
    if (!settings.appsScriptUrl || !settings.phoneVisitSheetName) return
    setPreparingReport(true)
    setReportError('')
    try {
      const freshRemoteRows = await fetchRemoteRows()
      const freshRemoteRowsInMonth = freshRemoteRows.filter(r => rocDateToYearMonth(r[1]) === month)
      const remoteIdNumbers = new Set(freshRemoteRowsInMonth.map(r => (r[0] || '').trim()))
      const mergedVisits = mergeVisitsForHealthBureau(visitsInMonth)
      for (const visit of mergedVisits) {
        const c = cases.find(x => x.id === visit.caseId)
        const idNumber = c?.idNumber?.trim()
        if (!idNumber || remoteIdNumbers.has(idNumber)) continue
        await fetch('/api/update-case', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appsScriptUrl: settings.appsScriptUrl,
            action: 'appendVisit',
            sheetName: settings.phoneVisitSheetName,
            record: {
              kind: 'phone',
              caseName: c?.name || visit.caseName,
              caseNumber: c?.caseNumber || '',
              idNumber,
              date: visit.date,
              target: visit.target,
              content: visit.content,
              healthBureau: visit.healthBureau,
              managerIdNumber: settings.managerIdNumber,
            },
          }),
        })
      }

      const res = await fetch('/api/update-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appsScriptUrl: settings.appsScriptUrl,
          action: 'prepareMonthlyReport',
          sheetName: settings.phoneVisitSheetName,
          yearMonth: month,
        }),
      })
      const data = await res.json()
      if (!data.synced || !data.prepared) {
        setReportError(`準備報表失敗${data.error ? '：' + data.error : ''}，請確認 Google Apps Script 是否已更新部署。`)
        return
      }
      const idMatch = String(data.spreadsheetUrl || '').match(/\/d\/([a-zA-Z0-9-_]+)/)
      if (!idMatch) {
        setReportError('無法取得試算表網址，請確認 Google Apps Script 是否已更新部署。')
        return
      }
      window.open(`https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=xls&gid=${data.sheetId}`, '_blank')
    } catch {
      setReportError('準備報表失敗（網路錯誤）')
    } finally {
      setPreparingReport(false)
    }
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

        {reportError && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-red-600 text-sm">{reportError}</div>
        )}

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => fetchRemoteRows()}
            disabled={loadingRemote || !settings.appsScriptUrl || !settings.phoneVisitSheetName}
            className="px-4 py-2.5 border border-[#a3bcaa] text-[#7a9985] rounded-lg font-medium hover:bg-[#e6ede7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loadingRemote ? '同步中…' : '🔄 重新整理雲端資料'}
          </button>
          <button
            onClick={handleGoogleNativeExport}
            disabled={preparingReport || loadingRemote || !settings.appsScriptUrl || !settings.phoneVisitSheetName || mergedRows.length === 0}
            className="px-5 py-2.5 bg-[#7a9985] text-white rounded-lg font-medium hover:bg-[#50665b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {preparingReport ? '準備報表中…' : '📥 從 Google 試算表匯出正式 .xls（衛生局上傳用）'}
          </button>
          <button
            onClick={handleExport}
            disabled={loadingRemote || mergedRows.length === 0}
            className="px-4 py-2.5 border border-gray-200 text-gray-500 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {loadingRemote ? '同步雲端資料中…' : '📤 下載本機 .xlsx（僅供檢查內容，不可上傳衛生局）'}
          </button>
        </div>
        {(!settings.appsScriptUrl || !settings.phoneVisitSheetName) && (
          <p className="text-xs text-gray-400">
            正式 .xls 匯出需要先在
            <a href="/settings" className="underline font-medium mx-1">設定頁面</a>
            設定 Apps Script URL 與電訪分頁名稱。
          </p>
        )}
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
                  <td className="py-1.5 pr-4 text-gray-500">{formatDateOnly(v.date)}</td>
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
