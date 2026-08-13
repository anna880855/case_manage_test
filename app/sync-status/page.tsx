'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { retrySyncFailure } from '@/lib/sync'
import { SYNC_FAILURE_KIND_LABEL, type SyncFailureKind } from '@/lib/types'

const KIND_ORDER: SyncFailureKind[] = ['case', 'homeVisit', 'phoneVisit', 'referral', 'professionalService', 'careGoals']

function formatTime(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-TW', { hour12: false })
}

export default function SyncStatusPage() {
  const { syncFailures, removeSyncFailure, clearSyncFailures } = useStore()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const [retryingIds, setRetryingIds] = useState<Record<string, boolean>>({})
  const [retryingAll, setRetryingAll] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map<SyncFailureKind, typeof syncFailures>()
    for (const f of syncFailures) {
      const list = map.get(f.kind) || []
      list.push(f)
      map.set(f.kind, list)
    }
    Array.from(map.values()).forEach((list) => {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    })
    return map
  }, [syncFailures])

  const retry = async (id: string) => {
    const failure = syncFailures.find(f => f.id === id)
    if (!failure) return
    setRetryingIds(prev => ({ ...prev, [id]: true }))
    await retrySyncFailure(failure)
    setRetryingIds(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const retryAll = async () => {
    setRetryingAll(true)
    // 依序重試，避免同時大量呼叫 Apps Script 造成新的逾時／斷線
    for (const f of [...syncFailures]) {
      await retrySyncFailure(f)
    }
    setRetryingAll(false)
  }

  if (!mounted) return <div className="text-center py-20 text-gray-400 text-sm">載入中...</div>

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-gray-800">同步狀態</h2>
        {syncFailures.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={retryAll}
              disabled={retryingAll}
              className="px-4 py-2 bg-[#7a9985] text-white rounded-lg text-sm font-medium hover:bg-[#6b8a76] disabled:opacity-50 transition-colors"
            >
              {retryingAll ? '重試中...' : `全部重新同步（${syncFailures.length}）`}
            </button>
            <button
              onClick={() => { if (confirm('確定要清除所有失敗紀錄嗎？此動作不會補寫入 Google Sheet，僅移除這份清單。')) clearSyncFailures() }}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              清除清單
            </button>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-400 mb-6">
        當 Google Sheet 斷線、逾時或寫入失敗時，資料仍會保留在本機並列在這裡；請確認網路與 Apps Script 連線後按「重新同步」個別補送。
      </p>

      {syncFailures.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400">
          <p className="text-4xl mb-3">✅</p>
          <p>目前沒有同步失敗的紀錄</p>
        </div>
      ) : (
        <div className="space-y-6">
          {KIND_ORDER.filter(k => grouped.has(k)).map(kind => (
            <div key={kind}>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">
                {SYNC_FAILURE_KIND_LABEL[kind]}（{grouped.get(kind)!.length}）
              </h3>
              <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
                {grouped.get(kind)!.map(f => (
                  <div key={f.id} className="flex items-start justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{f.label}</p>
                      <p className="text-xs text-red-500 mt-0.5">失敗原因：{f.error}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatTime(f.createdAt)}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => retry(f.id)}
                        disabled={!!retryingIds[f.id] || retryingAll}
                        className="px-3 py-1.5 bg-[#7a9985] text-white rounded-lg text-xs font-medium hover:bg-[#6b8a76] disabled:opacity-50 transition-colors"
                      >
                        {retryingIds[f.id] ? '同步中...' : '重新同步'}
                      </button>
                      <button
                        onClick={() => removeSyncFailure(f.id)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        忽略
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-300 mt-8">
        <Link href="/" className="hover:underline">← 返回個案列表</Link>
      </p>
    </div>
  )
}
