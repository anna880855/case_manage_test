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
