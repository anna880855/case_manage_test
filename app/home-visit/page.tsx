'use client'
import React, { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import {
  DISEASE_LIST, RETURN_VISIT_METHODS, MEDICATION_STATUS_OPTIONS, MEDICATION_NOTES_OPTIONS,
  MEMORY_OPTIONS, COGNITION_OPTIONS, EMOTION_OPTIONS, CONSCIOUSNESS_OPTIONS,
  COMPREHENSION_OPTIONS, EXPRESSION_OPTIONS, VISION_OPTIONS, HEARING_OPTIONS,
  PHYSIOLOGICAL_ISSUES, TOILETING_STATUS, BOWEL_OPTIONS, INCONTINENCE_OPTIONS,
  BATHING_OPTIONS, SLEEP_OPTIONS, SLEEP_INSOMNIA_MED, SLEEP_INSOMNIA_REASON,
  AIDS_LIST, TUBES_LIST,
  MEAL_PREP_OPTIONS, EATING_METHOD_OPTIONS, TEETH_OPTIONS, UTENSIL_OPTIONS,
  CHOKING_OPTIONS, DIET_TEXTURE_OPTIONS, CALORIE_OPTIONS,
  GROSS_MOTOR_LEVELS, RISE_ABILITY_OPTIONS,
  PROBLEM_LIST, SERVICE_CATALOG, ServiceCategory,
} from './constants'
import { AI_STYLE_GUIDE } from '@/lib/aiStyle'

// ─── Helper Components ────────────────────────────────────────────────────────

function CheckGroup({ options, selected, onChange, cols = 3 }: {
  options: string[]
  selected: string[]
  onChange: (val: string[]) => void
  cols?: number
}) {
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])
  return (
    <div className={`grid gap-1.5`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {options.map(opt => (
        <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700 hover:text-[#7a9985]">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
            className="accent-[#7a9985] w-3.5 h-3.5 flex-shrink-0"
          />
          <span className="leading-tight">{opt}</span>
        </label>
      ))}
    </div>
  )
}

function RadioGroup({ options, value, onChange }: {
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(value === opt ? '' : opt)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
            value === opt
              ? 'bg-[#7a9985] text-white border-[#7a9985]'
              : 'bg-white text-gray-600 border-gray-200 hover:border-[#a3bcaa] hover:text-[#7a9985]'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function GenButton({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-[#7a9985] text-white rounded-lg text-sm font-semibold hover:bg-[#50665b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? (
        <>
          <svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          AI 產生中…
        </>
      ) : (
        <>{label}</>
      )}
    </button>
  )
}

function GeneratedText({ text, onChange }: { text: string; onChange: (t: string) => void }) {
  const [editing, setEditing] = useState(false)
  if (!text) return null
  return (
    <div className="mt-3 rounded-lg border border-[#a3bcaa]/40 bg-[#e6ede7]/30 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#e6ede7]/60 border-b border-[#a3bcaa]/30">
        <span className="text-xs font-medium text-[#7a9985]">AI 產生內容</span>
        <button
          onClick={() => setEditing(e => !e)}
          className="text-xs text-[#a3bcaa] hover:text-[#7a9985] underline"
        >
          {editing ? '完成編輯' : '編輯'}
        </button>
      </div>
      {editing ? (
        <textarea
          value={text}
          onChange={e => onChange(e.target.value)}
          rows={6}
          className="w-full p-3 text-sm text-gray-700 bg-white focus:outline-none resize-y font-sans leading-relaxed"
        />
      ) : (
        <pre className="p-3 text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{text}</pre>
      )}
    </div>
  )
}

// ─── Accordion sub-section ────────────────────────────────────────────────────

function Accordion({ title, defaultOpen = false, children }: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700 transition-colors"
      >
        {title}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="p-4 space-y-3 bg-white">{children}</div>}
    </div>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{children}</p>
}

// ─── Category badge for services ─────────────────────────────────────────────

function CatBadge({ cat }: { cat: string }) {
  const colors: Record<string, string> = {
    BA: 'bg-blue-100 text-blue-700',
    BB: 'bg-purple-100 text-purple-700',
    BC: 'bg-amber-100 text-amber-700',
    BD: 'bg-pink-100 text-pink-700',
    CA: 'bg-teal-100 text-teal-700',
    CB: 'bg-teal-100 text-teal-700',
    CC: 'bg-teal-100 text-teal-700',
    CD: 'bg-teal-100 text-teal-700',
  }
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${colors[cat] || 'bg-gray-100 text-gray-600'}`}>
      {cat}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS = ['疾病史', '個案摘述', '照顧者評估', '問題清單', '照顧目標', '照顧計畫', '產生文件']

function HomeVisitContent() {
  const searchParams = useSearchParams()
  const { cases, settings, addHomeVisit, getHomeVisitsByCase, updateCase } = useStore()

  const todayStr = new Date().toISOString().split('T')[0]
  const activeCases = cases.filter(c => c.status !== 'closed')

  // ── Case selection
  const [caseSearch, setCaseSearch] = useState('')
  const [selectedCaseId, setSelectedCaseId] = useState(searchParams.get('caseId') || '')
  const [visitTarget, setVisitTarget] = useState('')
  const [date, setDate] = useState(todayStr)
  const [activeTab, setActiveTab] = useState(0)

  // ── Disease History
  const [diseaseChecked, setDiseaseChecked] = useState<Record<string, boolean>>({})
  const [diseaseSubs, setDiseaseSubs] = useState<Record<string, string[]>>({})
  const [diseaseTexts, setDiseaseTexts] = useState<Record<string, string>>({})
  const [returnVisit, setReturnVisit] = useState<string[]>([])
  const [hospital, setHospital] = useState('')
  const [medicationStatus, setMedicationStatus] = useState<string[]>([])
  const [medicationNotes, setMedicationNotes] = useState<string[]>([])
  const [diseaseGenerated, setDiseaseGenerated] = useState('')

  // ── Basic Function
  const [memory, setMemory] = useState('')
  const [cognition, setCognition] = useState<string[]>([])
  const [emotion, setEmotion] = useState<string[]>([])
  const [consciousness, setConsciousness] = useState('')
  const [comprehension, setComprehension] = useState('')
  const [expression, setExpression] = useState<string[]>([])
  const [vision, setVision] = useState<string[]>([])
  const [hearing, setHearing] = useState<string[]>([])

  // ── Daily Function
  const [physiological, setPhysiological] = useState<string[]>([])
  const [ampLocation, setAmpLocation] = useState('')
  const [toiletingStatus, setToiletingStatus] = useState<string[]>([])
  const [bowel, setBowel] = useState<string[]>([])
  const [incontinence, setIncontinence] = useState<string[]>([])
  const [bathing, setBathing] = useState('')
  const [sleep, setSleep] = useState<string[]>([])
  const [sleepInsomniaMed, setSleepInsomniaMed] = useState<string[]>([])
  const [sleepInsomniaReason, setSleepInsomniaReason] = useState<string[]>([])
  const [aids, setAids] = useState<string[]>([])
  const [tubes, setTubes] = useState<string[]>([])
  const [residentialCare, setResidentialCare] = useState('')
  const [dialysisLocation, setDialysisLocation] = useState('')

  // ── Dietary
  const [mealPrep, setMealPrep] = useState<string[]>([])
  const [eatingMethod, setEatingMethod] = useState<string[]>([])
  const [teethStatus, setTeethStatus] = useState<string[]>([])
  const [utensilMethod, setUtensilMethod] = useState<string[]>([])
  const [tubeFeedingCans, setTubeFeedingCans] = useState('')
  const [choking, setChoking] = useState<string[]>([])
  const [dietTexture, setDietTexture] = useState<string[]>([])
  const [calories, setCalories] = useState<string[]>([])
  const [nutritionExtra, setNutritionExtra] = useState('')

  // ── Mobility
  const [grossMotor, setGrossMotor] = useState('')
  const [riseAbility, setRiseAbility] = useState('')
  const [fallFrequency, setFallFrequency] = useState('')
  const [fallCount, setFallCount] = useState('')

  // ── Case other
  const [caseOther, setCaseOther] = useState('')
  const [caseGenerated, setCaseGenerated] = useState('')

  // ── Caregiver
  const [caregiverInput, setCaregiverInput] = useState('')
  const [caregiverGenerated, setCaregiverGenerated] = useState('')

  // ── Problems
  const [selectedProblems, setSelectedProblems] = useState<string[]>([])
  const [rankedProblems, setRankedProblems] = useState<string[]>([])
  const [problemExplanations, setProblemExplanations] = useState('')

  // ── Care goals
  const [careGoals, setCareGoals] = useState({ short: '', mid: '', long: '' })
  const [goalSyncing, setGoalSyncing] = useState(false)
  const [goalSynced, setGoalSynced] = useState(false)
  // ── Care Plan
  const [serviceEnabled, setServiceEnabled] = useState(false)
  const [services, setServices] = useState<{ id: string; category: string; code: string; name: string; units: string }[]>([])
  const [showServiceDropdown, setShowServiceDropdown] = useState(false)
  const [customServiceName, setCustomServiceName] = useState('')
  const [customServiceCat, setCustomServiceCat] = useState<ServiceCategory>('BA')
  const [transportation, setTransportation] = useState('1840元/月')
  const [transportHospital, setTransportHospital] = useState('')
  const [transportEnabled, setTransportEnabled] = useState(false)
  const [aidsDetail, setAidsDetail] = useState('暫無需求')
  const [respiteEnabled, setRespiteEnabled] = useState(false)
  const [respiteStartYear, setRespiteStartYear] = useState('')
  const [respiteStartMonth, setRespiteStartMonth] = useState('')
  const [respiteEndYear, setRespiteEndYear] = useState('')
  const [respiteEndMonth, setRespiteEndMonth] = useState('')
  const [respiteAsOfMonth, setRespiteAsOfMonth] = useState('')
  const [respiteRemaining, setRespiteRemaining] = useState('')
  const [respiteItems, setRespiteItems] = useState<{ id: string; prefix: string; code: string; name: string; units: string }[]>([])
  const [referral, setReferral] = useState('暫無')

  // ── Generated / saved
  const [finalDoc, setFinalDoc] = useState('')
  const [saved, setSaved] = useState(false)
  const [syncWarning, setSyncWarning] = useState('')
  const [error, setError] = useState('')

  // ── Generating flags
  const [genDisease, setGenDisease] = useState(false)
  const [genCase, setGenCase] = useState(false)
  const [genCaregiver, setGenCaregiver] = useState(false)
  const [genProblems, setGenProblems] = useState(false)
  const [genGoals, setGenGoals] = useState(false)
  const [genFinal, setGenFinal] = useState(false)

  // ── Drafts
  const [drafts, setDrafts] = useState<{ caseNumber: string; ts: string; label: string; data: string }[]>([])
  const [draftLoading, setDraftLoading] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [showDraftSave, setShowDraftSave] = useState(false)
  const [draftLabel, setDraftLabel] = useState('')
  const [draftSyncWarning, setDraftSyncWarning] = useState('')

  // ── Derived
  const selectedCase = cases.find(c => c.id === selectedCaseId)
  const recentVisits = selectedCaseId ? getHomeVisitsByCase(selectedCaseId).slice(0, 2) : []

  const filteredCases = useMemo(() => {
    const q = caseSearch.trim().toLowerCase()
    if (!q) return activeCases
    return activeCases.filter(c =>
      c.name.includes(q) || (c.caseNumber || '').includes(q) || (c.phone || '').includes(q)
    )
  }, [activeCases, caseSearch])

  const toggle = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]

  // ── Draft helpers
  const getDraftData = () => ({
    visitTarget, date,
    diseaseChecked, diseaseSubs, diseaseTexts, returnVisit, hospital,
    medicationStatus, medicationNotes, diseaseGenerated,
    memory, cognition, emotion, consciousness, comprehension, expression, vision, hearing,
    physiological, ampLocation, toiletingStatus, bowel, incontinence, bathing,
    sleep, sleepInsomniaMed, sleepInsomniaReason, aids, tubes, residentialCare, dialysisLocation,
    mealPrep, eatingMethod, teethStatus, utensilMethod, tubeFeedingCans, choking, dietTexture, calories, nutritionExtra,
    grossMotor, riseAbility, fallFrequency, fallCount,
    caseOther, caseGenerated, caregiverInput, caregiverGenerated,
    selectedProblems, rankedProblems, problemExplanations,
    careGoals, services,
    transportation, transportHospital, transportEnabled, aidsDetail,
    respiteEnabled, respiteStartYear, respiteStartMonth, respiteEndYear, respiteEndMonth,
    respiteAsOfMonth, respiteRemaining, respiteItems,
    serviceEnabled, referral, finalDoc,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadDraftData = (d: Record<string, any>) => {
    if (d.visitTarget !== undefined) setVisitTarget(d.visitTarget)
    if (d.date) setDate(d.date)
    if (d.diseaseChecked) setDiseaseChecked(d.diseaseChecked)
    if (d.diseaseSubs) setDiseaseSubs(d.diseaseSubs)
    if (d.diseaseTexts) setDiseaseTexts(d.diseaseTexts)
    if (d.returnVisit) setReturnVisit(d.returnVisit)
    if (d.hospital !== undefined) setHospital(d.hospital)
    if (d.medicationStatus) setMedicationStatus(d.medicationStatus)
    if (d.medicationNotes) setMedicationNotes(d.medicationNotes)
    if (d.diseaseGenerated !== undefined) setDiseaseGenerated(d.diseaseGenerated)
    if (d.memory !== undefined) setMemory(d.memory)
    if (d.cognition) setCognition(d.cognition)
    if (d.emotion) setEmotion(d.emotion)
    if (d.consciousness !== undefined) setConsciousness(d.consciousness)
    if (d.comprehension !== undefined) setComprehension(d.comprehension)
    if (d.expression) setExpression(d.expression)
    if (d.vision) setVision(d.vision)
    if (d.hearing) setHearing(d.hearing)
    if (d.physiological) setPhysiological(d.physiological)
    if (d.ampLocation !== undefined) setAmpLocation(d.ampLocation)
    if (d.toiletingStatus) setToiletingStatus(d.toiletingStatus)
    if (d.bowel) setBowel(d.bowel)
    if (d.incontinence) setIncontinence(d.incontinence)
    if (d.bathing !== undefined) setBathing(d.bathing)
    if (d.sleep) setSleep(d.sleep)
    if (d.sleepInsomniaMed) setSleepInsomniaMed(d.sleepInsomniaMed)
    if (d.sleepInsomniaReason) setSleepInsomniaReason(d.sleepInsomniaReason)
    if (d.aids) setAids(d.aids)
    if (d.tubes) setTubes(d.tubes)
    if (d.residentialCare !== undefined) setResidentialCare(d.residentialCare)
    if (d.dialysisLocation !== undefined) setDialysisLocation(d.dialysisLocation)
    if (d.mealPrep) setMealPrep(d.mealPrep)
    if (d.eatingMethod) setEatingMethod(d.eatingMethod)
    if (d.teethStatus) setTeethStatus(d.teethStatus)
    if (d.utensilMethod) setUtensilMethod(d.utensilMethod)
    if (d.tubeFeedingCans !== undefined) setTubeFeedingCans(d.tubeFeedingCans)
    if (d.choking) setChoking(d.choking)
    if (d.dietTexture) setDietTexture(d.dietTexture)
    if (d.calories) setCalories(d.calories)
    if (d.nutritionExtra !== undefined) setNutritionExtra(d.nutritionExtra)
    if (d.grossMotor !== undefined) setGrossMotor(d.grossMotor)
    if (d.riseAbility !== undefined) setRiseAbility(d.riseAbility)
    if (d.fallFrequency !== undefined) setFallFrequency(d.fallFrequency)
    if (d.fallCount !== undefined) setFallCount(d.fallCount)
    if (d.caseOther !== undefined) setCaseOther(d.caseOther)
    if (d.caseGenerated !== undefined) setCaseGenerated(d.caseGenerated)
    if (d.caregiverInput !== undefined) setCaregiverInput(d.caregiverInput)
    if (d.caregiverGenerated !== undefined) setCaregiverGenerated(d.caregiverGenerated)
    if (d.selectedProblems) setSelectedProblems(d.selectedProblems)
    if (d.rankedProblems) setRankedProblems(d.rankedProblems)
    if (d.problemExplanations !== undefined) setProblemExplanations(d.problemExplanations)
    if (d.careGoals) setCareGoals(d.careGoals)
    if (d.services) setServices(d.services)
    if (d.transportation !== undefined) setTransportation(d.transportation)
    if (d.transportHospital !== undefined) setTransportHospital(d.transportHospital)
    if (d.transportEnabled !== undefined) setTransportEnabled(d.transportEnabled)
    if (d.aidsDetail !== undefined) setAidsDetail(d.aidsDetail)
    if (d.respiteEnabled !== undefined) setRespiteEnabled(d.respiteEnabled)
    if (d.respiteStartYear !== undefined) setRespiteStartYear(d.respiteStartYear)
    if (d.respiteStartMonth !== undefined) setRespiteStartMonth(d.respiteStartMonth)
    if (d.respiteEndYear !== undefined) setRespiteEndYear(d.respiteEndYear)
    if (d.respiteEndMonth !== undefined) setRespiteEndMonth(d.respiteEndMonth)
    if (d.respiteAsOfMonth !== undefined) setRespiteAsOfMonth(d.respiteAsOfMonth)
    if (d.respiteRemaining !== undefined) setRespiteRemaining(d.respiteRemaining)
    if (d.respiteItems) setRespiteItems(d.respiteItems.map((i: { id: string; prefix?: string; code: string; name: string; units: string }) => ({ ...i, prefix: i.prefix || 'GA' })))
    if (d.serviceEnabled !== undefined) setServiceEnabled(d.serviceEnabled)
    if (d.referral !== undefined) setReferral(d.referral)
    if (d.finalDoc !== undefined) setFinalDoc(d.finalDoc)
  }

  // Pre-populate services from case's last saved home visit services
  useEffect(() => {
    if (!selectedCaseId) return
    const c = cases.find(x => x.id === selectedCaseId)
    if (c?.caseHomeServices && c.caseHomeServices.length > 0) {
      setServices(c.caseHomeServices)
      setServiceEnabled(true)
    }
  }, [selectedCaseId, cases])

  // Fetch drafts when case changes
  useEffect(() => {
    if (!selectedCaseId || !settings.appsScriptUrl) { setDrafts([]); return }
    const c = cases.find(x => x.id === selectedCaseId)
    if (!c) return
    setDraftLoading(true)
    fetch(`/api/draft?url=${encodeURIComponent(settings.appsScriptUrl)}&caseNumber=${encodeURIComponent(c.caseNumber || c.id)}`)
      .then(r => r.json())
      .then(data => { if (data.ok) setDrafts(data.drafts || []) })
      .catch(() => {})
      .finally(() => setDraftLoading(false))
  }, [selectedCaseId, settings.appsScriptUrl])

  const handleSaveDraft = async () => {
    if (!selectedCase) return
    setSavingDraft(true)
    setDraftSyncWarning('')
    const ts = new Date().toISOString()
    const label = draftLabel.trim() || `${date} 草稿`
    if (!settings.appsScriptUrl) {
      setDraftSyncWarning('尚未設定 Apps Script URL，此草稿只存在本機瀏覽器，換電腦將無法看到。')
    } else {
      try {
        const res = await fetch('/api/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appsScriptUrl: settings.appsScriptUrl,
            record: {
              caseNumber: selectedCase.caseNumber || selectedCase.id,
              caseNumberRef: selectedCase.id,
              caseNameRef: selectedCase.name,
              ts,
              label,
              data: JSON.stringify(getDraftData()),
            },
          }),
        })
        const data = await res.json()
        if (!data.synced) {
          setDraftSyncWarning(`草稿已存在本機，但雲端同步失敗${data.error ? '：' + data.error : ''}。換電腦前請確認此草稿已同步。`)
        }
      } catch {
        setDraftSyncWarning('草稿已存在本機，但雲端同步失敗（網路錯誤）。換電腦前請確認此草稿已同步。')
      }
    }
    setDrafts(prev => [...prev, { caseNumber: selectedCase.caseNumber || selectedCase.id, ts, label, data: JSON.stringify(getDraftData()) }])
    setSavingDraft(false)
    setShowDraftSave(false)
    setDraftLabel('')
  }

  const handleDeleteDraft = async (ts: string) => {
    if (!selectedCase) return
    const caseNumber = selectedCase.caseNumber || selectedCase.id
    setDrafts(prev => prev.filter(d => d.ts !== ts))
    try {
      await fetch('/api/draft', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appsScriptUrl: settings.appsScriptUrl, caseNumber, ts }),
      })
    } catch {}
  }

  // ── AI helper
  const callAI = async (prompt: string): Promise<string> => {
    if (!settings.claudeApiKey) throw new Error('請先在「設定」頁面填入 Claude API Key')
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, apiKey: settings.claudeApiKey }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data.content
  }

  const withError = async (fn: () => Promise<void>) => {
    setError('')
    try { await fn() } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '產生失敗，請再試一次')
    }
  }

  // ── Disease AI
  const handleGenDisease = () => withError(async () => {
    setGenDisease(true)
    try {
      const diseaseLines = DISEASE_LIST
        .filter(d => diseaseChecked[d.key])
        .map(d => {
          let line = d.label
          const subs = diseaseSubs[d.key] || []
          if (subs.length) line += `（${subs.join('、')}）`
          if (d.hasText && diseaseTexts[d.key]) line += `：${diseaseTexts[d.key]}`
          return line
        })
      const prompt = `你是一位專業長照個案管理師，請根據以下疾病史資訊，以繁體中文撰寫2-4句臨床疾病史描述段落，語氣客觀專業，不要分條列項。

診斷疾病：${diseaseLines.join('、') || '無'}
就醫方式：${returnVisit.join('、') || '未填'}
就診醫院：${hospital || '未填'}
用藥狀況：${medicationStatus.join('、') || '未填'}
用藥注意事項：${medicationNotes.join('、') || '無'}

${AI_STYLE_GUIDE}

請直接輸出段落文字，不要標題或前置說明。`
      setDiseaseGenerated(await callAI(prompt))
    } finally { setGenDisease(false) }
  })

  // ── Case AI
  const handleGenCase = () => withError(async () => {
    setGenCase(true)
    try {
      const prompt = `你是一位專業長照個案管理師，請根據以下個案功能評估資訊，以繁體中文撰寫4-6句臨床個案摘述，語氣客觀，不分條列項。

【基本功能】
記憶力：${memory || '未填'}；認知：${cognition.join('、') || '正常'}；情緒：${emotion.join('、') || '未填'}
意識：${consciousness || '未填'}；理解：${comprehension || '未填'}；表達：${expression.join('、') || '未填'}
視力：${vision.join('、') || '未填'}；聽力：${hearing.join('、') || '未填'}

【生活功能】
生理問題：${physiological.join('、') || '無'}${physiological.includes('截肢') && ampLocation ? `（${ampLocation}）` : ''}
如廁：${toiletingStatus.join('、') || '未填'}；排便：${bowel.join('、') || '未填'}；失禁：${incontinence.join('、') || '無'}
沐浴：${bathing || '未填'}；睡眠：${sleep.join('、') || '未填'}
${sleep.includes('失眠') ? `失眠用藥：${sleepInsomniaMed.join('、') || '無'}；失眠原因：${sleepInsomniaReason.join('、') || '未填'}` : ''}
輔具：${aids.join('、') || '無'}；管路：${tubes.join('、') || '無'}
${tubes.includes('洗腎廔管') ? `洗腎地點：${dialysisLocation}` : ''}
居家照顧：${residentialCare || '未填'}

【飲食狀況】
備餐方式：${mealPrep.join('、') || '未填'}；進食方式：${eatingMethod.join('、') || '未填'}
${eatingMethod.includes('由口進食') ? `牙齒：${teethStatus.join('、') || '未填'}；餐具：${utensilMethod.join('、') || '未填'}` : ''}
${(eatingMethod.includes('鼻胃管灌') || eatingMethod.includes('胃造廔口')) ? `管灌罐數：${tubeFeedingCans}/天` : ''}
嗆咳：${choking.join('、') || '無'}；飲食質地：${dietTexture.join('、') || '未填'}；熱量：${calories.join('、') || '未填'}
${calories.includes('另有其他營養來源') ? `額外營養：${nutritionExtra}` : ''}

【活動能力】
粗大動作：${grossMotor || '未填'}；起身能力：${riseAbility || '未填'}
跌倒頻率：${fallFrequency || '未填'}${fallCount ? `，${fallCount}次` : ''}

【其他】${caseOther || '無'}

${AI_STYLE_GUIDE}

請直接輸出段落文字，不要標題或前置說明。`
      setCaseGenerated(await callAI(prompt))
    } finally { setGenCase(false) }
  })

  // ── Caregiver AI
  const handleGenCaregiver = () => withError(async () => {
    setGenCaregiver(true)
    try {
      const prompt = `你是一位專業長照個案管理師，請將以下照顧者評估文字潤飾為3-4句臨床專業描述，使用繁體中文，語氣客觀，不要分條列項：

${caregiverInput}

${AI_STYLE_GUIDE}

請直接輸出潤飾後的文字，不要前置說明。`
      setCaregiverGenerated(await callAI(prompt))
    } finally { setGenCaregiver(false) }
  })

  // ── Problems AI
  const handleGenProblems = () => withError(async () => {
    setGenProblems(true)
    try {
      const context = [
        diseaseGenerated && `疾病史：${diseaseGenerated}`,
        caseGenerated && `個案狀況：${caseGenerated}`,
        caregiverGenerated && `照顧者評估：${caregiverGenerated}`,
      ].filter(Boolean).join('\n')
      const prompt = `你是一位專業長照個案管理師，請針對以下照顧問題清單，結合個案摘述，為每個問題撰寫一句具體的臨床說明（說明原因或影響），以繁體中文輸出。

${context ? `【個案摘述】\n${context}\n\n` : ''}問題清單（按優先順序）：
${rankedProblems.map((p, i) => `${i + 1}. ${p}`).join('\n')}

${AI_STYLE_GUIDE}

請以「1. 問題名稱：說明文字」格式逐條輸出，不要其他說明。`
      setProblemExplanations(await callAI(prompt))
    } finally { setGenProblems(false) }
  })

  // ── Goals AI
  const handleGenGoals = () => withError(async () => {
    setGenGoals(true)
    try {
      const prompt = `你是一位專業長照個案管理師，請根據以下個案摘述與問題，產生短期（3個月）、中期（6個月）、長期（1年以上）的照顧目標，各一句，以繁體中文輸出。

疾病史：${diseaseGenerated || '（未產生）'}
個案狀況：${caseGenerated || '（未產生）'}
照顧者評估：${caregiverGenerated || caregiverInput || '（未填）'}
主要問題：${rankedProblems.join('、') || '（未選）'}

${AI_STYLE_GUIDE}

請以以下格式輸出：
短期目標：（內容）
中期目標：（內容）
長期目標：（內容）`
      const text = await callAI(prompt)
      const short = text.match(/短期目標[：:]\s*(.+)/)?.[1]?.trim() || ''
      const mid = text.match(/中期目標[：:]\s*(.+)/)?.[1]?.trim() || ''
      const long = text.match(/長期目標[：:]\s*(.+)/)?.[1]?.trim() || ''
      setCareGoals({ short, mid, long })
    } finally { setGenGoals(false) }
  })

  // ── Final doc — direct assembly (no second AI pass)
  const handleGenFinal = () => withError(async () => {
    setGenFinal(true)
    setSaved(false)
    try {
      const d = new Date(date)
      const year = d.getFullYear() - 1911
      const month = d.getMonth() + 1
      const day = d.getDate()
      const serviceList = serviceEnabled
        ? services.map(s => `${s.code}[${s.name}] ${s.units}單位/月`).join('；') || '（尚未填寫）'
        : '暫無需求'
      const transportDetail = transportEnabled
        ? `${transportation}，至${transportHospital || '醫療院所'}`
        : '暫無需求'
      const respiteText = respiteEnabled && respiteItems.length > 0
        ? `本案喘息額度自${respiteStartYear}年${respiteStartMonth}月至${respiteEndYear}年${respiteEndMonth}月，截至${respiteAsOfMonth}月尚餘${respiteRemaining}元。${respiteItems.map(i => `${i.prefix || 'GA'}${i.code}[${i.name}]*${i.units}單位/年`).join('；')}`
        : '暫無需求'

      const problemSection = problemExplanations
        ? problemExplanations
        : rankedProblems.map((p, i) => `${i + 1}. ${p}`).join('\n') || '（未選）'

      const doc = `一、本案於民國${year}年${month}月${day}日家訪，與${visitTarget || selectedCase?.guardian || '個案及家屬'}討論照顧計畫/個管${settings.managerName} ${settings.managerPhone}。
二、個案摘述
1.疾病史：${diseaseGenerated || '（未產生）'}
2.個案狀況：${caseGenerated || '（未產生）'}
3.主要照顧者評估：${caregiverGenerated || caregiverInput || '（未填）'}
三、照顧問題
${problemSection}
四、照顧計畫目標
1.短期目標：${careGoals.short || '（未填）'}
2.中期目標：${careGoals.mid || '（未填）'}
3.長期目標：${careGoals.long || '（未填）'}

一、照顧及專業服務：${serviceList}
二、交通接送服務：${transportDetail}
三、輔具及居家無障礙環境改善服務：${aidsDetail}
四、喘息服務/短照服務：${respiteText}
五、轉介其他資源：${referral}`

      setFinalDoc(doc)
    } finally { setGenFinal(false) }
  })

  const handleSave = async () => {
    if (!selectedCase || !finalDoc) return
    addHomeVisit({
      id: Date.now().toString(),
      caseId: selectedCase.id,
      caseName: selectedCase.name,
      date,
      planContent: finalDoc,
      createdAt: new Date().toISOString(),
    })
    const caseUpdate: Parameters<typeof updateCase>[1] = { lastHomeVisitDate: date, lastHomeVisitContent: finalDoc }
    if (careGoals.short || careGoals.mid || careGoals.long) {
      caseUpdate.shortGoal = careGoals.short
      caseUpdate.midGoal = careGoals.mid
      caseUpdate.longGoal = careGoals.long
    }
    if (services.length > 0) {
      caseUpdate.caseHomeServices = services
    }
    // 依本次家訪實際填寫內容，推算個案使用的長照服務大項目（居家照顧／日間照顧／交通車服務／喘息服務）
    const derivedServices = new Set(selectedCase.services || [])
    if (services.some(s => s.category === 'BA')) derivedServices.add('居家照顧')
    if (services.some(s => s.category === 'BB')) derivedServices.add('日間照顧')
    if (transportEnabled) derivedServices.add('交通車服務')
    if (respiteEnabled) derivedServices.add('喘息服務')
    if (derivedServices.size > 0) {
      caseUpdate.services = Array.from(derivedServices)
    }
    let caseUpdateWarning = ''
    if (Object.keys(caseUpdate).length > 0) {
      updateCase(selectedCase.id, caseUpdate)
      if (settings.appsScriptUrl) {
        try {
          const res = await fetch('/api/update-case', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appsScriptUrl: settings.appsScriptUrl,
              action: 'updateCase',
              caseName: selectedCase.name,
              caseNumber: selectedCase.caseNumber,
              fields: caseUpdate,
            }),
          })
          const data = await res.json()
          if (!data.synced) {
            caseUpdateWarning = `個案資料雲端同步失敗${data.error ? '：' + data.error : ''}。`
          }
        } catch {
          caseUpdateWarning = '個案資料雲端同步失敗（網路錯誤）。'
        }
      }
    }
    setSaved(true)
    setSyncWarning('')
    if (settings.appsScriptUrl) {
      if (caseUpdateWarning) setSyncWarning(caseUpdateWarning)
    } else {
      setSyncWarning('尚未設定 Apps Script URL，此筆紀錄只存在本機瀏覽器，換電腦將無法看到。請至「系統設定」設定後重新儲存。')
    }
  }

  const handleSyncGoals = async () => {
    if (!selectedCase) return
    setGoalSyncing(true)
    const fields = { shortGoal: careGoals.short, midGoal: careGoals.mid, longGoal: careGoals.long }
    updateCase(selectedCase.id, fields)
    try {
      const res = await fetch('/api/update-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appsScriptUrl: settings.appsScriptUrl,
          action: 'updateCase',
          caseName: selectedCase.name,
          caseNumber: selectedCase.caseNumber,
          fields,
        }),
      })
      const data = await res.json()
      if (!data.synced) {
        setSyncWarning(`照顧目標雲端同步失敗${data.error ? '：' + data.error : ''}。`)
      }
    } catch {
      setSyncWarning('照顧目標雲端同步失敗（網路錯誤）。')
    }
    setGoalSyncing(false)
    setGoalSynced(true)
    setTimeout(() => setGoalSynced(false), 3000)
  }

  // ── Service helpers
  const addServiceFromCatalog = (cat: typeof SERVICE_CATALOG[number]) => {
    setServices(prev => [...prev, { id: Date.now().toString(), category: cat.category, code: cat.code, name: cat.name, units: '' }])
    setShowServiceDropdown(false)
  }

  const addCustomService = () => {
    if (!customServiceName.trim()) return
    setServices(prev => [...prev, { id: Date.now().toString(), category: customServiceCat, code: customServiceCat, name: customServiceName.trim(), units: '' }])
    setCustomServiceName('')
    setShowServiceDropdown(false)
  }

  const updateServiceUnits = (id: string, units: string) =>
    setServices(prev => prev.map(s => s.id === id ? { ...s, units } : s))

  const removeService = (id: string) =>
    setServices(prev => prev.filter(s => s.id !== id))

  // ── Problem ranking helpers
  const addToRanked = (p: string) => {
    if (rankedProblems.includes(p) || rankedProblems.length >= 5) return
    setRankedProblems(prev => [...prev, p])
  }

  const removeFromRanked = (p: string) =>
    setRankedProblems(prev => prev.filter(x => x !== p))

  const moveRanked = (idx: number, dir: -1 | 1) => {
    const arr = [...rankedProblems]
    const target = idx + dir
    if (target < 0 || target >= arr.length) return
    ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
    setRankedProblems(arr)
  }

  // ── Tab completion dots
  const tabDone = [
    diseaseGenerated !== '',
    caseGenerated !== '',
    caregiverGenerated !== '' || caregiverInput !== '',
    rankedProblems.length > 0,
    careGoals.short !== '' || careGoals.mid !== '' || careGoals.long !== '',
    serviceEnabled,
    finalDoc !== '',
  ]

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">家訪評估記錄</h2>

      <div className="grid grid-cols-[280px,1fr] gap-6">
        {/* ── Left panel ─────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Case search */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">選擇個案</label>
            <input
              type="text"
              placeholder="搜尋姓名 / 編號…"
              value={caseSearch}
              onChange={e => setCaseSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
            />
            <div className="max-h-52 overflow-y-auto space-y-0.5">
              {filteredCases.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCaseId(c.id)
                    setCaseSearch('')
                    setFinalDoc('')
                    setSaved(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCaseId === c.id
                      ? 'bg-[#e6ede7] text-[#7a9985] font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="font-medium">{c.name}</div>
                  {c.caseNumber && <div className="text-xs text-gray-400">{c.caseNumber}</div>}
                </button>
              ))}
              {filteredCases.length === 0 && (
                <p className="text-sm text-gray-400 px-3 py-2">找不到個案</p>
              )}
            </div>
          </div>

          {/* Date + visit target */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">家訪日期</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">訪視對象</label>
              <input
                type="text"
                value={visitTarget}
                onChange={e => setVisitTarget(e.target.value)}
                placeholder={selectedCase?.guardian || '個案及家屬'}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
              />
            </div>
            <div className="text-xs text-gray-500 border-t border-gray-50 pt-2">
              <p className="font-semibold text-gray-600 mb-0.5">個管師</p>
              <p>{settings.managerName || '（未設定）'}</p>
              <p>{settings.managerPhone || ''}</p>
            </div>
          </div>

          {/* Selected case card */}
          {selectedCase && (
            <div className="bg-[#e6ede7] rounded-xl p-4">
              <p className="font-semibold text-[#7a9985]">{selectedCase.name}</p>
              {selectedCase.caseNumber && (
                <p className="text-xs text-[#7a9985]/70 mt-0.5">編號：{selectedCase.caseNumber}</p>
              )}
              {selectedCase.careLevel && (
                <p className="text-xs text-[#7a9985]/70">照顧等級：{selectedCase.careLevel}</p>
              )}
              {selectedCase.disability && (
                <p className="text-xs text-[#7a9985]/70">失能：{selectedCase.disability}</p>
              )}
              {selectedCase.guardian && (
                <p className="text-xs text-[#7a9985]/70">照顧者：{selectedCase.guardian}</p>
              )}
              {recentVisits.length > 0 && (
                <p className="text-xs text-[#7a9985]/50 mt-1.5">上次家訪：{recentVisits[0].date}</p>
              )}
            </div>
          )}

          {/* Draft panel */}
          {selectedCase && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">草稿</p>
                <button
                  onClick={() => setShowDraftSave(v => !v)}
                  className="text-xs px-2.5 py-1 bg-[#e6ede7] text-[#7a9985] rounded-lg hover:bg-[#b7e4c7] transition-colors"
                >
                  存草稿
                </button>
              </div>

              {showDraftSave && (
                <div className="mb-3 space-y-2">
                  <input
                    type="text"
                    value={draftLabel}
                    onChange={e => setDraftLabel(e.target.value)}
                    placeholder={`${date} 草稿`}
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveDraft}
                      disabled={savingDraft}
                      className="flex-1 py-1.5 text-xs bg-[#7a9985] text-white rounded-lg hover:bg-[#50665b] disabled:opacity-50"
                    >
                      {savingDraft ? '儲存中...' : '確認儲存'}
                    </button>
                    <button
                      onClick={() => { setShowDraftSave(false); setDraftLabel('') }}
                      className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              {draftSyncWarning && (
                <p className="text-xs text-amber-600 mb-3">⚠ {draftSyncWarning}</p>
              )}

              {draftLoading && <p className="text-xs text-gray-400">載入草稿中...</p>}
              {!draftLoading && drafts.length === 0 && (
                <p className="text-xs text-gray-400">尚無草稿</p>
              )}
              {drafts.map(d => (
                <div key={d.ts} className="flex items-center gap-2 py-1.5 border-t border-gray-50 first:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{d.label}</p>
                    <p className="text-xs text-gray-400">{new Date(d.ts).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <button
                    onClick={() => { try { loadDraftData(JSON.parse(d.data)) } catch {} }}
                    className="text-xs px-2 py-1 text-[#7a9985] border border-[#a3bcaa] rounded-lg hover:bg-[#e6ede7] transition-colors flex-shrink-0"
                  >
                    載入
                  </button>
                  <button
                    onClick={() => handleDeleteDraft(d.ts)}
                    className="text-xs px-2 py-1 text-red-400 border border-red-100 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    刪
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right panel ────────────────────────────────────────────────── */}
        <div className="min-w-0">
          {/* Tab bar */}
          <div className="flex flex-wrap gap-1 mb-4 bg-white rounded-xl border border-gray-100 p-2">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === i
                    ? 'bg-[#7a9985] text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tabDone[i] && activeTab !== i && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#a3bcaa] flex-shrink-0" />
                )}
                {tab}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            {/* ── Tab 0: 疾病史 ── */}
            {activeTab === 0 && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-4">疾病史</h3>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {DISEASE_LIST.map(d => (
                    <div key={d.key} className="border border-gray-100 rounded-lg p-2.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!diseaseChecked[d.key]}
                          onChange={e => setDiseaseChecked(prev => ({ ...prev, [d.key]: e.target.checked }))}
                          className="accent-[#7a9985] w-4 h-4 flex-shrink-0"
                        />
                        <span className="text-sm font-medium text-gray-700">{d.label}</span>
                      </label>

                      {diseaseChecked[d.key] && (
                        <div className="mt-2 ml-6 space-y-2">
                          {d.extra && d.extra.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {d.extra.map(sub => (
                                <label key={sub} className="flex items-center gap-1 cursor-pointer text-xs text-gray-600">
                                  <input
                                    type="checkbox"
                                    checked={(diseaseSubs[d.key] || []).includes(sub)}
                                    onChange={() =>
                                      setDiseaseSubs(prev => ({
                                        ...prev,
                                        [d.key]: toggle(prev[d.key] || [], sub),
                                      }))
                                    }
                                    className="accent-[#a3bcaa] w-3 h-3"
                                  />
                                  {sub}
                                </label>
                              ))}
                            </div>
                          )}
                          {d.hasText && (
                            <input
                              type="text"
                              placeholder={d.hasText}
                              value={diseaseTexts[d.key] || ''}
                              onChange={e =>
                                setDiseaseTexts(prev => ({ ...prev, [d.key]: e.target.value }))
                              }
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-3 mb-4 border-t border-gray-100 pt-4">
                  <div>
                    <SectionLabel>就醫方式</SectionLabel>
                    <CheckGroup options={RETURN_VISIT_METHODS} selected={returnVisit} onChange={setReturnVisit} cols={4} />
                  </div>
                  <div>
                    <SectionLabel>就診醫院</SectionLabel>
                    <input
                      type="text"
                      value={hospital}
                      onChange={e => setHospital(e.target.value)}
                      placeholder="醫院名稱"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
                    />
                  </div>
                  <div>
                    <SectionLabel>用藥狀況</SectionLabel>
                    <CheckGroup options={MEDICATION_STATUS_OPTIONS} selected={medicationStatus} onChange={setMedicationStatus} cols={2} />
                  </div>
                  <div>
                    <SectionLabel>用藥注意事項</SectionLabel>
                    <CheckGroup options={MEDICATION_NOTES_OPTIONS} selected={medicationNotes} onChange={setMedicationNotes} cols={4} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <GenButton onClick={handleGenDisease} loading={genDisease} label="✨ AI 產生疾病史" />
                </div>
                <GeneratedText text={diseaseGenerated} onChange={setDiseaseGenerated} />
              </div>
            )}

            {/* ── Tab 1: 個案摘述 ── */}
            {activeTab === 1 && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-4">個案摘述</h3>

                {/* 基本功能 */}
                <Accordion title="基本功能" defaultOpen>
                  <div>
                    <SectionLabel>記憶力</SectionLabel>
                    <RadioGroup options={MEMORY_OPTIONS} value={memory} onChange={setMemory} />
                  </div>
                  <div>
                    <SectionLabel>認知</SectionLabel>
                    <CheckGroup options={COGNITION_OPTIONS} selected={cognition} onChange={setCognition} cols={3} />
                  </div>
                  <div>
                    <SectionLabel>情緒</SectionLabel>
                    <CheckGroup options={EMOTION_OPTIONS} selected={emotion} onChange={setEmotion} cols={4} />
                  </div>
                  <div>
                    <SectionLabel>意識狀態</SectionLabel>
                    <RadioGroup options={CONSCIOUSNESS_OPTIONS} value={consciousness} onChange={setConsciousness} />
                  </div>
                  <div>
                    <SectionLabel>理解能力</SectionLabel>
                    <RadioGroup options={COMPREHENSION_OPTIONS} value={comprehension} onChange={setComprehension} />
                  </div>
                  <div>
                    <SectionLabel>表達能力</SectionLabel>
                    <CheckGroup options={EXPRESSION_OPTIONS} selected={expression} onChange={setExpression} cols={4} />
                  </div>
                  <div>
                    <SectionLabel>視力</SectionLabel>
                    <CheckGroup options={VISION_OPTIONS} selected={vision} onChange={setVision} cols={3} />
                  </div>
                  <div>
                    <SectionLabel>聽力</SectionLabel>
                    <CheckGroup options={HEARING_OPTIONS} selected={hearing} onChange={setHearing} cols={4} />
                  </div>
                </Accordion>

                {/* 生活功能 */}
                <Accordion title="生活功能">
                  <div>
                    <SectionLabel>生理問題</SectionLabel>
                    <CheckGroup options={PHYSIOLOGICAL_ISSUES} selected={physiological} onChange={setPhysiological} cols={3} />
                    {physiological.includes('截肢') && (
                      <input
                        type="text"
                        placeholder="截肢部位"
                        value={ampLocation}
                        onChange={e => setAmpLocation(e.target.value)}
                        className="mt-2 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#a3bcaa] w-full"
                      />
                    )}
                  </div>
                  <div>
                    <SectionLabel>如廁狀況</SectionLabel>
                    <CheckGroup options={TOILETING_STATUS} selected={toiletingStatus} onChange={setToiletingStatus} cols={3} />
                  </div>
                  <div>
                    <SectionLabel>排便</SectionLabel>
                    <CheckGroup options={BOWEL_OPTIONS} selected={bowel} onChange={setBowel} cols={3} />
                  </div>
                  <div>
                    <SectionLabel>失禁</SectionLabel>
                    <CheckGroup options={INCONTINENCE_OPTIONS} selected={incontinence} onChange={setIncontinence} cols={2} />
                  </div>
                  <div>
                    <SectionLabel>沐浴</SectionLabel>
                    <RadioGroup options={BATHING_OPTIONS} value={bathing} onChange={setBathing} />
                  </div>
                  <div>
                    <SectionLabel>睡眠</SectionLabel>
                    <CheckGroup options={SLEEP_OPTIONS} selected={sleep} onChange={setSleep} cols={3} />
                    {sleep.includes('失眠') && (
                      <div className="mt-2 space-y-2 ml-2 border-l-2 border-[#a3bcaa]/30 pl-3">
                        <div>
                          <SectionLabel>安眠藥物</SectionLabel>
                          <CheckGroup options={SLEEP_INSOMNIA_MED} selected={sleepInsomniaMed} onChange={setSleepInsomniaMed} cols={2} />
                        </div>
                        <div>
                          <SectionLabel>失眠原因</SectionLabel>
                          <CheckGroup options={SLEEP_INSOMNIA_REASON} selected={sleepInsomniaReason} onChange={setSleepInsomniaReason} cols={4} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <SectionLabel>輔具</SectionLabel>
                    <CheckGroup options={AIDS_LIST} selected={aids} onChange={setAids} cols={3} />
                  </div>
                  <div>
                    <SectionLabel>管路</SectionLabel>
                    <CheckGroup options={TUBES_LIST} selected={tubes} onChange={setTubes} cols={3} />
                    {tubes.includes('洗腎廔管') && (
                      <input
                        type="text"
                        placeholder="洗腎地點"
                        value={dialysisLocation}
                        onChange={e => setDialysisLocation(e.target.value)}
                        className="mt-2 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#a3bcaa] w-full"
                      />
                    )}
                  </div>
                  <div>
                    <SectionLabel>居家照顧安排</SectionLabel>
                    <textarea
                      value={residentialCare}
                      onChange={e => setResidentialCare(e.target.value)}
                      placeholder="居家照顧安排描述…"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa] resize-none"
                    />
                  </div>
                </Accordion>

                {/* 飲食狀況 */}
                <Accordion title="飲食狀況">
                  <div>
                    <SectionLabel>備餐方式</SectionLabel>
                    <CheckGroup options={MEAL_PREP_OPTIONS} selected={mealPrep} onChange={setMealPrep} cols={3} />
                  </div>
                  <div>
                    <SectionLabel>進食方式</SectionLabel>
                    <CheckGroup options={EATING_METHOD_OPTIONS} selected={eatingMethod} onChange={setEatingMethod} cols={2} />
                  </div>
                  {eatingMethod.includes('由口進食') && (
                    <div className="ml-2 border-l-2 border-[#a3bcaa]/30 pl-3 space-y-2">
                      <div>
                        <SectionLabel>牙齒狀況</SectionLabel>
                        <CheckGroup options={TEETH_OPTIONS} selected={teethStatus} onChange={setTeethStatus} cols={2} />
                      </div>
                      <div>
                        <SectionLabel>餐具使用</SectionLabel>
                        <CheckGroup options={UTENSIL_OPTIONS} selected={utensilMethod} onChange={setUtensilMethod} cols={3} />
                      </div>
                    </div>
                  )}
                  {(eatingMethod.includes('鼻胃管灌') || eatingMethod.includes('胃造廔口')) && (
                    <div>
                      <SectionLabel>管灌罐數/天</SectionLabel>
                      <input
                        type="text"
                        value={tubeFeedingCans}
                        onChange={e => setTubeFeedingCans(e.target.value)}
                        placeholder="例：3罐"
                        className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]"
                      />
                    </div>
                  )}
                  <div>
                    <SectionLabel>嗆咳</SectionLabel>
                    <CheckGroup options={CHOKING_OPTIONS} selected={choking} onChange={setChoking} cols={3} />
                  </div>
                  <div>
                    <SectionLabel>飲食質地</SectionLabel>
                    <CheckGroup options={DIET_TEXTURE_OPTIONS} selected={dietTexture} onChange={setDietTexture} cols={3} />
                  </div>
                  <div>
                    <SectionLabel>熱量/每餐</SectionLabel>
                    <CheckGroup options={CALORIE_OPTIONS} selected={calories} onChange={setCalories} cols={2} />
                    {calories.includes('另有其他營養來源') && (
                      <input
                        type="text"
                        value={nutritionExtra}
                        onChange={e => setNutritionExtra(e.target.value)}
                        placeholder="其他營養來源詳述"
                        className="mt-2 w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]"
                      />
                    )}
                  </div>
                </Accordion>

                {/* 活動能力 */}
                <Accordion title="活動能力">
                  <div>
                    <SectionLabel>粗大動作等級</SectionLabel>
                    <div className="space-y-1.5">
                      {GROSS_MOTOR_LEVELS.map(l => (
                        <label key={l} className="flex items-start gap-2 cursor-pointer text-sm text-gray-700">
                          <input
                            type="radio"
                            name="grossMotor"
                            checked={grossMotor === l}
                            onChange={() => setGrossMotor(l)}
                            className="accent-[#7a9985] mt-0.5 flex-shrink-0"
                          />
                          <span>{l}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <SectionLabel>起身能力</SectionLabel>
                    <RadioGroup options={RISE_ABILITY_OPTIONS} value={riseAbility} onChange={setRiseAbility} />
                  </div>
                  <div>
                    <SectionLabel>跌倒頻率</SectionLabel>
                    <div className="flex gap-2 items-center flex-wrap">
                      {['從未', '偶爾', '頻繁'].map(f => (
                        <button
                          key={f}
                          onClick={() => setFallFrequency(fallFrequency === f ? '' : f)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                            fallFrequency === f
                              ? 'bg-[#7a9985] text-white border-[#7a9985]'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-[#a3bcaa]'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                      {fallFrequency && fallFrequency !== '從未' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={fallCount}
                            onChange={e => setFallCount(e.target.value)}
                            placeholder="次數"
                            className="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]"
                          />
                          <span className="text-sm text-gray-500">次/年</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Accordion>

                {/* 其他 */}
                <Accordion title="其他補充">
                  <textarea
                    value={caseOther}
                    onChange={e => setCaseOther(e.target.value)}
                    placeholder="其他補充說明…"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa] resize-none"
                  />
                </Accordion>

                <div className="flex justify-end mt-2">
                  <GenButton onClick={handleGenCase} loading={genCase} label="✨ AI 產生個案摘述" />
                </div>
                <GeneratedText text={caseGenerated} onChange={setCaseGenerated} />
              </div>
            )}

            {/* ── Tab 2: 照顧者評估 ── */}
            {activeTab === 2 && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-4">照顧者評估</h3>
                <p className="text-sm text-gray-500 mb-2">請填寫照顧者狀況，AI 將協助潤飾為專業描述</p>
                <textarea
                  value={caregiverInput}
                  onChange={e => setCaregiverInput(e.target.value)}
                  placeholder="例：主要照顧者為女兒，約50歲，白天上班，晚上回家協助沐浴及備餐，照顧壓力中等，偶有喘息需求…"
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa] resize-none"
                />
                <div className="flex justify-end mt-3">
                  <GenButton onClick={handleGenCaregiver} loading={genCaregiver} label="✨ AI 潤飾" />
                </div>
                <GeneratedText text={caregiverGenerated} onChange={setCaregiverGenerated} />
              </div>
            )}

            {/* ── Tab 3: 問題清單 ── */}
            {activeTab === 3 && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-4">問題清單</h3>

                <div className="grid grid-cols-[1fr,220px] gap-4">
                  {/* Problem grid */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2">選擇問題後，點選「加入排序」加入右側前五優先清單</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PROBLEM_LIST.map(p => {
                        const inRanked = rankedProblems.includes(p)
                        const selected2 = selectedProblems.includes(p)
                        return (
                          <div
                            key={p}
                            className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-sm transition-colors ${
                              inRanked
                                ? 'border-[#7a9985] bg-[#e6ede7]'
                                : selected2
                                ? 'border-[#a3bcaa] bg-[#e6ede7]/40'
                                : 'border-gray-100 bg-white hover:border-[#a3bcaa]/50'
                            }`}
                          >
                            <label className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={selected2}
                                onChange={() =>
                                  setSelectedProblems(prev => toggle(prev, p))
                                }
                                className="accent-[#7a9985] w-3.5 h-3.5 flex-shrink-0"
                              />
                              <span className={`text-xs leading-tight ${inRanked ? 'text-[#7a9985] font-medium' : 'text-gray-700'}`}>
                                {p}
                              </span>
                            </label>
                            {selected2 && !inRanked && rankedProblems.length < 5 && (
                              <button
                                onClick={() => addToRanked(p)}
                                className="text-[10px] text-[#7a9985] border border-[#a3bcaa] rounded px-1 py-0.5 hover:bg-[#e6ede7] ml-1 flex-shrink-0"
                              >
                                排序
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Ranked panel */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">優先問題（最多5項）</p>
                    {rankedProblems.length === 0 && (
                      <p className="text-xs text-gray-400 italic">尚未加入問題</p>
                    )}
                    <div className="space-y-1.5">
                      {rankedProblems.map((p, idx) => (
                        <div
                          key={p}
                          className="flex items-center gap-1 bg-[#e6ede7] rounded-lg px-2 py-1.5 border border-[#a3bcaa]/30"
                        >
                          <span className="text-xs font-bold text-[#7a9985] w-4 flex-shrink-0">{idx + 1}</span>
                          <span className="text-xs text-[#50665b] flex-1 leading-tight">{p}</span>
                          <div className="flex gap-0.5 flex-shrink-0">
                            <button
                              onClick={() => moveRanked(idx, -1)}
                              disabled={idx === 0}
                              className="p-0.5 text-[#a3bcaa] hover:text-[#7a9985] disabled:opacity-30"
                              title="上移"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveRanked(idx, 1)}
                              disabled={idx === rankedProblems.length - 1}
                              className="p-0.5 text-[#a3bcaa] hover:text-[#7a9985] disabled:opacity-30"
                              title="下移"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => removeFromRanked(p)}
                              className="p-0.5 text-red-400 hover:text-red-600 ml-0.5"
                              title="移除"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {rankedProblems.length > 0 && (
                      <div className="mt-3">
                        <GenButton onClick={handleGenProblems} loading={genProblems} label="✨ AI 產生說明" />
                      </div>
                    )}
                  </div>
                </div>

                <GeneratedText text={problemExplanations} onChange={setProblemExplanations} />
              </div>
            )}

            {/* ── Tab 4: 照顧目標 ── */}
            {activeTab === 4 && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-4">照顧目標</h3>

                {/* Context summary */}
                {(diseaseGenerated || caseGenerated || rankedProblems.length > 0) && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1 border border-gray-100">
                    {diseaseGenerated && <p><span className="font-semibold">疾病史：</span>{diseaseGenerated.slice(0, 80)}…</p>}
                    {caseGenerated && <p><span className="font-semibold">個案狀況：</span>{caseGenerated.slice(0, 80)}…</p>}
                    {rankedProblems.length > 0 && (
                      <p><span className="font-semibold">主要問題：</span>{rankedProblems.slice(0, 3).join('、')}</p>
                    )}
                  </div>
                )}

                <div className="flex justify-end mb-4">
                  <GenButton onClick={handleGenGoals} loading={genGoals} label="✨ AI 產生照顧目標" />
                </div>

                <div className="space-y-3">
                  {(['short', 'mid', 'long'] as const).map((k) => (
                    <div key={k}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {k === 'short' ? '短期目標（3個月）' : k === 'mid' ? '中期目標（6個月）' : '長期目標（1年以上）'}
                      </label>
                      <textarea
                        value={careGoals[k]}
                        onChange={e => setCareGoals(prev => ({ ...prev, [k]: e.target.value }))}
                        placeholder={`請填寫${k === 'short' ? '短期' : k === 'mid' ? '中期' : '長期'}目標…`}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa] resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tab 5: 照顧計畫 ── */}
            {activeTab === 5 && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-4">照顧計畫</h3>

                {/* Services */}
                <div className="mb-4">
                  <SectionLabel>照顧及專業服務</SectionLabel>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={serviceEnabled}
                      onChange={e => setServiceEnabled(e.target.checked)}
                      className="accent-[#7a9985] w-4 h-4"
                      id="serviceCheck"
                    />
                    <label htmlFor="serviceCheck" className="text-sm text-gray-700 cursor-pointer">需要照顧及專業服務</label>
                  </div>
                  {serviceEnabled && <>
                  <div className="space-y-2 mb-3">
                    {services.map(s => (
                      <div key={s.id} className="flex items-center gap-2 p-2 border border-gray-100 rounded-lg bg-gray-50">
                        <CatBadge cat={s.category} />
                        <span className="text-xs text-gray-400 font-mono flex-shrink-0">{s.code}</span>
                        <span className="flex-1 text-sm text-gray-700">{s.name}</span>
                        <input
                          type="text"
                          value={s.units}
                          onChange={e => updateServiceUnits(s.id, e.target.value)}
                          placeholder="單位/月"
                          className="w-24 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]"
                        />
                        <span className="text-xs text-gray-400">單位/月</span>
                        <button
                          onClick={() => removeService(s.id)}
                          className="text-red-400 hover:text-red-600 text-sm"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {services.length === 0 && (
                      <p className="text-xs text-gray-400 italic py-2">尚未新增服務</p>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setShowServiceDropdown(d => !d)}
                      className="px-3 py-1.5 border border-[#a3bcaa] text-[#7a9985] rounded-lg text-sm hover:bg-[#e6ede7] transition-colors"
                    >
                      + 新增服務
                    </button>
                    {showServiceDropdown && (
                      <div className="absolute z-20 top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-3">
                        <p className="text-xs font-semibold text-gray-500 mb-2">從清單選擇</p>
                        <div className="space-y-1 mb-3 max-h-64 overflow-y-auto">
                          {(['BA', 'BB', 'BC', 'BD', 'CA', 'CB', 'CC', 'CD'] as const).map(grp => {
                            const items = SERVICE_CATALOG.filter(s => s.category === grp)
                            if (!items.length) return null
                            return (
                              <div key={grp}>
                                <p className="text-[10px] font-bold text-gray-400 uppercase px-1 py-0.5">{grp}</p>
                                {items.map((cat, i) => (
                                  <button
                                    key={i}
                                    onClick={() => addServiceFromCatalog(cat)}
                                    className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-gray-700 hover:bg-[#e6ede7] rounded-lg text-left"
                                  >
                                    <span className="font-mono text-gray-400 w-14 flex-shrink-0">{cat.code}</span>
                                    {cat.name}
                                  </button>
                                ))}
                              </div>
                            )
                          })}
                        </div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5 border-t border-gray-100 pt-2">自訂服務</p>
                        <div className="flex gap-2 items-center">
                          <select
                            value={customServiceCat}
                            onChange={e => setCustomServiceCat(e.target.value as ServiceCategory)}
                            className="px-1.5 py-1 border border-gray-200 rounded text-xs focus:outline-none"
                          >
                            {(['BA', 'BB', 'BC', 'BD', 'CA', 'CB', 'CC', 'CD'] as const).map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={customServiceName}
                            onChange={e => setCustomServiceName(e.target.value)}
                            placeholder="服務名稱"
                            className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]"
                            onKeyDown={e => e.key === 'Enter' && addCustomService()}
                          />
                          <button
                            onClick={addCustomService}
                            className="px-2 py-1 bg-[#7a9985] text-white rounded text-xs hover:bg-[#50665b]"
                          >
                            加入
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  </>}
                </div>

                {/* Transport */}
                <div className="mb-3 border-t border-gray-100 pt-4">
                  <SectionLabel>交通接送服務</SectionLabel>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={transportEnabled}
                      onChange={e => setTransportEnabled(e.target.checked)}
                      className="accent-[#7a9985] w-4 h-4"
                      id="transportCheck"
                    />
                    <label htmlFor="transportCheck" className="text-sm text-gray-700 cursor-pointer">需要交通接送</label>
                  </div>
                  {transportEnabled && (
                    <div className="ml-6 space-y-2">
                      <input
                        type="text"
                        value={transportation}
                        onChange={e => setTransportation(e.target.value)}
                        placeholder="費用（例：1840元/月）"
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
                      />
                      <input
                        type="text"
                        value={transportHospital}
                        onChange={e => setTransportHospital(e.target.value)}
                        placeholder="目的地醫院/機構"
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
                      />
                    </div>
                  )}
                </div>

                {/* Aids */}
                <div className="mb-3">
                  <SectionLabel>輔具及居家無障礙環境改善服務</SectionLabel>
                  <input
                    type="text"
                    value={aidsDetail}
                    onChange={e => setAidsDetail(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
                  />
                </div>

                {/* Respite */}
                <div className="mb-3">
                  <SectionLabel>喘息服務/短照服務</SectionLabel>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={respiteEnabled}
                      onChange={e => setRespiteEnabled(e.target.checked)}
                      className="accent-[#7a9985] w-4 h-4"
                      id="respiteCheck"
                    />
                    <label htmlFor="respiteCheck" className="text-sm text-gray-700 cursor-pointer">需要喘息服務</label>
                  </div>
                  {respiteEnabled && (
                    <div className="ml-2 space-y-2.5 border-l-2 border-[#a3bcaa]/30 pl-3">
                      <div>
                        <SectionLabel>額度期間</SectionLabel>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-sm text-gray-500">自</span>
                          <input type="text" value={respiteStartYear} onChange={e => setRespiteStartYear(e.target.value)} placeholder="民國年" className="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]" />
                          <span className="text-sm text-gray-500">年</span>
                          <input type="text" value={respiteStartMonth} onChange={e => setRespiteStartMonth(e.target.value)} placeholder="月" className="w-10 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]" />
                          <span className="text-sm text-gray-500">月 至</span>
                          <input type="text" value={respiteEndYear} onChange={e => setRespiteEndYear(e.target.value)} placeholder="民國年" className="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]" />
                          <span className="text-sm text-gray-500">年</span>
                          <input type="text" value={respiteEndMonth} onChange={e => setRespiteEndMonth(e.target.value)} placeholder="月" className="w-10 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]" />
                          <span className="text-sm text-gray-500">月</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-sm text-gray-500">截至</span>
                        <input type="text" value={respiteAsOfMonth} onChange={e => setRespiteAsOfMonth(e.target.value)} placeholder="月" className="w-10 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]" />
                        <span className="text-sm text-gray-500">月尚餘</span>
                        <input type="text" value={respiteRemaining} onChange={e => setRespiteRemaining(e.target.value)} placeholder="金額" className="w-24 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]" />
                        <span className="text-sm text-gray-500">元</span>
                      </div>
                      <div>
                        <SectionLabel>服務項目</SectionLabel>
                        <div className="space-y-1.5 mb-2">
                          {respiteItems.map(item => (
                            <div key={item.id} className="flex items-center gap-1 flex-wrap">
                              <select value={item.prefix || 'GA'} onChange={e => setRespiteItems(prev => prev.map(i => i.id === item.id ? { ...i, prefix: e.target.value } : i))} className="px-1.5 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]">
                                <option value="GA">GA</option>
                                <option value="SC">SC</option>
                              </select>
                              <input type="text" value={item.code} onChange={e => setRespiteItems(prev => prev.map(i => i.id === item.id ? { ...i, code: e.target.value } : i))} placeholder="代碼" className="w-14 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]" />
                              <span className="text-sm text-gray-500">[</span>
                              <input type="text" value={item.name} onChange={e => setRespiteItems(prev => prev.map(i => i.id === item.id ? { ...i, name: e.target.value } : i))} placeholder="項目名稱" className="flex-1 min-w-[100px] px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]" />
                              <span className="text-sm text-gray-500">] *</span>
                              <input type="text" value={item.units} onChange={e => setRespiteItems(prev => prev.map(i => i.id === item.id ? { ...i, units: e.target.value } : i))} placeholder="單位" className="w-14 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]" />
                              <span className="text-sm text-gray-500">單位/年</span>
                              <button onClick={() => setRespiteItems(prev => prev.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-600 ml-1">×</button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => setRespiteItems(prev => [...prev, { id: Date.now().toString(), prefix: 'GA', code: '', name: '', units: '' }])}
                          className="px-2.5 py-1 text-xs border border-[#a3bcaa] text-[#7a9985] rounded hover:bg-[#e6ede7] transition-colors"
                        >
                          + 新增項目
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Referral */}
                <div>
                  <SectionLabel>轉介其他資源</SectionLabel>
                  <input
                    type="text"
                    value={referral}
                    onChange={e => setReferral(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
                  />
                </div>
              </div>
            )}

            {/* ── Tab 6: 產生文件 ── */}
            {activeTab === 6 && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-4">產生完整家訪記錄</h3>

                {/* Summary of filled sections */}
                <div className="mb-4 grid grid-cols-2 gap-2">
                  {[
                    { label: '疾病史', done: !!diseaseGenerated },
                    { label: '個案摘述', done: !!caseGenerated },
                    { label: '照顧者評估', done: !!(caregiverGenerated || caregiverInput) },
                    { label: '問題清單', done: rankedProblems.length > 0 },
                    { label: '照顧目標', done: !!(careGoals.short || careGoals.mid || careGoals.long) },
                    { label: '照顧計畫', done: services.length > 0 },
                  ].map(({ label, done }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
                        done
                          ? 'border-[#a3bcaa] bg-[#e6ede7]/50 text-[#7a9985]'
                          : 'border-gray-100 bg-gray-50 text-gray-400'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${done ? 'bg-[#a3bcaa]' : 'bg-gray-300'}`} />
                      {label}
                      {!done && <span className="text-xs ml-auto">未完成</span>}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end mb-4">
                  <GenButton onClick={handleGenFinal} loading={genFinal} label="📄 產生完整家訪記錄" />
                </div>

                {finalDoc && (
                  <div className="border border-[#a3bcaa]/40 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#e6ede7]/60 border-b border-[#a3bcaa]/30">
                      <span className="text-sm font-semibold text-[#7a9985]">家訪記錄</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(finalDoc)}
                          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-white text-gray-600"
                        >
                          複製
                        </button>
                        <button
                          onClick={() => { setFinalDoc(''); setSaved(false) }}
                          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-white text-gray-600"
                        >
                          重新產生
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saved}
                          className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                            saved
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-[#7a9985] text-white hover:bg-[#50665b]'
                          }`}
                        >
                          {saved ? '✓ 已儲存' : '儲存'}
                        </button>
                      </div>
                    </div>
                    {syncWarning && (
                      <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
                        ⚠ {syncWarning}
                      </div>
                    )}
                    <textarea
                      value={finalDoc}
                      onChange={e => { setFinalDoc(e.target.value); setSaved(false) }}
                      rows={30}
                      className="w-full p-4 text-sm text-gray-700 font-sans leading-relaxed bg-white resize-y focus:outline-none"
                    />
                    {selectedCase && (careGoals.short || careGoals.mid || careGoals.long) && (
                      <div className="border-t border-[#a3bcaa]/30 px-4 py-3 bg-[#f0faf4]">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-[#7a9985]">更新照顧目標至個案資料</p>
                          <button
                            onClick={handleSyncGoals}
                            disabled={goalSyncing}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                              goalSynced ? 'bg-green-100 text-green-700' : 'bg-[#7a9985] text-white hover:bg-[#50665b] disabled:opacity-50'
                            }`}
                          >
                            {goalSynced ? '✓ 已更新' : goalSyncing ? '更新中...' : '同步目標'}
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {careGoals.short && (
                            <div>
                              <label className="text-xs text-gray-400">短期目標</label>
                              <input value={careGoals.short} onChange={e => setCareGoals(p => ({ ...p, short: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]" />
                            </div>
                          )}
                          {careGoals.mid && (
                            <div>
                              <label className="text-xs text-gray-400">中期目標</label>
                              <input value={careGoals.mid} onChange={e => setCareGoals(p => ({ ...p, mid: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]" />
                            </div>
                          )}
                          {careGoals.long && (
                            <div>
                              <label className="text-xs text-gray-400">長期目標</label>
                              <input value={careGoals.long} onChange={e => setCareGoals(p => ({ ...p, long: e.target.value }))} className="w-full mt-0.5 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomeVisitPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">載入中…</div>}>
      <HomeVisitContent />
    </Suspense>
  )
}
