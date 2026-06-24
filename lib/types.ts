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
  caseHomeServices?: { id: string; category: string; code: string; name: string; units: string }[]
  lastHomeVisitDate?: string
  lastHomeVisitContent?: string
  lastPhoneVisitDate?: string
  lastPhoneVisitContent?: string
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
}

export interface Sentence {
  id: string
  category: string
  serviceType?: string
  text: string
}

export interface Settings {
  appsScriptUrl: string
  claudeApiKey: string
  organizationName: string
  managerName: string
  managerPhone: string
  managerIdNumber: string
  phoneVisitSheetName: string
  homeVisitSheetName: string
}
