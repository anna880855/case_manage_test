import { NextRequest, NextResponse } from 'next/server'

async function callAppsScript(appsScriptUrl: string, params: Record<string, string>) {
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
  return json.data
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const appsScriptUrl = searchParams.get('url')
  const caseNumber = searchParams.get('caseNumber') || ''

  if (!appsScriptUrl) return NextResponse.json({ ok: true, drafts: [] })

  try {
    const data = await callAppsScript(appsScriptUrl, { action: 'getDrafts', caseNumber })
    return NextResponse.json({ ok: true, drafts: data?.drafts || [] })
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message, drafts: [] })
  }
}

export async function POST(req: NextRequest) {
  const { appsScriptUrl, record } = await req.json()

  if (!appsScriptUrl) return NextResponse.json({ ok: true, synced: false })

  try {
    await callAppsScript(appsScriptUrl, { action: 'saveDraft', record: JSON.stringify(record) })
    return NextResponse.json({ ok: true, synced: true })
  } catch (err) {
    return NextResponse.json({ ok: true, synced: false, error: (err as Error).message })
  }
}

export async function DELETE(req: NextRequest) {
  const { appsScriptUrl, caseNumber, ts } = await req.json()

  if (!appsScriptUrl) return NextResponse.json({ ok: true })

  try {
    await callAppsScript(appsScriptUrl, { action: 'deleteDraft', caseNumber, ts })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
