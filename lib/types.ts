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
  serviceTarget: { user: true, caregiver: false },
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
}
