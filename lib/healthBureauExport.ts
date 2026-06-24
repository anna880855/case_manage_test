import * as XLSX from 'xlsx'
import type { Case, PhoneVisitRecord } from './types'
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

export function buildHealthBureauRows(
  visits: PhoneVisitRecord[],
  cases: Case[],
  managerIdNumber: string
): string[][] {
  return visits.map(visit => {
    const c = cases.find(x => x.id === visit.caseId)
    const hb = visit.healthBureau || EMPTY_HEALTH_BUREAU_FIELDS
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
      v(hb.remindSupervisor),
      toRocDate(hb.nextCheckDate),
      hb.trackingAdaptation,
      hb.goalAchievement,
      hb.planAppropriateness,
      hb.otherHandling,
    ]
  })
}

export function exportHealthBureauXls(
  visits: PhoneVisitRecord[],
  cases: Case[],
  managerIdNumber: string,
  fileName: string
) {
  const rows = buildHealthBureauRows(visits, cases, managerIdNumber)
  const sheet = XLSX.utils.aoa_to_sheet([HEADER, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, '工作表1')
  XLSX.writeFile(workbook, fileName)
}
