import { NextRequest, NextResponse } from 'next/server'
import { fetchWithRetry } from '@/lib/serverFetch'

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
      const { caseName, caseNumber, professionalServiceSheetName } = body
      params = { action: 'deleteCase', caseName, caseNumber: caseNumber || '', professionalServiceSheetName: professionalServiceSheetName || '' }
    } else if (action === 'appendVisit') {
      const { sheetName, record } = body
      params = { action: 'appendVisit', sheetName, record: JSON.stringify(record) }
    } else if (action === 'getPhoneVisits') {
      const { sheetName } = body
      params = { action: 'getPhoneVisits', sheetName }
    } else if (action === 'getHomeVisits') {
      const { sheetName } = body
      params = { action: 'getHomeVisits', sheetName }
    } else if (action === 'getReferrals') {
      const { sheetName } = body
      params = { action: 'getReferrals', sheetName }
    } else if (action === 'updateReferralTracking') {
      const { sheetName, id, fields } = body
      params = { action: 'updateReferralTracking', sheetName, id, fields: JSON.stringify(fields) }
    } else if (action === 'getProfessionalServices') {
      const { sheetName } = body
      params = { action: 'getProfessionalServices', sheetName }
    } else if (action === 'updateProfessionalService') {
      const { sheetName, id, fields } = body
      params = { action: 'updateProfessionalService', sheetName, id, fields: JSON.stringify(fields) }
    } else {
      return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 })
    }

    const res = await fetchWithRetry(
      appsScriptUrl,
      {
        method: 'POST',
        redirect: 'follow',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params).toString(),
      },
      { label: `action=${action}` }
    )
    const json = await res.json()
    if (!json.ok) throw new Error(json.error || 'Apps Script 回傳錯誤')

    return NextResponse.json({
      ok: true,
      synced: true,
      duplicate: json.data?.duplicate,
      rows: json.data?.rows,
      visits: json.data?.visits,
      referrals: json.data?.referrals,
      professionalServices: json.data?.professionalServices,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '同步失敗'
    return NextResponse.json({ ok: true, synced: false, error: msg })
  }
}
