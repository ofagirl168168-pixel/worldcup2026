// submit-rogue-score — 伺服器端驗證射門挑戰分數
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// 基本防弊：每波合理最高分估算
// 正常遊戲每波約 50~200 分，極端情況不超過 500
const MAX_SCORE_PER_WAVE = 500

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return errorRes('未授權', 401)

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: { user }, error: authErr } = await db.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !user) return errorRes('驗證失敗', 401)

    const { score, wave } = await req.json()

    // 基本驗證
    if (typeof score !== 'number' || typeof wave !== 'number') return errorRes('參數錯誤', 400)
    if (score < 0 || wave < 1) return errorRes('參數錯誤', 400)
    if (score > wave * MAX_SCORE_PER_WAVE) return errorRes('分數異常', 400)

    // 頻率限制：同一用戶 30 秒內不能提交兩次
    const { data: recent } = await db
      .from('rogue_scores')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 30000).toISOString())
      .maybeSingle()
    if (recent) return errorRes('提交太頻繁', 429)

    // 寫入分數
    const { error: insertErr } = await db.from('rogue_scores').insert({
      user_id: user.id,
      score,
      wave,
    })
    if (insertErr) throw insertErr

    return okRes({ success: true })

  } catch (e) {
    console.error(e)
    return errorRes('伺服器錯誤', 500)
  }
})

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }
}
function okRes(data: object) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
function errorRes(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}
