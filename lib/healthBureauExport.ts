import * as XLSX from 'xlsx'
import type { Case, HealthBureauFields, PhoneVisitRecord } from './types'
import { EMPTY_HEALTH_BUREAU_FIELDS } from './types'

const HEADER = [
  '身分證字號',
  '服務日期\n(請輸入7碼)',
  '服務項目-電訪',
  '服務項目-家訪',
  '服務項目-調整照顧計畫【不涉及額度變更】',
  '服務項目-接受長照需要者及其家屬有關長照服務諮詢、申訴與處理',
  '服務項目-照會或連結至服務提供單位',
  '服務項目-其他(執行服務計畫、專業服務新增、延案或結案、更換社區整合型服務中心、其他等)',
  '服務項目-其他服務項目說明',
  '服務重點-追蹤長照需要者與各項服務之連結情形',
  '服務重點-計畫與內容異動討論',
  '服務重點-協助長照需要者或其家屬其他資源連結',
  '服務重點-接受長照需要者及其家屬有關長照服務諮詢、申訴與處理',
  '服務重點-接受申訴',
  '服務重點-其他',
  '服務重點-其他備註',
  '服務對象-服務使用者',
  '服務對象-家庭照顧者',
  '主責個管員身分證',
  '提醒照專',
  '提醒自己何時再查看日期\n(請輸入7碼)',
  '追蹤服務適應與介入情形',
  '各項服務目標及整體計畫目標達成情形',
  '整體計畫的適切性及需求異動',
  '其他處理事項',
]

function toRocDate(raw: string): string {
  if (!raw) return ''
  const d = new Date(raw)
  if (isNaN(d.getTime())) return ''
  const roc = d.getFullYear() - 1911
  return `${roc}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

const v = (b: boolean) => (b ? 'V' : '')

const GOAL_MARKERS = ['短期目標：', '中期目標：', '長期目標：']
const PLAN_MARKER = '一、照顧及專業服務：'

/**
 * 電訪內容是「三、訪談內容 → 目標追蹤 → 服務計劃內容追蹤」依序寫成的長文字，
 * 這裡依固定段落標記拆出三段，分別對應衛生局報表的三個文字欄位。
 */
export function splitContent(content: string): { narrative: string; goalBlock: string; planBlock: string } {
  const planIdx = content.indexOf(PLAN_MARKER)
  const beforePlan = planIdx !== -1 ? content.slice(0, planIdx) : content
  const planBlock = planIdx !== -1 ? content.slice(planIdx).trim() : ''

  let goalIdx = -1
  for (const marker of GOAL_MARKERS) {
    const idx = beforePlan.indexOf(marker)
    if (idx !== -1 && (goalIdx === -1 || idx < goalIdx)) goalIdx = idx
  }
  const narrative = (goalIdx !== -1 ? beforePlan.slice(0, goalIdx) : beforePlan).trim()
  const goalBlock = goalIdx !== -1 ? beforePlan.slice(goalIdx).trim() : ''

  return { narrative, goalBlock, planBlock }
}

// 衛生局一個月只能上傳一份紀錄，同一個案在同月若有多筆電訪（例如月初聯繫、月中又來電改服務），
// 匯出前先依個案分組合併成一筆，各筆內容之間用分隔線串接，勾選類欄位採聯集。
export const HEALTH_BUREAU_MERGE_DIVIDER = '------------------------------'

// 合併多筆同月紀錄的文字內容；完全相同的內容（例如都留預設值「無」）只保留一份，避免分隔線重複無意義的重複文字
export function joinWithDivider(parts: (string | undefined)[]): string {
  const nonEmpty = parts.map(p => (p || '').trim()).filter(Boolean)
  const deduped = nonEmpty.filter((p, i) => nonEmpty.indexOf(p) === i)
  return deduped.join(`\n${HEALTH_BUREAU_MERGE_DIVIDER}\n`)
}

export function mergeVisitsForHealthBureau(visits: PhoneVisitRecord[]): PhoneVisitRecord[] {
  const order: string[] = []
  const groups = new Map<string, PhoneVisitRecord[]>()
  for (const visit of visits) {
    if (!groups.has(visit.caseId)) {
      groups.set(visit.caseId, [])
      order.push(visit.caseId)
    }
    groups.get(visit.caseId)!.push(visit)
  }

  return order.map(caseId => {
    const group = [...groups.get(caseId)!].sort((a, b) => a.date.localeCompare(b.date))
    if (group.length === 1) return group[0]

    const last = group[group.length - 1]
    const hbList = group.map(v => v.healthBureau || EMPTY_HEALTH_BUREAU_FIELDS)
    const anyChecked = (pick: (hb: HealthBureauFields) => boolean) => hbList.some(pick)
    const joinField = (key: 'trackingAdaptation' | 'goalAchievement' | 'planAppropriateness' | 'otherHandling') =>
      joinWithDivider(hbList.map(hb => hb[key]))

    const mergedHb: HealthBureauFields = {
      serviceItems: {
        adjustPlan: anyChecked(hb => hb.serviceItems.adjustPlan),
        consultComplaint: anyChecked(hb => hb.serviceItems.consultComplaint),
        referral: anyChecked(hb => hb.serviceItems.referral),
        other: anyChecked(hb => hb.serviceItems.other),
        otherNote: joinWithDivider(hbList.map(hb => hb.serviceItems.otherNote)),
      },
      serviceFocus: {
        trackLinkage: anyChecked(hb => hb.serviceFocus.trackLinkage),
        planDiscussion: anyChecked(hb => hb.serviceFocus.planDiscussion),
        resourceLink: anyChecked(hb => hb.serviceFocus.resourceLink),
        consultComplaint: anyChecked(hb => hb.serviceFocus.consultComplaint),
        acceptComplaint: anyChecked(hb => hb.serviceFocus.acceptComplaint),
        other: anyChecked(hb => hb.serviceFocus.other),
        otherNote: joinWithDivider(hbList.map(hb => hb.serviceFocus.otherNote)),
      },
      serviceTarget: {
        user: anyChecked(hb => hb.serviceTarget.user),
        caregiver: anyChecked(hb => hb.serviceTarget.caregiver),
      },
      trackingAdaptation: joinField('trackingAdaptation'),
      goalAchievement: joinField('goalAchievement'),
      planAppropriateness: joinField('planAppropriateness'),
      otherHandling: joinField('otherHandling'),
    }

    return {
      ...last,
      target: Array.from(new Set(group.map(v => v.target).filter(Boolean))).join('、'),
      content: joinWithDivider(group.map(v => v.content)),
      healthBureau: mergedHb,
    }
  })
}

export function buildHealthBureauRows(
  visits: PhoneVisitRecord[],
  cases: Case[],
  managerIdNumber: string
): string[][] {
  return mergeVisitsForHealthBureau(visits).map(visit => {
    const c = cases.find(x => x.id === visit.caseId)
    const hb = visit.healthBureau || EMPTY_HEALTH_BUREAU_FIELDS
    const { narrative, goalBlock, planBlock } = splitContent(visit.content || '')
    return [
      c?.idNumber || '',
      toRocDate(visit.date),
      'V',
      '',
      v(hb.serviceItems.adjustPlan),
      v(hb.serviceItems.consultComplaint),
      v(hb.serviceItems.referral),
      v(hb.serviceItems.other),
      hb.serviceItems.otherNote,
      v(hb.serviceFocus.trackLinkage),
      v(hb.serviceFocus.planDiscussion),
      v(hb.serviceFocus.resourceLink),
      v(hb.serviceFocus.consultComplaint),
      v(hb.serviceFocus.acceptComplaint),
      v(hb.serviceFocus.other),
      hb.serviceFocus.otherNote,
      v(hb.serviceTarget.user),
      v(hb.serviceTarget.caregiver),
      managerIdNumber,
      '',
      '',
      hb.trackingAdaptation || narrative,
      hb.goalAchievement || goalBlock,
      hb.planAppropriateness || planBlock,
      hb.otherHandling || '無',
    ]
  })
}

export function exportHealthBureauRowsXls(rows: string[][], fileName: string) {
  const sheet = XLSX.utils.aoa_to_sheet([HEADER, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, '工作表1')
  const bookType = fileName.toLowerCase().endsWith('.xls') ? 'xls' : 'xlsx'
  XLSX.writeFile(workbook, fileName, { bookType })
}

export function exportHealthBureauXls(
  visits: PhoneVisitRecord[],
  cases: Case[],
  managerIdNumber: string,
  fileName: string
) {
  exportHealthBureauRowsXls(buildHealthBureauRows(visits, cases, managerIdNumber), fileName)
}

// 雲端電訪分頁的 7 碼民國日期轉成 YYYY-MM，用來比對選擇的月份
export function rocDateToYearMonth(rocDate: string): string {
  if (!rocDate || rocDate.length < 5) return ''
  const roc = parseInt(rocDate.slice(0, rocDate.length - 4), 10)
  const mm = rocDate.slice(-4, -2)
  if (isNaN(roc)) return ''
  return `${roc + 1911}-${mm}`
}

// 把雲端試算表的一列（25 欄衛生局格式）還原成 HealthBureauFields，供「查詢本月紀錄」功能
// 從雲端讀回勾選與文字內容時使用（跨裝置查詢時，本機瀏覽器不一定存有這筆紀錄的結構化資料）
export function parseHealthBureauRow(row: string[]): HealthBureauFields {
  const checked = (i: number) => row[i] === 'V'
  return {
    serviceItems: {
      adjustPlan: checked(4),
      consultComplaint: checked(5),
      referral: checked(6),
      other: checked(7),
      otherNote: row[8] || '',
    },
    serviceFocus: {
      trackLinkage: checked(9),
      planDiscussion: checked(10),
      resourceLink: checked(11),
      consultComplaint: checked(12),
      acceptComplaint: checked(13),
      other: checked(14),
      otherNote: row[15] || '',
    },
    serviceTarget: {
      user: checked(16),
      caregiver: checked(17),
    },
    trackingAdaptation: row[21] || '',
    goalAchievement: row[22] || '',
    planAppropriateness: row[23] || '',
    otherHandling: row[24] || '無',
  }
}

// 衛生局報表欄位中屬於勾選（V / 空白）與可合併文字的欄位索引，用來把同一身分證字號、
// 同月份的多筆雲端列（例如合併功能上線前，同案已分次上傳的舊紀錄）合併成一筆
const RAW_ROW_CHECKBOX_COLS = [2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 16, 17]
const RAW_ROW_TEXT_JOIN_COLS = [8, 15, 21, 22, 23, 24]

export function mergeRawHealthBureauRows(rows: string[][]): string[][] {
  const order: string[] = []
  const groups = new Map<string, string[][]>()
  for (const row of rows) {
    const id = row[0]
    if (!groups.has(id)) {
      groups.set(id, [])
      order.push(id)
    }
    groups.get(id)!.push(row)
  }

  return order.map(id => {
    const group = [...groups.get(id)!].sort((a, b) => a[1].localeCompare(b[1]))
    if (group.length === 1) return group[0]

    const merged = [...group[group.length - 1]]
    for (const col of RAW_ROW_CHECKBOX_COLS) {
      merged[col] = group.some(r => r[col] === 'V') ? 'V' : ''
    }
    for (const col of RAW_ROW_TEXT_JOIN_COLS) {
      merged[col] = joinWithDivider(group.map(r => r[col]))
    }
    return merged
  })
}

// 把每筆雲端列（25 欄衛生局格式 + 個案姓名）裁成 25 欄；同一筆紀錄（依身分證字號＋日期判斷）以雲端資料為準，
// 因為使用者可能直接在 Google Sheet 上更正錯誤上傳的個案，本機快取的舊資料不應覆蓋雲端的修正內容。
// 再依身分證字號合併同月份的多筆列，確保最終每個個案每月只留一筆。
export function mergeRemoteRows(localRows: string[][], remoteRows: string[][]): string[][] {
  const merged = new Map<string, string[]>()
  for (const row of localRows) {
    merged.set(`${row[0]}|${row[1]}`, row)
  }
  for (const row of remoteRows.map(r => r.slice(0, 25))) {
    merged.set(`${row[0]}|${row[1]}`, row)
  }
  return mergeRawHealthBureauRows(Array.from(merged.values())).sort((a, b) => a[1].localeCompare(b[1]))
}
