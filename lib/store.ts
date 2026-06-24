import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Case, PhoneVisitRecord, HomeVisitRecord, Sentence, Settings } from './types'

export const DEFAULT_SENTENCES: Sentence[] = [
  // ── service（服務使用，依長照服務大項目分類：居家照顧／日間照顧／交通車服務／喘息服務）──
  { id: 's20', category: 'service', text: '確認個案正常使用長照服務，無異常反應，服務提供穩定。' },
  { id: 's21', category: 'service', text: '個案對目前服務表示滿意，服務內容符合需求，暫無調整需求。' },
  { id: 's22', category: 'service', text: '個案目前各項長照服務使用穩定，個案及家屬均表示滿意，暫無異動需求。' },
  { id: 's23', category: 'service', serviceType: '居家照顧', text: '確認居家照顧服務正常到宅，個案表示服務員態度親切，工作內容符合期待。' },
  { id: 's24', category: 'service', text: '個案表示目前服務配置合適，頻率及內容均符合需求，暫不需調整。' },
  { id: 's25', category: 'service', text: '詢問服務使用情況，個案及家屬均表示滿意，無申訴或異動需求，服務持續穩定。' },
  { id: 's26', category: 'service', serviceType: '居家照顧', text: '個案表示對居家照顧服務人員服務品質滿意，服務時間配合良好，暫無變更需求。' },
  { id: 's27', category: 'service', serviceType: '日間照顧', text: '確認個案日間照顧服務出席正常，個案表示喜歡參與活動，適應情形良好。' },
  { id: 's53', category: 'service', serviceType: '日間照顧', text: '個案日間照顧接送及活動參與情形穩定，與其他長輩互動良好，家屬反映白天照顧負擔減輕。' },
  { id: 's54', category: 'service', serviceType: '交通車服務', text: '確認交通車接送服務準時到位，個案表示司機及隨車人員協助良好，往返就醫或日照行程順利。' },
  { id: 's55', category: 'service', serviceType: '交通車服務', text: '個案使用長照交通接送服務狀況穩定，未有延誤或異常情形，家屬表示安心。' },
  { id: 's56', category: 'service', serviceType: '喘息服務', text: '個案家屬使用喘息服務期間反映良好，照顧者得以適度休息，服務內容符合需求。' },
  { id: 's57', category: 'service', serviceType: '喘息服務', text: '確認喘息服務使用情形，家屬表示安排合適，暫無增加場次之需求。' },

  // ── physical（身心狀況）──
  { id: 's01', category: 'physical', text: '詢問近期身體狀況，個案表示穩定，無特殊不適。' },
  { id: 's02', category: 'physical', text: '個案近期按時回診，目前服藥中，各項狀況控制穩定。' },
  { id: 's03', category: 'physical', text: '個案表示近期身體較虛弱，已提醒注意休息及補充營養。' },
  { id: 's04', category: 'physical', text: '個案慢性病控制良好，血壓、血糖等指數穩定，無急性不適。' },
  { id: 's05', category: 'physical', text: '詢問個案健康狀況，個案表示睡眠及飲食均正常，精神狀態尚可。' },
  { id: 's06', category: 'physical', text: '個案表示偶有疲倦感，已提醒注意休息，若症狀持續請盡快回診。' },
  { id: 's07', category: 'physical', text: '個案近期無急診或住院紀錄，整體健康狀況維持穩定。' },
  { id: 's08', category: 'physical', text: '個案表示上週有回診，醫師評估狀況良好，藥物維持不變，繼續追蹤。' },
  { id: 's09', category: 'physical', text: '確認個案規律服藥，無漏服情形，用藥狀況穩定。' },
  { id: 's10', category: 'physical', text: '提醒個案按時服藥，個案表示了解並配合，無自行停藥情形。' },
  { id: 's11', category: 'physical', text: '個案表示按時服藥，藥物耐受性良好，無明顯不良反應。' },
  { id: 's12', category: 'physical', text: '確認個案藥物由家屬協助管理，每日核對，無漏服，用藥穩定。' },
  { id: 's13', category: 'physical', text: '個案用藥規律，已提醒勿自行調整劑量或停藥，如有不適應回診告知醫師。' },
  { id: 's14', category: 'physical', text: '日常生活起居正常，飲食規律，睡眠品質尚可，整體狀況穩定。' },
  { id: 's15', category: 'physical', text: '個案居家生活由家屬協助，照顧安排妥善，起居品質穩定。' },
  { id: 's16', category: 'physical', text: '個案表示日常作息規律，飲食均衡，整體生活品質維持良好。' },
  { id: 's17', category: 'physical', text: '個案表示近期活動量尚可，白天有適度活動，夜間睡眠狀況尚可。' },
  { id: 's18', category: 'physical', text: '個案飲食以軟質食物為主，食慾尚可，體重無明顯變化。' },
  { id: 's19', category: 'physical', text: '個案居家環境整潔，日常生活動線安全，無跌倒等意外情形。' },

  // ── family（家屬照顧）──
  { id: 's29', category: 'family', text: '個案情緒穩定，對目前生活狀況表示適應良好，無特殊困擾。' },
  { id: 's30', category: 'family', text: '個案表達情緒低落，給予傾聽與支持，並評估後續需求。' },
  { id: 's31', category: 'family', text: '個案情緒平穩，對自身健康狀況保持正向態度，無明顯焦慮情形。' },
  { id: 's32', category: 'family', text: '個案表示心情尚好，與家人互動融洽，情緒維持穩定，生活滿足感良好。' },
  { id: 's33', category: 'family', text: '詢問個案心理狀態，個案表示已能平靜接受目前身體狀況，心情尚可。' },
  { id: 's34', category: 'family', text: '個案表示近期心情較平穩，對日常生活感到滿足，無特殊心理困擾。' },
  { id: 's35', category: 'family', text: '主要照顧者表示照顧壓力尚可承受，身心狀態穩定，無立即喘息需求。' },
  { id: 's36', category: 'family', text: '照顧者反應疲憊，已告知喘息服務申請方式並協助評估。' },
  { id: 's37', category: 'family', text: '主要照顧者表示身心狀況良好，照顧工作已上手，整體照顧品質穩定。' },
  { id: 's38', category: 'family', text: '照顧者表示雖偶感疲累，但在可承受範圍內，與個案互動關係和諧。' },
  { id: 's39', category: 'family', text: '詢問照顧者身心狀況，照顧者表示已適應照顧角色，情緒穩定，照顧技巧日趨熟練。' },
  { id: 's40', category: 'family', text: '照顧者表示照顧壓力尚可負荷，家庭支持良好，已了解喘息服務相關資訊。' },
  { id: 's41', category: 'family', text: '主要照顧者與個案相處融洽，照顧關係穩定，照顧者身心狀態維持良好。' },

  // ── plan（計畫需求）──
  { id: 's42', category: 'plan', text: '詢問近期是否有額外需求，個案及家屬表示目前一切穩定，暫無新增需求。' },
  { id: 's43', category: 'plan', text: '個案提出輔具需求，已記錄並將協助評估申請，後續持續追蹤。' },
  { id: 's44', category: 'plan', text: '個案及家屬表示目前服務均符合需求，無新增輔具、環境改善或其他資源之需求。' },
  { id: 's45', category: 'plan', text: '確認個案近期無緊急就醫或特殊狀況，生活與服務均維持穩定，暫無其他需求。' },
  { id: 's46', category: 'plan', text: '詢問是否需轉介其他資源，個案表示目前所接受之服務已足夠，暫無轉介需求。' },
  { id: 's47', category: 'plan', text: '詢問個案是否有喘息服務或其他長照資源需求，個案及家屬均表示暫無需求。' },
  { id: 's48', category: 'plan', text: '告知如有任何問題可隨時聯繫個管師，個案表示了解並感謝。' },
  { id: 's49', category: 'plan', text: '提醒下次電訪或家訪時間，個案表示知悉並配合，本次電訪順利結束。' },
  { id: 's50', category: 'plan', text: '提醒個案若有任何狀況變化或需求，歡迎隨時聯繫個管師，個案表示了解。' },
  { id: 's51', category: 'plan', text: '告知個案如遇急性狀況請立即就醫並通知個管師，個案表示明白，通話愉快結束。' },
  { id: 's52', category: 'plan', text: '感謝個案及家屬配合電訪，提醒下次聯繫時間，個案表示了解，本次電訪完成。' },
]

interface StoreState {
  cases: Case[]
  phoneVisits: PhoneVisitRecord[]
  homeVisits: HomeVisitRecord[]
  sentences: Sentence[]
  settings: Settings
  disabilityReminderDismissed: Record<string, string>
}

interface StoreActions {
  setCases: (cases: Case[]) => void
  addCase: (case_: Case) => void
  updateCaseStatus: (id: string, status: Case['status']) => void
  updateCase: (id: string, fields: Partial<Case>) => void
  deleteCase: (id: string) => void
  addPhoneVisit: (visit: PhoneVisitRecord) => void
  deletePhoneVisit: (id: string) => void
  addHomeVisit: (visit: HomeVisitRecord) => void
  deleteHomeVisit: (id: string) => void
  importPhoneVisits: (visits: PhoneVisitRecord[]) => void
  importHomeVisits: (visits: HomeVisitRecord[]) => void
  addSentence: (sentence: Sentence) => void
  deleteSentence: (id: string) => void
  setSentences: (sentences: Sentence[]) => void
  updateSettings: (settings: Partial<Settings>) => void
  getCaseById: (id: string) => Case | undefined
  getPhoneVisitsByCase: (caseId: string) => PhoneVisitRecord[]
  getHomeVisitsByCase: (caseId: string) => HomeVisitRecord[]
  dismissDisabilityReminder: (caseId: string, periodKey: string) => void
}

export const useStore = create<StoreState & StoreActions>()(
  persist(
    (set, get) => ({
      cases: [],
      phoneVisits: [],
      homeVisits: [],
      sentences: DEFAULT_SENTENCES,
      settings: {
        appsScriptUrl: '',
        claudeApiKey: '',
        organizationName: '',
        managerName: '林侑萱',
        managerPhone: '0902692567',
        phoneVisitSheetName: '電訪紀錄',
        homeVisitSheetName: '家訪紀錄',
      },
      disabilityReminderDismissed: {},

      setCases: (cases) => set({ cases }),

      addCase: (case_) =>
        set((state) => ({ cases: [case_, ...state.cases] })),

      updateCaseStatus: (id, status) =>
        set((state) => ({
          cases: state.cases.map((c) => c.id === id ? { ...c, status } : c),
        })),

      updateCase: (id, fields) =>
        set((state) => ({
          cases: state.cases.map((c) => c.id === id ? { ...c, ...fields } : c),
        })),

      deleteCase: (id) =>
        set((state) => ({
          cases: state.cases.filter((c) => c.id !== id),
          phoneVisits: state.phoneVisits.filter((v) => v.caseId !== id),
          homeVisits: state.homeVisits.filter((v) => v.caseId !== id),
        })),

      addPhoneVisit: (visit) =>
        set((state) => ({ phoneVisits: [visit, ...state.phoneVisits] })),

      deletePhoneVisit: (id) =>
        set((state) => ({ phoneVisits: state.phoneVisits.filter((v) => v.id !== id) })),

      addHomeVisit: (visit) =>
        set((state) => ({ homeVisits: [visit, ...state.homeVisits] })),

      deleteHomeVisit: (id) =>
        set((state) => ({ homeVisits: state.homeVisits.filter((v) => v.id !== id) })),

      importPhoneVisits: (visits) =>
        set((state) => {
          const existingKeys = new Set(state.phoneVisits.map((v) => `${v.caseId}|${v.date}|${v.content}`))
          const toAdd = visits.filter((v) => !existingKeys.has(`${v.caseId}|${v.date}|${v.content}`))
          return { phoneVisits: [...toAdd, ...state.phoneVisits] }
        }),

      importHomeVisits: (visits) =>
        set((state) => {
          const existingKeys = new Set(state.homeVisits.map((v) => `${v.caseId}|${v.date}|${v.planContent}`))
          const toAdd = visits.filter((v) => !existingKeys.has(`${v.caseId}|${v.date}|${v.planContent}`))
          return { homeVisits: [...toAdd, ...state.homeVisits] }
        }),

      addSentence: (sentence) =>
        set((state) => ({ sentences: [...state.sentences, sentence] })),

      deleteSentence: (id) =>
        set((state) => ({ sentences: state.sentences.filter((s) => s.id !== id) })),

      setSentences: (sentences) => set({ sentences }),

      updateSettings: (settings) =>
        set((state) => ({ settings: { ...state.settings, ...settings } })),

      getCaseById: (id) => get().cases.find((c) => c.id === id),

      getPhoneVisitsByCase: (caseId) =>
        get().phoneVisits.filter((v) => v.caseId === caseId),

      getHomeVisitsByCase: (caseId) =>
        get().homeVisits.filter((v) => v.caseId === caseId),

      dismissDisabilityReminder: (caseId, periodKey) =>
        set((state) => ({
          disabilityReminderDismissed: { ...state.disabilityReminderDismissed, [caseId]: periodKey },
        })),
    }),
    {
      name: 'case-mgmt-v1',
      version: 8,
      migrate: (persistedState: unknown, version: number) => {
        let state = persistedState as StoreState & StoreActions
        if (version < 2) {
          const existing: Sentence[] = state.sentences || []
          const existingIds = new Set(existing.map((s) => s.id))
          const toAdd = DEFAULT_SENTENCES.filter((s) => !existingIds.has(s.id))
          state = { ...state, sentences: [...existing, ...toAdd] }
        }
        if (version < 3) {
          const existing: Sentence[] = state.sentences || []
          const defaultIds = new Set(DEFAULT_SENTENCES.map((s) => s.id))
          const custom = existing.filter((s) => !defaultIds.has(s.id) && !/^s\d+$/.test(s.id))
          state = { ...state, sentences: [...DEFAULT_SENTENCES, ...custom] }
        }
        if (version < 4) {
          const s = (state.settings || {}) as unknown as Record<string, unknown>
          if (!s.phoneVisitSheetName) s.phoneVisitSheetName = '電訪紀錄'
          if (!s.homeVisitSheetName) s.homeVisitSheetName = '家訪紀錄'
          state = { ...state, settings: s as unknown as Settings }
        }
        if (version < 6) {
          // refresh default service sentences: serviceType now follows 長照服務大項目
          // （居家照顧／日間照顧／交通車服務／喘息服務），舊版 s28（居家護理）一併移除
          const existing: Sentence[] = state.sentences || []
          const defaultIds = new Set(DEFAULT_SENTENCES.map((s) => s.id))
          const custom = existing.filter((s) => !defaultIds.has(s.id) && !/^s\d+$/.test(s.id))
          state = { ...state, sentences: [...DEFAULT_SENTENCES, ...custom] }
        }
        if (version < 7) {
          // 備註1／備註2 合併為單一備註欄位；開案日期欄位移除
          const existing: (Case & { notes2?: string; startDate?: string })[] = state.cases || []
          state = {
            ...state,
            cases: existing.map(({ notes2, startDate, ...rest }) => ({
              ...rest,
              notes: [rest.notes, notes2].filter(Boolean).join('\n'),
            })),
          }
        }
        if (version < 8) {
          // 移除未使用的家訪間隔月數欄位
          const existing: (Case & { homeVisitIntervalMonths?: string })[] = state.cases || []
          state = {
            ...state,
            cases: existing.map(({ homeVisitIntervalMonths, ...rest }) => rest),
          }
        }
        return state
      },
    }
  )
)
