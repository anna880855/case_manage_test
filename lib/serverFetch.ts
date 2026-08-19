// 呼叫 Apps Script Web App 的共用工具：非 2xx 或連線例外時自動重試幾次，
// 並把每次失敗的狀態碼／回應內容／時間記下來，方便從伺服器 log 判斷
// 是「Apps Script 併發限制」「部署傳播延遲」還是其他瞬斷問題，而不用只憑一個 HTTP 404 字串猜測。
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { retries?: number; delayMs?: number; label?: string } = {}
): Promise<Response> {
  const { retries = 2, delayMs = 1000, label = url } = opts
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init)
      if (res.ok) return res

      const bodySnippet = await res.text().catch(() => '')
      console.error(
        `[apps-script:${label}] 第 ${attempt + 1}/${retries + 1} 次失敗｜HTTP ${res.status}｜${new Date().toISOString()}｜回應內容：${bodySnippet.slice(0, 300)}`
      )
      lastError = new Error(`HTTP ${res.status}`)
    } catch (e) {
      console.error(
        `[apps-script:${label}] 第 ${attempt + 1}/${retries + 1} 次例外｜${new Date().toISOString()}｜${e instanceof Error ? e.message : String(e)}`
      )
      lastError = e
    }

    if (attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  throw lastError instanceof Error ? lastError : new Error('同步失敗')
}
