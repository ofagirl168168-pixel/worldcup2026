// spend-gem — 消耗寶石觀看預測分析
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// 各類型費用
const COSTS: Record<string, number> = {
  unlock_match:       1,  // 小組賽預測
  unlock_knockout:    2,  // 淘汰賽預測
  unlock_deep:        2,  // 深度分析
  first_free:         0,  // 首次免費（每用戶限一次）
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return errorRes('未授權', 401)

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: { user }, error: authErr } = await db.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !user) return errorRes('驗證失敗', 401)

    const { match_id, spend_type } = await req.json()
    if (!match_id) return errorRes('缺少 match_id', 400)

    const txType = spend_type && COSTS[spend_type] !== undefined ? spend_type : 'unlock_match'
    const cost = COSTS[txType]

    // first_free：每位用戶全站只能用一次
    if (txType === 'first_free') {
      const { data: alreadyUsed } = await db
        .from('gem_transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'first_free')
        .maybeSingle()
      if (alreadyUsed) return errorRes('首次免費已使用', 409)
    }

    // 檢查是否已解鎖（不重複扣）— 深度分析與比賽解鎖分開計算
    const typesToCheck = txType === 'unlock_deep'
      ? ['unlock_deep']
      : ['unlock_match', 'unlock_knockout', 'first_free']
    const { data: unlocked } = await db
      .from('gem_transactions')
      .select('id')
      .eq('user_id', user.id)
      .in('type', typesToCheck)
      .eq('ref_id', match_id)
      .maybeSingle()
    if (unlocked) return okRes({ already_unlocked: true, balance: await getBalance(db, user.id) })

    // 檢查餘額（first_free 費用為 0，直接通過）
    const balance = await getBalance(db, user.id)
    if (balance < cost) return errorRes('寶石不足', 402)

    const today = new Date().toISOString().slice(0, 10)
    const { error: spendErr } = await db.from('gem_transactions').insert({
      user_id: user.id,
      type: txType,
      amount: -cost,
      ref_id: match_id,
      date: today,
    })
    if (spendErr) throw spendErr

    return okRes({ unlocked: true, cost, balance: balance - cost })

  } catch (e) {
    console.error(e)
    return errorRes('伺服器錯誤', 500)
  }
})

async function getBalance(db: ReturnType<typeof createClient>, userId: string) {
  const { data } = await db.from('gem_balance').select('balance').eq('user_id', userId).maybeSingle()
  return data?.balance ?? 0
}

function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }
}
function okRes(data: object) {
  return new Response(JSON.stringify(data), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
}
function errorRes(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
}
