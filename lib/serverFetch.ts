// 呼叫 Apps Script Web App 的共用工具：連線例外或 5xx（Google 那端暫時出錯）時自動重試幾次，
// 並把每次失敗的狀態碼／回應內容／時間記下來，方便從伺服器 log 判斷
// 是「Apps Script 併發限制」「部署傳播延遲」還是其他瞬斷問題，而不用只憑一個 HTTP 404 字串猜測。
//
// 4xx（含 404）不重試、直接失敗：這類狀態碼多半代表部署網址本身失效或設定錯誤，
// 重試並不會讓它變好，只會白白拉長等待時間；若剛好卡在 Vercel serverless function
// 的執行時間上限（Hobby 方案預設 10 秒）附近，反而會讓原本能快速顯示錯誤訊息的請求
// 直接被砍斷、變成完全沒有回應，比不重試時更糟。重試次數與間隔也刻意壓低，
// 讓最差情況下多花的時間有限，不會把原本能準時回應的請求拖到逾時。
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { retries?: number; delayMs?: number; label?: string } = {}
): Promise<Response> {
  const { retries = 1, delayMs = 400, label = url } = opts
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

      // 4xx 是用戶端/部署設定問題，不是瞬斷，重試沒有意義，直接放棄
      if (res.status >= 400 && res.status < 500) break
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
