// award-gem — 伺服器端驗證寶石發放，防止前端作弊
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// 每種類型的規則
const AWARD_RULES: Record<string, { amount: number; unique: boolean; dailyLimit?: boolean }> = {
  daily_correct:    { amount: 1,  unique: false, dailyLimit: true },  // 每日答對（舊版相容）
  daily_correct_wc: { amount: 1,  unique: false, dailyLimit: true },  // 每日答對 — 世界盃
  daily_correct_ucl:{ amount: 1,  unique: false, dailyLimit: true },  // 每日答對 — 歐冠
  daily_correct_epl:{ amount: 1,  unique: false, dailyLimit: true },  // 每日答對 — 英超
  first_account:    { amount: 3,  unique: true },                     // 首次綁定帳號
  first_champion:     { amount: 2,  unique: true },                     // 首次冠軍預測（舊版相容）
  first_groups:       { amount: 2,  unique: true },                     // 首次分組賽預測（舊版相容）
  first_team:         { amount: 1,  unique: true },                     // 首次支持球隊（舊版相容）
  first_champion_wc:  { amount: 2,  unique: true },                     // 首次冠軍預測 — 世界盃
  first_champion_ucl: { amount: 2,  unique: true },                     // 首次冠軍預測 — 歐冠
  first_champion_epl: { amount: 2,  unique: true },                     // 首次冠軍預測 — 英超
  first_groups_wc:    { amount: 2,  unique: true },                     // 首次分組預測 — 世界盃
  first_groups_ucl:   { amount: 2,  unique: true },                     // 首次分組預測 — 歐冠
  first_groups_epl:   { amount: 2,  unique: true },                     // 首次分組預測 — 英超
  first_team_wc:      { amount: 1,  unique: true },                     // 首次支持球隊 — 世界盃
  first_team_ucl:     { amount: 1,  unique: true },                     // 首次支持球會 — 歐冠
  first_team_epl:     { amount: 1,  unique: true },                     // 首次支持球會 — 英超
  streak_7:         { amount: 3,  unique: false, dailyLimit: true },  // 連勝 7 天（舊版相容）
  streak_14:        { amount: 5,  unique: false, dailyLimit: true },  // 連勝 14 天（舊版相容）
  streak_30:        { amount: 10, unique: false, dailyLimit: true },  // 連勝 30 天（舊版相容）
  streak_7_wc:      { amount: 3,  unique: false, dailyLimit: true },  // 連勝 7 天 — 世界盃
  streak_7_ucl:     { amount: 3,  unique: false, dailyLimit: true },  // 連勝 7 天 — 歐冠
  streak_7_epl:     { amount: 3,  unique: false, dailyLimit: true },  // 連勝 7 天 — 英超
  streak_14_wc:     { amount: 5,  unique: false, dailyLimit: true },  // 連勝 14 天 — 世界盃
  streak_14_ucl:    { amount: 5,  unique: false, dailyLimit: true },  // 連勝 14 天 — 歐冠
  streak_14_epl:    { amount: 5,  unique: false, dailyLimit: true },  // 連勝 14 天 — 英超
  streak_30_wc:     { amount: 10, unique: false, dailyLimit: true },  // 連勝 30 天 — 世界盃
  streak_30_ucl:    { amount: 10, unique: false, dailyLimit: true },  // 連勝 30 天 — 歐冠
  streak_30_epl:    { amount: 10, unique: false, dailyLimit: true },  // 連勝 30 天 — 英超
  referral_invite:  { amount: 3,  unique: false },                    // 邀請好友成功
  referral_joined:  { amount: 3,  unique: true },                     // 被邀請者首次登入
  level_2:          { amount: 2,  unique: true },                     // 升到 Lv.2
  level_3:          { amount: 2,  unique: true },                     // 升到 Lv.3
  level_5:          { amount: 3,  unique: true },                     // 升到 Lv.5
  level_7:          { amount: 3,  unique: true },                     // 升到 Lv.7
  level_10:         { amount: 5,  unique: true },                     // 升到 Lv.10
  level_15:         { amount: 5,  unique: true },                     // 升到 Lv.15
  level_20:         { amount: 10, unique: true },                     // 升到 Lv.20
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    // 從 Authorization header 取得用戶身份（JWT 驗證）
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return errorRes('未授權', 401)

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 驗證 JWT，取得真實 user_id（無法偽造）
    const { data: { user }, error: authErr } = await db.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !user) return errorRes('驗證失敗', 401)

    const { type } = await req.json()
    const rule = AWARD_RULES[type]
    if (!rule) return errorRes('不合法的類型', 400)

    const today = new Date().toISOString().slice(0, 10)

    // 檢查唯一性（一次性獎勵）
    if (rule.unique) {
      const { data: existing } = await db
        .from('gem_transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', type)
        .maybeSingle()
      if (existing) return errorRes('已領取過', 409)
    }

    // 檢查每日限制
    if (rule.dailyLimit) {
      const { data: existing } = await db
        .from('gem_transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', type)
        .eq('date', today)
        .maybeSingle()
      if (existing) return errorRes('今日已領取', 409)
    }

    // 寫入帳本
    const { error: insertErr } = await db.from('gem_transactions').insert({
      user_id: user.id,
      type,
      amount: rule.amount,
      date: today,
    })
    if (insertErr) throw insertErr

    // 回傳新餘額
    const { data: bal } = await db
      .from('gem_balance')
      .select('balance')
      .eq('user_id', user.id)
      .single()

    return okRes({ awarded: rule.amount, balance: bal?.balance ?? rule.amount })

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
