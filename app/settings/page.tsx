'use client'
import { useState } from 'react'
import { useStore, DEFAULT_SENTENCES } from '@/lib/store'
import { syncToAppsScript } from '@/lib/sync'
import { SERVICE_TYPES, type Sentence } from '@/lib/types'

export default function SettingsPage() {
  const { settings, updateSettings, sentences, addSentence, updateSentence, deleteSentence, setSentences } = useStore()
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState('')
  const [newSentence, setNewSentence] = useState({ category: '', text: '', serviceType: '' })
  const [resetDone, setResetDone] = useState(false)
  const [uploadingSentences, setUploadingSentences] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')

  const categories = Array.from(new Set(sentences.map(s => s.category)))

  const handleResetSentences = () => {
    const custom = sentences.filter(s => !/^s\d+$/.test(s.id))
    setSentences([...DEFAULT_SENTENCES, ...custom])
    setResetDone(true)
    setTimeout(() => setResetDone(false), 3000)
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTestSync = async () => {
    if (!settings.appsScriptUrl) {
      setTestResult('請先填入 Apps Script URL')
      return
    }
    setTesting(true)
    setTestResult('')
    try {
      const res = await fetch(`/api/sync?url=${encodeURIComponent(settings.appsScriptUrl)}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTestResult(`✓ 連線成功！找到 ${data.cases?.length || 0} 筆個案資料`)
    } catch (e: unknown) {
      setTestResult('✗ ' + (e instanceof Error ? e.message : '連線失敗'))
    } finally {
      setTesting(false)
    }
  }

  const handleAddSentence = () => {
    if (!newSentence.category.trim() || !newSentence.text.trim()) return
    const sentence: Sentence = {
      id: Date.now().toString(),
      category: newSentence.category.trim(),
      text: newSentence.text.trim(),
      ...(newSentence.category.trim() === 'service' && newSentence.serviceType
        ? { serviceType: newSentence.serviceType }
        : {}),
    }
    addSentence(sentence)
    setNewSentence({ category: '', text: '', serviceType: '' })
    syncToAppsScript({
      appsScriptUrl: settings.appsScriptUrl,
      action: 'addSentence',
      params: { sheetName: settings.sentenceSheetName, sentence },
      kind: 'sentence',
      label: `新增句型：${sentence.text.slice(0, 20)}`,
    })
  }

  const handleUpdateSentenceServiceType = (s: Sentence, serviceType: string) => {
    // 存空字串而不是 undefined：fields 會經 JSON.stringify 送到雲端，undefined 的欄位
    // 會被序列化直接丟掉，「清空服務項目」這個動作就永遠同步不過去
    const fields = { serviceType }
    updateSentence(s.id, fields)
    syncToAppsScript({
      appsScriptUrl: settings.appsScriptUrl,
      action: 'updateSentence',
      params: { sheetName: settings.sentenceSheetName, id: s.id, fields },
      kind: 'sentence',
      label: `修改句型服務項目：${s.text.slice(0, 20)}`,
    })
  }

  const handleDeleteSentence = (s: Sentence) => {
    deleteSentence(s.id)
    syncToAppsScript({
      appsScriptUrl: settings.appsScriptUrl,
      action: 'deleteSentence',
      params: { sheetName: settings.sentenceSheetName, id: s.id },
      kind: 'sentence',
      label: `刪除句型：${s.text.slice(0, 20)}`,
    })
  }

  const handleUploadSentences = async () => {
    if (!settings.appsScriptUrl) {
      setUploadMsg('請先填入 Apps Script URL')
      setTimeout(() => setUploadMsg(''), 3000)
      return
    }
    if (!confirm(`確定要用本機目前的 ${sentences.length} 筆句型，整批覆蓋雲端的句型庫嗎？\n（雲端句型庫上原本的內容會被取代，此動作僅供第一次啟用共用句型庫時使用）`)) return
    setUploadingSentences(true)
    setUploadMsg('')
    const data = await syncToAppsScript({
      appsScriptUrl: settings.appsScriptUrl,
      action: 'setSentences',
      params: { sheetName: settings.sentenceSheetName, sentences },
      kind: 'sentence',
      label: '上傳本機句型庫到雲端',
    })
    setUploadMsg(data.synced ? `✓ 已上傳 ${sentences.length} 筆句型到雲端` : `✗ 上傳失敗${data.error ? '：' + data.error : ''}`)
    setUploadingSentences(false)
    setTimeout(() => setUploadMsg(''), 4000)
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">系統設定</h2>

      {/* Basic Info */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-5">
        <h3 className="font-semibold text-gray-700 mb-4">基本資料</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">單位名稱</label>
            <input
              type="text"
              value={settings.organizationName}
              onChange={e => updateSettings({ organizationName: e.target.value })}
              placeholder="長照機構或單位名稱"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">單位聯絡信箱</label>
            <input
              type="text"
              value={settings.organizationEmail}
              onChange={e => updateSettings({ organizationEmail: e.target.value })}
              placeholder="供轉介單匯出使用，選填"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">個管師姓名</label>
            <input
              type="text"
              value={settings.managerName}
              onChange={e => updateSettings({ managerName: e.target.value })}
              placeholder="姓名"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">個管師電話</label>
            <input
              type="text"
              value={settings.managerPhone}
              onChange={e => updateSettings({ managerPhone: e.target.value })}
              placeholder="0900000000"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">主責個管員身分證號</label>
            <input
              type="text"
              value={settings.managerIdNumber}
              onChange={e => updateSettings({ managerIdNumber: e.target.value })}
              placeholder="供衛生局電訪報表使用"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          className={`mt-4 px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
            saved ? 'bg-green-500 text-white' : 'bg-[#7a9985] text-white hover:bg-[#50665b]'
          }`}
        >
          {saved ? '✓ 已儲存' : '儲存'}
        </button>
      </div>

      {/* Google Apps Script */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-5">
        <h3 className="font-semibold text-gray-700 mb-1">Google Apps Script URL</h3>
        <p className="text-xs text-gray-400 mb-3">用於從 Google Sheet「個案資料管理」同步個案資料</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={settings.appsScriptUrl}
            onChange={e => updateSettings({ appsScriptUrl: e.target.value })}
            placeholder="https://script.google.com/macros/s/.../exec"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
          />
          <button
            onClick={handleTestSync}
            disabled={testing}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors whitespace-nowrap"
          >
            {testing ? '測試中...' : '🔌 測試連線'}
          </button>
        </div>
        {testResult && (
          <p className={`text-sm mt-2 ${testResult.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
            {testResult}
          </p>
        )}
        <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg p-4 text-sm text-amber-700">
          <p className="font-medium mb-1">📋 設定步驟</p>
          <ol className="space-y-1 text-xs">
            <li>1. 開啟 Google Sheet「個案資料管理」</li>
            <li>2. 點選「擴充功能」→「Apps Script」</li>
            <li>3. 複製 <code className="bg-amber-100 px-1 rounded">google-apps-script/Code.gs</code> 的程式碼貼入</li>
            <li>4. 修改 <code className="bg-amber-100 px-1 rounded">SHEET_NAME</code> 為您的工作表名稱</li>
            <li>5. 「部署」→「新增部署作業」→「網頁應用程式」</li>
            <li>6. 執行身分：「我」；存取：「所有人」→ 部署</li>
            <li>7. 複製網址貼到上方</li>
          </ol>
        </div>
      </div>


      {/* Claude API Key */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-5">
        <h3 className="font-semibold text-gray-700 mb-1">Claude API Key</h3>
        <p className="text-xs text-gray-400 mb-3">用於 AI 產生電訪和家訪內容。金鑰儲存於瀏覽器本地，不會上傳。</p>
        <input
          type="password"
          value={settings.claudeApiKey}
          onChange={e => updateSettings({ claudeApiKey: e.target.value })}
          placeholder="sk-ant-..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
        />
        <p className="text-xs text-gray-400 mt-2">
          到 <span className="font-medium">console.anthropic.com</span> 申請 API Key（需信用卡，約 $5 可用數百次）
        </p>
      </div>

      {/* Sentence Management */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-700">電訪句型管理</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUploadSentences}
              disabled={uploadingSentences}
              className="px-3 py-1.5 text-xs rounded-lg border text-gray-500 border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              {uploadingSentences ? '上傳中…' : '☁️ 上傳本機句型庫到雲端'}
            </button>
            <button
              onClick={handleResetSentences}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                resetDone
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {resetDone ? '✓ 已重設' : '重設預設句型庫'}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          新增、修改服務項目、刪除句型都會即時同步到雲端句型庫，其他人按「同步個案」即可取得。
          若雲端句型庫還是空的（第一次啟用），請先按「上傳本機句型庫到雲端」。
        </p>
        {uploadMsg && (
          <p className={`text-xs mb-3 ${uploadMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{uploadMsg}</p>
        )}

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-gray-600 mb-2">新增句型</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSentence.category}
              onChange={e => setNewSentence(prev => ({ ...prev, category: e.target.value, serviceType: e.target.value.trim() === 'service' ? prev.serviceType : '' }))}
              placeholder="分類"
              list="cat-list"
              className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
            />
            <datalist id="cat-list">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
            {newSentence.category.trim() === 'service' && (
              <select
                value={newSentence.serviceType}
                onChange={e => setNewSentence(prev => ({ ...prev, serviceType: e.target.value }))}
                className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
              >
                <option value="">服務項目（不限）</option>
                {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <input
              type="text"
              value={newSentence.text}
              onChange={e => setNewSentence(prev => ({ ...prev, text: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAddSentence()}
              placeholder="句型內容"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
            />
            <button
              onClick={handleAddSentence}
              className="px-4 py-2 bg-[#7a9985] text-white rounded-lg text-sm hover:bg-[#50665b] transition-colors"
            >
              新增
            </button>
          </div>
          {newSentence.category.trim() === 'service' && (
            <p className="text-xs text-gray-400 mt-2">
              服務項目：套用電訪產生器時，會優先挑選服務項目符合個案目前服務的句型；選「不限」則各種個案都可能抽到。
            </p>
          )}
        </div>

        <div className="space-y-4">
          {categories.map(cat => (
            <div key={cat}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{cat}</p>
              <div className="space-y-1">
                {sentences.filter(s => s.category === cat).map(s => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg group">
                    <p className="flex-1 text-sm text-gray-700">{s.text}</p>
                    {cat === 'service' && (
                      <select
                        value={s.serviceType || ''}
                        onChange={e => handleUpdateSentenceServiceType(s, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#a3bcaa]"
                      >
                        <option value="">服務項目（不限）</option>
                        {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    )}
                    <button
                      onClick={() => handleDeleteSentence(s)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition-opacity px-2"
                    >
                      刪除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
