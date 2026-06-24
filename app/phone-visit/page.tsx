'use client'
import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import type { Case, Sentence } from '@/lib/types'
import { AI_STYLE_GUIDE } from '@/lib/aiStyle'

const CATEGORIES = ['service', 'physical', 'family', 'plan'] as const
type PhoneCategory = typeof CATEGORIES[number]
const CATEGORY_LABELS: Record<PhoneCategory, string> = {
  service: '服務使用',
  physical: '身心狀況',
  family: '家屬照顧',
  plan: '計畫需求',
}

function buildPrompt(
  c: Case,
  pickedSentences: { category: string; text: string }[],
  customNote: string,
  target: string,
  date: string,
  managerName: string,
  planBlock: Record<PlanKey, string>
): string {
  const sentenceBlock = pickedSentences.map(s => `【${s.category}】${s.text}`).join('\n')
  return `你是一位專業的個案管理師（${managerName}），請根據以下資訊產生一份正式的電訪紀錄，使用繁體中文，語氣專業具體，150-250字。

個案資料：
- 姓名：${c.name}
- 照顧等級：${c.careLevel || ''}
- 目前服務：${c.services?.join('、') || ''}
- 主要照顧者：${c.guardian || ''}

電訪日期：${date}
電訪對象：${target || c.guardian || c.name}
電訪人員：${managerName}

本次電訪重點（請融入以下各項內容，改寫為流暢的第三人稱段落，不要分條列項）：
${sentenceBlock}
${customNote ? `\n補充說明（請一併融入）：${customNote}` : ''}

${AI_STYLE_GUIDE}

請依照以下固定格式輸出（直接輸出，不要加任何說明文字，「三、訪談內容」之後的項目請直接照抄下方內容，不要自行改寫或新增）：

一、電訪日期：${date}
二、電訪對象：${target || c.guardian || c.name}
三、訪談內容：
（150-250字流暢段落）

${PLAN_LABELS.care}：${planBlock.care}
${PLAN_LABELS.transport}：${planBlock.transport}
${PLAN_LABELS.aids}：${planBlock.aids}
${PLAN_LABELS.respite}：${planBlock.respite}
${PLAN_LABELS.referral}：${planBlock.referral}`
}

const PLAN_KEYS = ['care', 'transport', 'aids', 'respite', 'referral'] as const
type PlanKey = typeof PLAN_KEYS[number]
const PLAN_LABELS: Record<PlanKey, string> = {
  care: '一、照顧及專業服務',
  transport: '二、交通接送服務',
  aids: '三、輔具及居家無障礙環境改善',
  respite: '四、喘息服務',
  referral: '五、轉介其他資源',
}
const PLAN_DEFAULTS: Record<PlanKey, string> = {
  care: '服務穩定無須異動。',
  transport: '暫無新增照會。',
  aids: '無新增需求。',
  respite: '與案家屬確認暫無需求。',
  referral: '無轉介。',
}
const PLAN_PATTERNS: Record<PlanKey, RegExp> = {
  care: /照顧及專業服務：([^\n]*)/,
  transport: /交通接送服務：([^\n]*)/,
  aids: /輔具及居家無障礙環境改善：([^\n]*)/,
  respite: /喘息服務：([^\n]*)/,
  referral: /轉介其他資源：([^\n]*)/,
}

function parsePlanBlock(content: string): Record<PlanKey, string> {
  const result = {} as Record<PlanKey, string>
  for (const key of PLAN_KEYS) {
    const m = content.match(PLAN_PATTERNS[key])
    result[key] = m && m[1].trim() ? m[1].trim() : PLAN_DEFAULTS[key]
  }
  return result
}

type GoalKey = 'short' | 'mid' | 'long'
const GOAL_STATUSES = ['已完成', '完成＿%', '尚未完成', '持續追蹤', '無法完成'] as const
const GOAL_LABELS: Record<GoalKey, string> = { short: '短期目標', mid: '中期目標', long: '長期目標' }
const EMPTY_GOAL_TRACKING: Record<GoalKey, { status: string; percent: string }> = {
  short: { status: '', percent: '' },
  mid: { status: '', percent: '' },
  long: { status: '', percent: '' },
}

function parseGoalBlock(content: string): Record<GoalKey, { status: string; percent: string }> {
  const result = { ...EMPTY_GOAL_TRACKING }
  for (const key of (['short', 'mid', 'long'] as GoalKey[])) {
    const re = new RegExp(`${GOAL_LABELS[key]}：[^\\n]*\\n\\s*→\\s*([^\\n]*)`)
    const m = content.match(re)
    if (!m) continue
    const statusText = m[1].trim()
    const percentMatch = statusText.match(/^完成(\d+)%$/)
    if (percentMatch) {
      result[key] = { status: '完成＿%', percent: percentMatch[1] }
    } else if ((GOAL_STATUSES as readonly string[]).includes(statusText)) {
      result[key] = { status: statusText, percent: '' }
    }
  }
  return result
}

function PhoneVisitContent() {
  const searchParams = useSearchParams()
  const { cases, sentences, settings, addPhoneVisit, getPhoneVisitsByCase, updateCase } = useStore()

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const activeCases = cases.filter(c => c.status !== 'closed')
  const [selectedCaseId, setSelectedCaseId] = useState(searchParams.get('caseId') || '')
  const now = new Date()
  const [date, setDate] = useState(now.toISOString().split('T')[0])
  const [time, setTime] = useState(now.toTimeString().slice(0, 5))
  const [target, setTarget] = useState('')
  const [customNote, setCustomNote] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [caseSearch, setCaseSearch] = useState('')
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [planBlock, setPlanBlock] = useState<Record<PlanKey, string>>({ ...PLAN_DEFAULTS })

  const [goalTracking, setGoalTracking] = useState<Record<GoalKey, { status: string; percent: string }>>({ ...EMPTY_GOAL_TRACKING })
  const goalLabels = GOAL_LABELS

  const pickRandom = (pool: Sentence[], exclude?: string) => {
    const others = exclude ? pool.filter(s => s.text !== exclude) : pool
    const arr = others.length > 0 ? others : pool
    return arr[Math.floor(Math.random() * arr.length)]?.text || ''
  }

  const autoSelect = (caseObj?: Case) => {
    const newPicked: Record<string, string> = {}
    for (const cat of CATEGORIES) {
      const pool = sentences.filter(s => s.category === cat)
      if (cat === 'service') {
        // prefer sentences whose serviceType matches a case service; fall back to general sentences (no serviceType)
        const caseServices = caseObj?.services || []
        const matched = caseServices.length > 0
          ? pool.filter(s => s.serviceType && caseServices.some(svc => svc.includes(s.serviceType!) || s.serviceType!.includes(svc)))
          : []
        const general = pool.filter(s => !s.serviceType)
        const preferred = matched.length > 0 ? matched : general.length > 0 ? general : pool
        newPicked[cat] = pickRandom(preferred)
      } else {
        newPicked[cat] = pickRandom(pool)
      }
    }
    setPicked(newPicked)
  }

  // Auto-pick on mount once sentences are loaded
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mounted || sentences.length === 0) return
    if (Object.keys(picked).length > 0) return
    autoSelect()
  }, [mounted, sentences])

  const selectedCase = cases.find(c => c.id === selectedCaseId)
  const recentVisits = selectedCaseId ? getPhoneVisitsByCase(selectedCaseId).slice(0, 2) : []

  const filteredCases = useMemo(() => {
    const q = caseSearch.trim().toLowerCase()
    if (!q) return activeCases
    return activeCases.filter(c =>
      c.name.includes(q) || (c.caseNumber || '').includes(q) || (c.phone || '').includes(q)
    )
  }, [activeCases, caseSearch])

  const hasSentences = CATEGORIES.some(cat => sentences.some(s => s.category === cat))

  const swapOne = (cat: string) => {
    const pool = sentences.filter(s => s.category === cat)
    if (cat === 'service') {
      const caseServices = selectedCase?.services || []
      const matched = caseServices.length > 0
        ? pool.filter(s => s.serviceType && caseServices.some(svc => svc.includes(s.serviceType!) || s.serviceType!.includes(svc)))
        : []
      const general = pool.filter(s => !s.serviceType)
      const preferred = matched.length > 0 ? matched : general.length > 0 ? general : pool
      setPicked(prev => ({ ...prev, [cat]: pickRandom(preferred, prev[cat]) }))
      return
    }
    setPicked(prev => ({ ...prev, [cat]: pickRandom(pool, prev[cat]) }))
  }

  const handleSelectCase = (id: string) => {
    const c = cases.find(x => x.id === id)
    const prevVisits = getPhoneVisitsByCase(id)
    const prevTarget = prevVisits.length > 0 ? prevVisits[0].target : ''
    setSelectedCaseId(id)
    setCaseSearch('')
    setGenerated('')
    setSaved(false)
    setTarget(prevTarget || c?.guardian || '')
    setPlanBlock(prevVisits.length > 0 ? parsePlanBlock(prevVisits[0].content) : { ...PLAN_DEFAULTS })
    setGoalTracking(prevVisits.length > 0 ? parseGoalBlock(prevVisits[0].content) : { ...EMPTY_GOAL_TRACKING })
    autoSelect(c)
  }

  const applyPrevPlanBlock = () => {
    if (!selectedCaseId) return
    const prevVisits = getPhoneVisitsByCase(selectedCaseId)
    if (prevVisits.length > 0) setPlanBlock(parsePlanBlock(prevVisits[0].content))
  }

  const pickedSentences = CATEGORIES
    .filter(cat => picked[cat])
    .map(cat => ({ category: CATEGORY_LABELS[cat], text: picked[cat] }))

  const buildGoalBlock = () => {
    if (!selectedCase) return ''
    const goals: { key: GoalKey; text: string }[] = [
      { key: 'short' as GoalKey, text: selectedCase.shortGoal || '' },
      { key: 'mid' as GoalKey, text: selectedCase.midGoal || '' },
      { key: 'long' as GoalKey, text: selectedCase.longGoal || '' },
    ].filter(g => g.text)
    if (goals.length === 0) return ''
    const lines = goals.map(g => {
      const t = goalTracking[g.key]
      const statusText = t.status === '完成＿%' ? `完成${t.percent || '?'}%` : t.status
      return `${goalLabels[g.key]}：${g.text}\n　→ ${statusText || '（未填）'}`
    })
    return lines.join('\n')
  }

  const handleQuickCombine = () => {
    if (!selectedCase) { setError('請選擇個案'); return }
    if (pickedSentences.length === 0) { setError('句型庫為空，請先到「設定」頁面按「重設預設句型庫」'); return }
    const d = new Date(date)
    const year = d.getFullYear() - 1911
    const month = d.getMonth() + 1
    const day = d.getDate()
    const visitTarget = target || selectedCase.guardian || selectedCase.name
    const content = pickedSentences.map(s => s.text).join(pickedSentences.length > 1 ? '　' : '')
    const goalBlock = buildGoalBlock()
    const parts = [
      `一、電訪日期：民國${year}年${month}月${day}日 ${time}`,
      `二、電訪對象：${visitTarget}`,
      `三、訪談內容：\n${content}${customNote ? `　${customNote}` : ''}`,
    ]
    if (goalBlock) parts.push('', '', goalBlock)
    parts.push('', `${PLAN_LABELS.care}：${planBlock.care}
${PLAN_LABELS.transport}：${planBlock.transport}
${PLAN_LABELS.aids}：${planBlock.aids}
${PLAN_LABELS.respite}：${planBlock.respite}
${PLAN_LABELS.referral}：${planBlock.referral}`)
    const result = parts.join('\n')
    setGenerated(result)
    setSaved(false)
    setError('')
  }

  const handleGenerate = async () => {
    if (!selectedCase) { setError('請選擇個案'); return }
    if (!settings.claudeApiKey) { setError('請先在「設定」頁面填入 Claude API Key'); return }
    if (pickedSentences.length === 0) { setError('句型庫為空，請先到「設定」頁面新增電訪句型'); return }
    setGenerating(true)
    setError('')
    setGenerated('')
    setSaved(false)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: buildPrompt(selectedCase, pickedSentences, customNote, target, `${date} ${time}`, settings.managerName, planBlock),
          apiKey: settings.claudeApiKey,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const goalBlock = buildGoalBlock()
      const marker = PLAN_LABELS.care
      const markerIndex = data.content.indexOf(marker)
      const finalContent = goalBlock && markerIndex !== -1
        ? `${data.content.slice(0, markerIndex).trimEnd()}\n\n\n${goalBlock}\n\n${data.content.slice(markerIndex)}`
        : data.content + (goalBlock ? `\n\n\n${goalBlock}` : '')
      setGenerated(finalContent)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '產生失敗，請再試一次')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!selectedCase || !generated) return
    const visit = {
      id: Date.now().toString(),
      caseId: selectedCase.id,
      caseName: selectedCase.name,
      date: `${date} ${time}`,
      target: target || selectedCase.guardian || selectedCase.name,
      content: generated,
      createdAt: new Date().toISOString(),
    }
    addPhoneVisit(visit)
    updateCase(selectedCase.id, { lastPhoneVisitDate: `${date} ${time}`, lastPhoneVisitContent: generated })
    setSaved(true)
    setError('')
    if (settings.appsScriptUrl) {
      try {
        const caseRes = await fetch('/api/update-case', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appsScriptUrl: settings.appsScriptUrl,
            action: 'updateCase',
            caseName: selectedCase.name,
            caseNumber: selectedCase.caseNumber,
            fields: { lastPhoneVisitDate: `${date} ${time}`, lastPhoneVisitContent: generated },
          }),
        })
        const caseData = await caseRes.json()
        if (!caseData.synced) {
          setError(`已儲存在本機，但雲端同步失敗${caseData.error ? '：' + caseData.error : ''}。換電腦前請確認此筆紀錄已同步。`)
        }
      } catch {
        setError('已儲存在本機，但雲端同步失敗（網路錯誤）。換電腦前請確認此筆紀錄已同步。')
      }
    } else {
      setError('尚未設定 Apps Script URL，此筆紀錄只存在本機瀏覽器，換電腦將無法看到。請至「系統設定」設定後重新儲存。')
    }
  }

  if (!mounted) {
    return <div className="text-center py-20 text-gray-400 text-sm">載入中...</div>
  }

  return (
    <div className="max-w-6xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">電訪紀錄產生</h2>

      {!hasSentences && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm">
          句型庫尚無資料，請先到
          <a href="/settings" className="underline font-medium mx-1">設定頁面</a>
          新增電訪句型，才能使用本功能。
        </div>
      )}

      <div className="grid grid-cols-[280px,1fr] gap-6">
        {/* ── 左側 ── */}
        <div className="space-y-4">
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
                  onClick={() => handleSelectCase(c.id)}
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

          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">電訪日期</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">電訪時間</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">電訪對象</label>
              <input
                type="text"
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder={selectedCase?.guardian || '個案或照顧者姓名'}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
              />
            </div>
          </div>

          {selectedCase && (
            <div className="bg-[#e6ede7] rounded-xl p-4">
              <p className="font-semibold text-[#7a9985] text-sm">{selectedCase.name}</p>
              {selectedCase.careLevel && (
                <p className="text-xs text-[#7a9985]/70 mt-1">照顧等級：{selectedCase.careLevel}</p>
              )}
              {selectedCase.services && selectedCase.services.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {selectedCase.services.map((s, i) => (
                    <span key={i} className="text-xs bg-white/60 text-[#7a9985] px-1.5 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              )}
              {recentVisits.length > 0 && (
                <p className="text-xs text-[#7a9985]/50 mt-1.5">上次電訪：{recentVisits[0].date}</p>
              )}
            </div>
          )}
        </div>

        {/* ── 右側 ── */}
        <div className="space-y-4">
          {/* 句型區 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-700">本次電訪句型</h3>
                <p className="text-xs text-gray-400 mt-0.5">四個類別各隨機抽一句，可點「換一句」替換</p>
              </div>
              <button
                onClick={() => autoSelect(selectedCase)}
                disabled={!hasSentences}
                className="px-3 py-1.5 text-sm border border-[#a3bcaa] text-[#7a9985] rounded-lg hover:bg-[#e6ede7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                🔀 重新隨機
              </button>
            </div>

            {!hasSentences ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">句型庫為空，請先到「設定」新增句型</p>
              </div>
            ) : (
              <div className="space-y-2">
                {CATEGORIES.map(cat => {
                  const text = picked[cat] || ''
                  const pool = sentences.filter(s => s.category === cat)
                  return (
                    <div key={cat} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex-1 min-w-0">
                        <span className="inline-block text-xs font-semibold text-[#7a9985] bg-[#e6ede7] px-1.5 py-0.5 rounded mr-2 mb-1">
                          {CATEGORY_LABELS[cat]}
                        </span>
                        <span className="text-sm text-gray-700 leading-relaxed">
                          {text || <span className="text-gray-400 italic">（無相關句型）</span>}
                        </span>
                      </div>
                      <button
                        onClick={() => swapOne(cat)}
                        disabled={pool.length === 0}
                        className="flex-shrink-0 text-xs text-gray-400 hover:text-[#7a9985] border border-gray-200 hover:border-[#a3bcaa] rounded px-2 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        換一句
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 目標追蹤 */}
          {selectedCase && (selectedCase.shortGoal || selectedCase.midGoal || selectedCase.longGoal) && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">目標追蹤進度</h3>
              <div className="space-y-3">
                {(['short', 'mid', 'long'] as GoalKey[]).map(key => {
                  const goalText = key === 'short' ? selectedCase.shortGoal : key === 'mid' ? selectedCase.midGoal : selectedCase.longGoal
                  if (!goalText) return null
                  const tracking = goalTracking[key]
                  return (
                    <div key={key} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-semibold text-[#7a9985] mb-1">{goalLabels[key]}</p>
                      <p className="text-sm text-gray-700 mb-2">{goalText}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {GOAL_STATUSES.map(s => (
                          <button
                            key={s}
                            onClick={() => setGoalTracking(p => ({ ...p, [key]: { ...p[key], status: s } }))}
                            className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                              tracking.status === s
                                ? 'bg-[#7a9985] text-white border-[#7a9985]'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-[#a3bcaa]'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                        {tracking.status === '完成＿%' && (
                          <input
                            type="number"
                            min={0} max={100}
                            value={tracking.percent}
                            onChange={e => setGoalTracking(p => ({ ...p, [key]: { ...p[key], percent: e.target.value } }))}
                            placeholder="百分比"
                            className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]"
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 服務計劃內容追蹤 */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">
                服務計劃內容追蹤
                <span className="font-normal text-gray-400 ml-1">（可套用上次電訪內容並修改）</span>
              </label>
              <button
                onClick={applyPrevPlanBlock}
                disabled={!selectedCaseId || getPhoneVisitsByCase(selectedCaseId).length === 0}
                className="text-xs text-gray-400 hover:text-[#7a9985] border border-gray-200 hover:border-[#a3bcaa] rounded px-2 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                套用上次內容
              </button>
            </div>
            <div className="space-y-2">
              {PLAN_KEYS.map(key => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{PLAN_LABELS[key]}</label>
                  <input
                    value={planBlock[key]}
                    onChange={e => setPlanBlock(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 補充說明 */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              個案其他狀況補充
              <span className="font-normal text-gray-400 ml-1">（選填，AI 會一併融入電訪紀錄）</span>
            </label>
            <textarea
              value={customNote}
              onChange={e => setCustomNote(e.target.value)}
              placeholder="例：個案本週回診，醫師調整血壓藥劑量；照顧者反應近期較疲憊，詢問喘息服務…"
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa] resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleQuickCombine}
              disabled={!selectedCaseId || pickedSentences.length === 0 || !hasSentences}
              className="flex-1 py-3 bg-white border-2 border-[#7a9985] text-[#7a9985] rounded-xl font-semibold hover:bg-[#e6ede7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ⚡ 直接組合
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedCaseId || pickedSentences.length === 0 || !hasSentences}
              className="flex-1 py-3 bg-[#7a9985] text-white rounded-xl font-semibold hover:bg-[#50665b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  AI 改寫中…
                </>
              ) : '✨ AI 潤飾'}
            </button>
          </div>

          {generated && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">產生結果</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setGenerated(''); setSaved(false) }}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500"
                  >
                    重新產生
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(generated)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    📋 複製
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saved}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      saved ? 'bg-green-100 text-green-700' : 'bg-[#7a9985] text-white hover:bg-[#50665b]'
                    }`}
                  >
                    {saved ? '✓ 已儲存' : '💾 儲存'}
                  </button>
                </div>
              </div>
              <textarea
                value={generated}
                onChange={e => { setGenerated(e.target.value); setSaved(false) }}
                rows={12}
                className="w-full whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed bg-gray-50 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-[#a3bcaa] resize-y"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PhoneVisitPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">載入中...</div>}>
      <PhoneVisitContent />
    </Suspense>
  )
}
