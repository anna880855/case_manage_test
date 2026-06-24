import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const EXTRACT_PROMPT = `這是一份「照顧管理評估量表與照顧計畫」PDF。請從中擷取個案基本資料，並只回傳一個 JSON 物件（不要加任何說明文字、不要用 markdown code block），格式如下：

{
  "name": "個案姓名",
  "idNumber": "個案身分證字號",
  "phone": "個案電話",
  "address": "居住(通訊)地址，若無則用戶籍地址",
  "birthDate": "個案生日，轉換為西元日期 YYYY-MM-DD（民國年+1911）",
  "gender": "男 或 女",
  "careLevel": "CMS等級，例：第3級",
  "disability": "身心障礙障礙類別說明",
  "disabilityExpiry": "身心障礙重新鑑定日期，轉換為西元日期 YYYY-MM-DD（民國年+1911），若無重新鑑定日期則留空字串",
  "guardian": "主要照顧者或聯絡人姓名",
  "guardianPhone": "主要照顧者或聯絡人手機",
  "notes": "簡短摘要個案疾病史與照顧重點，100字以內"
}

找不到的欄位請填空字串 ""。只回傳 JSON。`

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { apiKey, base64 } = body

  const key = process.env.ANTHROPIC_API_KEY || apiKey
  if (!key) {
    return NextResponse.json(
      { error: '請先設定 Claude API Key（設定頁面或 Vercel 環境變數 ANTHROPIC_API_KEY）' },
      { status: 400 }
    )
  }
  if (!base64) {
    return NextResponse.json({ error: '缺少 PDF 檔案' }, { status: 400 })
  }

  try {
    const client = new Anthropic({ apiKey: key })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: EXTRACT_PROMPT },
        ],
      }],
    })

    const block = message.content[0]
    if (block.type !== 'text') {
      return NextResponse.json({ error: 'AI 回應格式錯誤' }, { status: 500 })
    }

    const jsonMatch = block.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI 未回傳有效資料' }, { status: 500 })
    }
    const fields = JSON.parse(jsonMatch[0])
    return NextResponse.json({ fields })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'PDF 解析失敗'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
