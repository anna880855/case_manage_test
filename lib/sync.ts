import { useStore } from './store'
import type { SyncFailure, SyncFailureKind } from './types'

interface SyncOptions {
  appsScriptUrl: string
  action: string
  // 隨 action 而異的參數（例如 fields、record、caseName…），會與 appsScriptUrl / action 併入同一個請求
  params?: Record<string, unknown>
  kind: SyncFailureKind
  label: string
  // 從「同步狀態」頁重試時帶入原本失敗紀錄的 id，成功時據此移除該筆；失敗則覆蓋更新同一筆
  retryId?: string
}

// 統一處理寫入 Google Sheet 的 API 呼叫：斷線、逾時或 Apps Script 端錯誤都不會拋例外，
// 而是記一筆到「同步狀態」清單（含明確錯誤原因與時間），方便使用者到 /sync-status 頁面
// 查看並針對單一筆重新送出，而不必整批重新操作、也不會漏掉不知道哪些資料沒同步成功。
export async function syncToAppsScript(opts: SyncOptions) {
  const { appsScriptUrl, action, params = {}, kind, label, retryId } = opts
  const requestBody = { appsScriptUrl, action, ...params }
  const { addSyncFailure, removeSyncFailure } = useStore.getState()

  if (!appsScriptUrl) {
    return { ok: true, synced: false, error: '尚未設定 Apps Script URL' }
  }

  const recordFailure = (error: string) => {
    addSyncFailure({
      id: retryId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind,
      label,
      action,
      requestBody,
      error,
      createdAt: new Date().toISOString(),
    })
  }

  try {
    const res = await fetch('/api/update-case', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })
    const data = await res.json()
    if (data.synced === false) {
      recordFailure(data.error || '同步失敗')
      return data
    }
    if (retryId) removeSyncFailure(retryId)
    return data
  } catch (e) {
    const message = e instanceof Error ? e.message : '網路連線失敗'
    recordFailure(message)
    return { ok: true, synced: false, error: message }
  }
}

// 在「同步狀態」頁重新送出已記錄的失敗項目：直接重播原本的請求內容。
// 若仍然失敗，用新的錯誤原因與時間覆蓋同一筆，而不是新增一筆重複的失敗紀錄
export async function retrySyncFailure(failure: SyncFailure) {
  const { addSyncFailure, removeSyncFailure } = useStore.getState()
  try {
    const res = await fetch('/api/update-case', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(failure.requestBody),
    })
    const data = await res.json()
    if (data.synced === false) {
      addSyncFailure({ ...failure, error: data.error || '同步失敗', createdAt: new Date().toISOString() })
      return { ok: false, error: data.error || '同步失敗' }
    }
    removeSyncFailure(failure.id)
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : '網路連線失敗'
    addSyncFailure({ ...failure, error: message, createdAt: new Date().toISOString() })
    return { ok: false, error: message }
  }
}
