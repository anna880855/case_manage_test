'use client'
import { useState } from 'react'
import { useStore, DEFAULT_SENTENCES } from '@/lib/store'

export default function SettingsPage() {
  const { settings, updateSettings, sentences, addSentence, deleteSentence, setSentences } = useStore()
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState('')
  const [newSentence, setNewSentence] = useState({ category: '', text: '' })
  const [resetDone, setResetDone] = useState(false)

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
    addSentence({
      id: Date.now().toString(),
      category: newSentence.category.trim(),
      text: newSentence.text.trim(),
    })
    setNewSentence({ category: '', text: '' })
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-700">電訪句型管理</h3>
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

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-gray-600 mb-2">新增句型</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSentence.category}
              onChange={e => setNewSentence(prev => ({ ...prev, category: e.target.value }))}
              placeholder="分類"
              list="cat-list"
              className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a3bcaa]"
            />
            <datalist id="cat-list">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
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
        </div>

        <div className="space-y-4">
          {categories.map(cat => (
            <div key={cat}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{cat}</p>
              <div className="space-y-1">
                {sentences.filter(s => s.category === cat).map(s => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg group">
                    <p className="flex-1 text-sm text-gray-700">{s.text}</p>
                    <button
                      onClick={() => deleteSentence(s.id)}
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
