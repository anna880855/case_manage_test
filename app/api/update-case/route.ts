import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { appsScriptUrl, action } = body

  if (!appsScriptUrl) {
    return NextResponse.json({ ok: true, synced: false })
  }

  try {
    let params: Record<string, string>

    if (action === 'createCase') {
      const { fields } = body
      params = { action: 'createCase', fields: JSON.stringify(fields) }
    } else if (action === 'updateCase') {
      const { caseName, caseNumber, fields } = body
      params = { action: 'updateCase', caseName, caseNumber: caseNumber || '', fields: JSON.stringify(fields) }
    } else if (action === 'updateStatus') {
      const { caseName, caseNumber, status } = body
      params = { action: 'updateStatus', caseName, caseNumber: caseNumber || '', status }
    } else if (action === 'deleteCase') {
      const { caseName, caseNumber } = body
      params = { action: 'deleteCase', caseName, caseNumber: caseNumber || '' }
    } else {
      return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 })
    }

    const res = await fetch(appsScriptUrl, {
      method: 'POST',
      redirect: 'follow',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (!json.ok) throw new Error(json.error || 'Apps Script 回傳錯誤')

    return NextResponse.json({ ok: true, synced: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '同步失敗'
    return NextResponse.json({ ok: true, synced: false, error: msg })
  }
}
