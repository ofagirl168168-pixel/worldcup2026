// rogue-weekly-settle — 射門挑戰週排行結算，發放寶石獎勵
// 每週日結算上一週（週一 00:00 ~ 週日 23:59 UTC+8）
// 第 1 名 +3 寶石，第 2 名 +2 寶石，第 3 名 +1 寶石
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const REWARDS = [3, 2, 1]  // 前三名寶石數

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 計算上週的起止時間（台灣時間 UTC+8）
    const now = new Date()
    const twNow = new Date(now.getTime() + 8 * 3600000)
    const twDay = twNow.getUTCDay()  // 0=Sun, 1=Mon...

    // 上週一 00:00 (UTC+8)
    const daysToLastMon = twDay === 0 ? 6 : twDay - 1
    const lastMon = new Date(twNow)
    lastMon.setUTCDate(lastMon.getUTCDate() - daysToLastMon - 7)
    lastMon.setUTCHours(0, 0, 0, 0)
    // 轉回 UTC
    const weekStart = new Date(lastMon.getTime() - 8 * 3600000)

    // 本週一 00:00 (UTC+8) → UTC
    const thisMon = new Date(lastMon)
    thisMon.setUTCDate(thisMon.getUTCDate() + 7)
    const weekEnd = new Date(thisMon.getTime() - 8 * 3600000)

    const weekStartDate = lastMon.toISOString().slice(0, 10) // YYYY-MM-DD 作為 key

    // 檢查是否已結算
    const { data: settled } = await db
      .from('rogue_weekly_settled')
      .select('week_start')
      .eq('week_start', weekStartDate)
      .maybeSingle()
    if (settled) return okRes({ already_settled: true, week: weekStartDate })

    // 查詢上週排行（每人最高分）
    const { data: scores } = await db
      .from('rogue_scores')
      .select('user_id, score, wave')
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', weekEnd.toISOString())
      .order('score', { ascending: false })

    if (!scores || scores.length === 0) {
      // 無人參加，標記已結算
      await db.from('rogue_weekly_settled').insert({ week_start: weekStartDate })
      return okRes({ settled: true, week: weekStartDate, winners: [] })
    }

    // 每人取最高分
    const bestByUser = new Map<string, { score: number; wave: number }>()
    for (const s of scores) {
      const existing = bestByUser.get(s.user_id)
      if (!existing || s.score > existing.score) {
        bestByUser.set(s.user_id, { score: s.score, wave: s.wave })
      }
    }

    // 排名
    const ranked = [...bestByUser.entries()]
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 3)

    const today = new Date().toISOString().slice(0, 10)
    const winners = []

    for (let i = 0; i < ranked.length; i++) {
      const [userId, data] = ranked[i]
      const reward = REWARDS[i]

      // 寫入寶石帳本
      await db.from('gem_transactions').insert({
        user_id: userId,
        type: `rogue_weekly_${i + 1}`,
        amount: reward,
        ref_id: weekStartDate,
        date: today,
      })

      winners.push({ rank: i + 1, user_id: userId, score: data.score, reward })
    }

    // 標記已結算
    await db.from('rogue_weekly_settled').insert({ week_start: weekStartDate })

    return okRes({ settled: true, week: weekStartDate, winners })

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
