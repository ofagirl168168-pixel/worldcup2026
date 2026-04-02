// referral-join — 好友邀請獎勵（被邀請者首次登入時呼叫）
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return errorRes('未授權', 401)

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 驗證新用戶身份
    const { data: { user }, error: authErr } = await db.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !user) return errorRes('驗證失敗', 401)

    const { ref_code } = await req.json()
    if (!ref_code) return errorRes('缺少邀請碼', 400)

    const today = new Date().toISOString().slice(0, 10)

    // 確認新用戶沒有被邀請過（防重複）
    const { data: alreadyJoined } = await db
      .from('gem_transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'referral_joined')
      .maybeSingle()
    if (alreadyJoined) return errorRes('已使用過邀請碼', 409)

    // 找到邀請人
    const { data: inviter } = await db
      .from('profiles')
      .select('id')
      .eq('ref_code', ref_code)
      .neq('id', user.id)  // 不能邀請自己
      .maybeSingle()
    if (!inviter) return errorRes('邀請碼無效', 404)

    // 給被邀請者寶石
    await db.from('gem_transactions').insert({
      user_id: user.id,
      type: 'referral_joined',
      amount: 3,
      ref_id: inviter.id,
      date: today,
    })

    // 給邀請人寶石
    await db.from('gem_transactions').insert({
      user_id: inviter.id,
      type: 'referral_invite',
      amount: 3,
      ref_id: user.id,
      date: today,
    })

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
