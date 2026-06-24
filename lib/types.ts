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

export interface PhoneVisitRecord {
  id: string
  caseId: string
  caseName: string
  date: string
  target: string
  content: string
  createdAt: string
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
  phoneVisitSheetName: string
  homeVisitSheetName: string
}
