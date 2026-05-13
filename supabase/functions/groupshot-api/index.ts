import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
}

const EVOLUTION_URL = Deno.env.get('EVOLUTION_API_URL') ?? ''
const EVOLUTION_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? ''
const N8N_DISPATCHER = Deno.env.get('N8N_DISPATCHER_URL') ?? ''

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function supabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

function evolutionHeaders() {
  return { 'apikey': EVOLUTION_KEY, 'Content-Type': 'application/json' }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function err(msg: string, status = 400) {
  return new Response(msg, { status, headers: CORS })
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/groupshot-api/, '')

  // GET /instances
  if (req.method === 'GET' && path === '/instances') {
    try {
      const res = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, {
        headers: evolutionHeaders(),
      })
      const data = await res.json()
      // Normaliza: pode ser array ou objeto com items
      const list = Array.isArray(data) ? data : (data.data ?? [])
      return json(list)
    } catch (e) {
      return err('Erro ao buscar instâncias: ' + (e as Error).message, 500)
    }
  }

  // GET /groups?instance=X
  if (req.method === 'GET' && path === '/groups') {
    const instance = url.searchParams.get('instance')
    if (!instance) return err('Parâmetro instance obrigatório')
    try {
      const res = await fetch(
        `${EVOLUTION_URL}/group/fetchAllGroups/${instance}?getParticipants=false`,
        { headers: evolutionHeaders() }
      )
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.data ?? [])
      return json(list)
    } catch (e) {
      return err('Erro ao buscar grupos: ' + (e as Error).message, 500)
    }
  }

  // POST /dispatch
  if (req.method === 'POST' && path === '/dispatch') {
    let body: {
      nome: string
      mensagem: string
      imageUrl?: string
      imageMimetype?: string
      mentionAll: boolean
      agendadoPara: string
      groupIds: string[]
      instancias: string[]
    }
    try { body = await req.json() } catch { return err('JSON inválido') }

    const { nome, mensagem, imageUrl, imageMimetype, mentionAll, agendadoPara, groupIds, instancias } = body

    if (!mensagem || !groupIds?.length || !instancias?.length) {
      return err('mensagem, groupIds e instancias são obrigatórios')
    }

    const db = supabaseAdmin()

    // Busca nome dos grupos
    let allGroups: { id: string; subject: string }[] = []
    for (const inst of instancias) {
      try {
        const res = await fetch(
          `${EVOLUTION_URL}/group/fetchAllGroups/${inst}?getParticipants=false`,
          { headers: evolutionHeaders() }
        )
        const data = await res.json()
        const list = Array.isArray(data) ? data : (data.data ?? [])
        allGroups = [...allGroups, ...list]
      } catch { /* ignora */ }
    }
    const groupMap = new Map(allGroups.map((g) => [g.id, g.subject]))

    // Cria registro de disparo
    const baseTime = new Date(agendadoPara).getTime()
    const { data: disparo, error: disparoErr } = await db
      .from('disparos')
      .insert({
        nome: nome || 'Disparo sem nome',
        mensagem,
        image_url: imageUrl ?? '',
        image_mimetype: imageMimetype ?? '',
        mention_all: mentionAll,
        agendado_para: new Date(baseTime).toISOString(),
        status: 'agendado',
        total_grupos: groupIds.length,
      })
      .select()
      .single()

    if (disparoErr || !disparo) {
      return err('Erro ao salvar disparo: ' + disparoErr?.message, 500)
    }

    // Calcula sendAt com delay de 40-60s entre grupos
    const itens: {
      disparo_id: string
      group_id: string
      group_name: string
      instancia: string
      send_at: string
      status: string
    }[] = []

    let acumulado = 0
    for (let i = 0; i < groupIds.length; i++) {
      if (i > 0) acumulado += 40000 + Math.floor(Math.random() * 20001)
      const sendAt = new Date(baseTime + acumulado).toISOString()
      const instancia = instancias[Math.floor(Math.random() * instancias.length)]
      itens.push({
        disparo_id: disparo.id,
        group_id: groupIds[i],
        group_name: groupMap.get(groupIds[i]) ?? '',
        instancia,
        send_at: sendAt,
        status: 'pendente',
      })
    }

    const { data: insertedItens, error: itensErr } = await db.from('disparo_itens').insert(itens).select()
    if (itensErr || !insertedItens) {
      return err('Erro ao salvar itens: ' + itensErr?.message, 500)
    }

    // Dispara para n8n dispatcher (fire-and-forget)
    if (N8N_DISPATCHER) {
      for (const item of insertedItens) {
        fetch(N8N_DISPATCHER, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            groupId: item.group_id,
            instancia: item.instancia,
            sendAt: item.send_at,
            message: mensagem,
            imageUrl: imageUrl ?? '',
            imageMimetype: imageMimetype ?? 'image/jpeg',
            mentionAll,
            disparoItemId: item.id,
          }),
        }).catch(() => { /* ignora erros de rede */ })
      }
    }

    return json({ id: disparo.id, itens: itens.length })
  }

  // GET /history
  if (req.method === 'GET' && path === '/history') {
    const db = supabaseAdmin()
    const { data, error: histErr } = await db
      .from('disparos')
      .select('*, disparo_itens(*)')
      .order('criado_em', { ascending: false })
      .limit(50)

    if (histErr) return err('Erro ao buscar histórico: ' + histErr.message, 500)
    return json(data)
  }

  // --- CAMPANHAS ---

  // GET /campanhas
  if (req.method === 'GET' && path === '/campanhas') {
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('campanhas')
      .select('*, campanha_grupos(*)')
      .order('criado_em', { ascending: false })
    if (error) return err('Erro ao buscar campanhas: ' + error.message, 500)
    return json(data)
  }

  // POST /campanhas
  if (req.method === 'POST' && path === '/campanhas') {
    let body: { nome: string; descricao?: string }
    try { body = await req.json() } catch { return err('JSON inválido') }
    if (!body.nome?.trim()) return err('Nome obrigatório')
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('campanhas')
      .insert({ nome: body.nome.trim(), descricao: body.descricao ?? '' })
      .select()
      .single()
    if (error) return err('Erro ao criar campanha: ' + error.message, 500)
    return json(data, 201)
  }

  // DELETE /campanhas/:id
  const deleteCampanha = path.match(/^\/campanhas\/([^/]+)$/)
  if (req.method === 'DELETE' && deleteCampanha) {
    const id = deleteCampanha[1]
    const db = supabaseAdmin()
    const { error } = await db.from('campanhas').delete().eq('id', id)
    if (error) return err('Erro ao deletar campanha: ' + error.message, 500)
    return json({ ok: true })
  }

  // POST /campanhas/:id/grupos — adiciona grupos à campanha
  const addGrupos = path.match(/^\/campanhas\/([^/]+)\/grupos$/)
  if (req.method === 'POST' && addGrupos) {
    const campanhaId = addGrupos[1]
    let body: { grupos: { group_id: string; group_name: string; instancia: string }[] }
    try { body = await req.json() } catch { return err('JSON inválido') }
    if (!body.grupos?.length) return err('grupos obrigatório')
    const db = supabaseAdmin()
    const rows = body.grupos.map(g => ({
      campanha_id: campanhaId,
      group_id: g.group_id,
      group_name: g.group_name,
      instancia: g.instancia,
    }))
    const { data, error } = await db.from('campanha_grupos').insert(rows).select()
    if (error) return err('Erro ao adicionar grupos: ' + error.message, 500)
    return json(data, 201)
  }

  // DELETE /campanha-grupos/:id — remove grupo de campanha
  const deleteGrupo = path.match(/^\/campanha-grupos\/([^/]+)$/)
  if (req.method === 'DELETE' && deleteGrupo) {
    const id = deleteGrupo[1]
    const db = supabaseAdmin()
    const { error } = await db.from('campanha_grupos').delete().eq('id', id)
    if (error) return err('Erro ao remover grupo: ' + error.message, 500)
    return json({ ok: true })
  }

  // GET /visao-geral
  if (req.method === 'GET' && path === '/visao-geral') {
    const db = supabaseAdmin()
    const [{ count: totalCampanhas }, { data: disparoStats }] = await Promise.all([
      db.from('campanhas').select('*', { count: 'exact', head: true }),
      db.from('disparos').select('status'),
    ])
    const stats = { agendado: 0, disparando: 0, concluido: 0, falhou: 0 }
    for (const d of disparoStats ?? []) {
      if (d.status in stats) stats[d.status as keyof typeof stats]++
    }
    return json({ totalCampanhas: totalCampanhas ?? 0, disparos: stats })
  }

  return err('Not found', 404)
})
