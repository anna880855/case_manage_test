// 長照服務大項目，供「個案服務項目」勾選與電訪句型庫的 serviceType 篩選共用同一份清單
export const SERVICE_TYPES = ['居家照顧', '日間照顧', '交通車服務', '喘息服務'] as const

export interface Case {
  id: string
  name: string
  caseNumber: string
  phone: string
  address: string
  birthDate: string
  idNumber: string
  gender?: string
  status: 'active' | 'suspended' | 'closed'
  careLevel: string
  disability: string
  disabilityExpiry?: string
  guardian: string
  guardianPhone: string
  notes: string
  services: string[]
  caseHomeServices?: { id: string; category: string; code: string; name: string; units: string; expectedTime?: string }[]
  lastHomeVisitDate?: string
  lastHomeVisitContent?: string
  lastPhoneVisitDate?: string
  lastPhoneVisitContent?: string
  physicalStatus?: string
  shortGoal?: string
  midGoal?: string
  longGoal?: string
  responsibleWorker?: string
}

export interface HealthBureauFields {
  serviceItems: {
    adjustPlan: boolean
    consultComplaint: boolean
    referral: boolean
    other: boolean
    otherNote: string
  }
  serviceFocus: {
    trackLinkage: boolean
    planDiscussion: boolean
    resourceLink: boolean
    consultComplaint: boolean
    acceptComplaint: boolean
    other: boolean
    otherNote: string
  }
  serviceTarget: {
    user: boolean
    caregiver: boolean
  }
  trackingAdaptation: string
  goalAchievement: string
  planAppropriateness: string
  otherHandling: string
}

export const EMPTY_HEALTH_BUREAU_FIELDS: HealthBureauFields = {
  serviceItems: { adjustPlan: false, consultComplaint: false, referral: false, other: false, otherNote: '' },
  serviceFocus: { trackLinkage: false, planDiscussion: false, resourceLink: false, consultComplaint: false, acceptComplaint: false, other: false, otherNote: '' },
  serviceTarget: { user: false, caregiver: false },
  trackingAdaptation: '',
  goalAchievement: '',
  planAppropriateness: '',
  otherHandling: '無',
}

export interface PhoneVisitRecord {
  id: string
  caseId: string
  caseName: string
  date: string
  target: string
  content: string
  createdAt: string
  healthBureau?: HealthBureauFields
}

export interface HomeVisitRecord {
  id: string
  caseId: string
  caseName: string
  date: string
  planContent: string
  createdAt: string
  // Structured fields
  visitTarget?: string
  diseaseHistory?: string
  caseSummary?: string
  caregiverInfo?: string
  problemList?: string[]
  problemExplanations?: string
  serviceGoals?: { short: string; mid: string; long: string }
  serviceDetail?: {
    services: { id: string; category: string; code: string; name: string; units: string; expectedTime?: string }[]
    transportEnabled: boolean
    transportation: string
    transportHospital: string
    transportExpectedTime: string
    aidsDetail: string
    aidsExpectedTime: string
    respiteEnabled: boolean
    respiteDetail: string
    respiteExpectedTime: string
    referral: string
  }
}

export interface Sentence {
  id: string
  category: string
  serviceType?: string
  text: string
}

export const REFERRAL_TYPES = ['醫事/社照C據點', '失智據點', '失智共照中心', '到宅牙醫', '其他'] as const

export type ReferralTrackingStatus = 'pending' | 'accepted' | 'declined'

export interface ReferralRecord {
  id: string
  caseId: string
  caseName: string
  date: string // 個管核章/日期（轉介建立日期）
  referralTypes: string[]
  referralTypeOtherNote: string
  receivingUnit: string // 收案單位
  contactPersonType: 'self' | 'guardian' // 聯絡電話：本人 / 主要聯絡人
  relationship: string // 主要聯絡人與個案關係
  caseOverview: string // 個案概況（近三個月身心、家庭概況）
  referralNeeds: string // 轉介需求
  managerName: string // 個管核章姓名（建立當下的個管師姓名）
  createdAt: string
  // 追蹤（回覆單）
  trackingStatus: ReferralTrackingStatus
  trackingNote: string // 無法提供服務原因／處理情形
  trackingDate: string // 回覆日期
}

export const EMPTY_REFERRAL_TRACKING = {
  trackingStatus: 'pending' as ReferralTrackingStatus,
  trackingNote: '',
  trackingDate: '',
}

export type ProfessionalServiceStatus = 'active' | 'completed' | 'stopped'

// 追蹤類型：專業服務（依期程進度提醒）／輔具（依單號到期日提醒，如爬梯機每半年須換單號）
export type TrackingType = 'professional' | 'device'

export const TRACKING_TYPE_LABEL: Record<TrackingType, string> = {
  professional: '專業服務',
  device: '輔具',
}

// 輔具單號效期（月）：核發日 + 6 個月 = 到期日，到期前需重新申請換發單號
export const DEVICE_RENEWAL_MONTHS = 6

// 輔具單號到期前幾天開始提醒個管師換單號
export const DEVICE_RENEWAL_REMINDER_DAYS = 7

export interface ProfessionalServiceRecord {
  id: string
  caseId: string
  caseName: string
  trackingType: TrackingType // 未帶值視為 'professional'（沿用舊資料）
  serviceName: string // 專業服務：服務項目（如：職能治療、物理治療、營養衛教…）／輔具：輔具名稱（如：爬梯機）
  goal: string // 服務目標（輔具類型通常留空）
  startDate: string // 專業服務：計劃期程起／輔具：單號核發日
  endDate: string // 專業服務：計劃期程迄／輔具：單號到期日（核發日＋6個月，自動計算）
  orderNumber?: string // 輔具單號（僅輔具類型使用）
  plannedSessions: number // 規劃次數（輔具類型不使用）
  completedSessions: number // 已完成次數（輔具類型不使用）
  status: ProfessionalServiceStatus
  notes: string
  createdAt: string
}

// 依「核發日 + n 個月」計算到期日，回傳 yyyy-mm-dd
export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  d.setMonth(d.getMonth() + months)
  return formatDateOnly(d)
}

// 計算計劃期程進度（0~1），期程時間到達 2/3 時應提醒個管師注意（專業服務類型使用）
export function getServicePeriodProgress(record: Pick<ProfessionalServiceRecord, 'startDate' | 'endDate'>): number | null {
  if (!record.startDate || !record.endDate) return null
  const start = new Date(record.startDate).getTime()
  const end = new Date(record.endDate).getTime()
  if (isNaN(start) || isNaN(end) || end <= start) return null
  const now = Date.now()
  return Math.min(1, Math.max(0, (now - start) / (end - start)))
}

export const SERVICE_PERIOD_REMINDER_THRESHOLD = 2 / 3

// 輔具單號距到期日剩餘天數（負值代表已逾期）
export function getDeviceRenewalDaysLeft(record: Pick<ProfessionalServiceRecord, 'endDate'>): number | null {
  if (!record.endDate) return null
  const end = new Date(record.endDate).getTime()
  if (isNaN(end)) return null
  const oneDay = 24 * 60 * 60 * 1000
  return Math.ceil((end - Date.now()) / oneDay)
}

// 輔具單號是否已進入提醒區間（到期前 DEVICE_RENEWAL_REMINDER_DAYS 天內，含已逾期）
export function isDeviceRenewalDue(record: Pick<ProfessionalServiceRecord, 'endDate'>): boolean {
  const daysLeft = getDeviceRenewalDaysLeft(record)
  return daysLeft !== null && daysLeft <= DEVICE_RENEWAL_REMINDER_DAYS
}

// 統一將日期字串顯示為 yyyy-mm-dd，無法解析時原樣回傳
export function formatDateOnly(value?: string | Date | null): string {
  if (!value) return ''
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return ''
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const match = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (match) {
    const [, y, m, d] = match
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const parsed = new Date(value)
  if (isNaN(parsed.getTime())) return value
  const y = parsed.getFullYear()
  const m = String(parsed.getMonth() + 1).padStart(2, '0')
  const d = String(parsed.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export type SyncFailureKind = 'case' | 'homeVisit' | 'phoneVisit' | 'referral' | 'professionalService' | 'careGoals' | 'sentence'

export const SYNC_FAILURE_KIND_LABEL: Record<SyncFailureKind, string> = {
  case: '個案資料',
  homeVisit: '家訪紀錄',
  phoneVisit: '電訪紀錄',
  referral: '轉介紀錄',
  professionalService: '專業服務追蹤',
  careGoals: '照顧目標',
  sentence: '電訪句型庫',
}

// 一筆寫入 Google Sheet 失敗的紀錄：斷線、逾時、或 Apps Script 端錯誤時都會記一筆，
// 讓使用者可以在「同步狀態」頁面看到失敗原因，並針對單一筆重新送出，而不必整批重存。
export interface SyncFailure {
  id: string
  kind: SyncFailureKind
  label: string
  action: string
  requestBody: Record<string, unknown>
  error: string
  createdAt: string
}

export interface Settings {
  appsScriptUrl: string
  claudeApiKey: string
  organizationName: string
  organizationEmail: string
  managerName: string
  managerPhone: string
  managerIdNumber: string
  phoneVisitSheetName: string
  homeVisitSheetName: string
  referralSheetName: string
  professionalServiceSheetName: string
  sentenceSheetName: string
}
