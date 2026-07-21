import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  const homeVisitSheetName = req.nextUrl.searchParams.get('homeVisitSheetName') || '家訪紀錄'
  const referralSheetName = req.nextUrl.searchParams.get('referralSheetName') || '轉介紀錄'
  const professionalServiceSheetName = req.nextUrl.searchParams.get('professionalServiceSheetName') || '專業服務追蹤紀錄'
  if (!url) {
    return NextResponse.json({ error: '缺少 Apps Script URL' }, { status: 400 })
  }

  try {
    const [casesRes, homeVisitsRes, referralsRes, professionalServicesRes] = await Promise.all([
      fetch(`${url}?action=getCasesOnly`, { redirect: 'follow', cache: 'no-store' }),
      fetch(`${url}?action=getHomeVisits&sheetName=${encodeURIComponent(homeVisitSheetName)}`, { redirect: 'follow', cache: 'no-store' }),
      fetch(`${url}?action=getReferrals&sheetName=${encodeURIComponent(referralSheetName)}`, { redirect: 'follow', cache: 'no-store' }),
      fetch(`${url}?action=getProfessionalServices&sheetName=${encodeURIComponent(professionalServiceSheetName)}`, { redirect: 'follow', cache: 'no-store' }),
    ])

    if (!casesRes.ok) throw new Error(`HTTP ${casesRes.status}`)
    const casesJson = await casesRes.json()
    if (!casesJson.ok) throw new Error(casesJson.error || 'Apps Script 回傳錯誤')

    let homeVisits: unknown[] = []
    if (homeVisitsRes.ok) {
      const hvJson = await homeVisitsRes.json()
      if (hvJson.ok) homeVisits = hvJson.data?.visits || []
    }

    let referrals: unknown[] = []
    if (referralsRes.ok) {
      const refJson = await referralsRes.json()
      if (refJson.ok) referrals = refJson.data?.referrals || []
    }

    let professionalServices: unknown[] = []
    if (professionalServicesRes.ok) {
      const psJson = await professionalServicesRes.json()
      if (psJson.ok) professionalServices = psJson.data?.professionalServices || []
    }

    return NextResponse.json({ ...casesJson.data, homeVisits, referrals, professionalServices })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '同步失敗'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
