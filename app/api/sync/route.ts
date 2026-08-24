import { NextRequest, NextResponse } from 'next/server'
import { fetchWithRetry } from '@/lib/serverFetch'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  const homeVisitSheetName = req.nextUrl.searchParams.get('homeVisitSheetName') || '家訪紀錄'
  const referralSheetName = req.nextUrl.searchParams.get('referralSheetName') || '轉介紀錄'
  const professionalServiceSheetName = req.nextUrl.searchParams.get('professionalServiceSheetName') || '專業服務追蹤紀錄'
  const sentenceSheetName = req.nextUrl.searchParams.get('sentenceSheetName') || '電訪句型庫'
  if (!url) {
    return NextResponse.json({ error: '缺少 Apps Script URL' }, { status: 400 })
  }

  try {
    // 五個 action 各自重試，互不拖累：其中一個瞬斷不會讓另外四個也白跑，
    // 但 getCasesOnly 是核心資料，最終仍失敗的話要整個請求失敗（見下方 casesResult 檢查）。
    const [casesResult, homeVisitsResult, referralsResult, professionalServicesResult, sentencesResult] = await Promise.allSettled([
      fetchWithRetry(`${url}?action=getCasesOnly`, { redirect: 'follow', cache: 'no-store' }, { label: 'getCasesOnly' }),
      fetchWithRetry(`${url}?action=getHomeVisits&sheetName=${encodeURIComponent(homeVisitSheetName)}`, { redirect: 'follow', cache: 'no-store' }, { label: 'getHomeVisits' }),
      fetchWithRetry(`${url}?action=getReferrals&sheetName=${encodeURIComponent(referralSheetName)}`, { redirect: 'follow', cache: 'no-store' }, { label: 'getReferrals' }),
      fetchWithRetry(`${url}?action=getProfessionalServices&sheetName=${encodeURIComponent(professionalServiceSheetName)}`, { redirect: 'follow', cache: 'no-store' }, { label: 'getProfessionalServices' }),
      fetchWithRetry(`${url}?action=getSentences&sheetName=${encodeURIComponent(sentenceSheetName)}`, { redirect: 'follow', cache: 'no-store' }, { label: 'getSentences' }),
    ])

    if (casesResult.status === 'rejected') {
      throw casesResult.reason instanceof Error ? casesResult.reason : new Error('同步失敗')
    }
    const casesJson = await casesResult.value.json()
    if (!casesJson.ok) throw new Error(casesJson.error || 'Apps Script 回傳錯誤')

    let homeVisits: unknown[] = []
    if (homeVisitsResult.status === 'fulfilled') {
      const hvJson = await homeVisitsResult.value.json()
      if (hvJson.ok) homeVisits = hvJson.data?.visits || []
    }

    let referrals: unknown[] = []
    if (referralsResult.status === 'fulfilled') {
      const refJson = await referralsResult.value.json()
      if (refJson.ok) referrals = refJson.data?.referrals || []
    }

    let professionalServices: unknown[] = []
    if (professionalServicesResult.status === 'fulfilled') {
      const psJson = await professionalServicesResult.value.json()
      if (psJson.ok) professionalServices = psJson.data?.professionalServices || []
    }

    let sentences: unknown[] = []
    if (sentencesResult.status === 'fulfilled') {
      const senJson = await sentencesResult.value.json()
      if (senJson.ok) sentences = senJson.data?.sentences || []
    }

    return NextResponse.json({ ...casesJson.data, homeVisits, referrals, professionalServices, sentences })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '同步失敗'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
