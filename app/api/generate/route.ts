import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { prompt, apiKey } = body

  const key = process.env.ANTHROPIC_API_KEY || apiKey
  if (!key) {
    return NextResponse.json(
      { error: '請先設定 Claude API Key（設定頁面或 Vercel 環境變數 ANTHROPIC_API_KEY）' },
      { status: 400 }
    )
  }

  try {
    const client = new Anthropic({ apiKey: key })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const block = message.content[0]
    if (block.type !== 'text') {
      return NextResponse.json({ error: 'AI 回應格式錯誤' }, { status: 500 })
    }

    return NextResponse.json({ content: block.text })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI 產生失敗'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
