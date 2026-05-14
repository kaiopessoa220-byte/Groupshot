import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, PATCH, OPTIONS',
}

const EVOLUTION_URL = Deno.env.get('EVOLUTION_API_URL') ?? ''
const EVOLUTION_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? ''
const N8N_DISPATCHER = Deno.env.get('N8N_DISPATCHER_URL') ?? ''

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

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

  // Verify JWT — reject unauthenticated requests
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return new Response('Unauthorized', { status: 401, headers: CORS })
  }
  const authCheck = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
  })
  if (!authCheck.ok) {
    return new Response('Unauthorized', { status: 401, headers: CORS })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/groupshot-api/, '')

  // GET /instances
  if (req.method === 'GET' && path === '/instances') {
    try {
      const res = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, {
        headers: evolutionHeaders(),
      })
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.data ?? [])
      return json(list)
    } catch (e) {
      return err('Erro ao buscar instâncias: ' + (e as Error).message, 500)
    }
  }

  // POST /instance/create
  if (req.method === 'POST' && path === '/instance/create') {
    let body: { instanceName: string }
    try { body = await req.json() } catch { return err('JSON inválido') }
    if (!body.instanceName?.trim()) return err('instanceName obrigatório')
    try {
      const res = await fetch(`${EVOLUTION_URL}/instance/create`, {
        method: 'POST',
        headers: evolutionHeaders(),
        body: JSON.stringify({
          instanceName: body.instanceName.trim(),
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
      })
      if (!res.ok) return err('Erro ao criar instância: ' + res.status, 500)
      const data = await res.json()
      return json(data, 201)
    } catch (e) {
      return err('Erro ao criar instância: ' + (e as Error).message, 500)
    }
  }

  // DELETE /instance/:name
  const deleteInstanceMatch = path.match(/^\/instance\/([^/]+)$/)
  if (req.method === 'DELETE' && deleteInstanceMatch) {
    const instanceName = deleteInstanceMatch[1]
    try {
      const res = await fetch(`${EVOLUTION_URL}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: evolutionHeaders(),
      })
      if (!res.ok) return err('Erro ao excluir instância: ' + res.status, 500)
      return json({ ok: true })
    } catch (e) {
      return err('Erro ao excluir instância: ' + (e as Error).message, 500)
    }
  }

  // GET /instance/qrcode/:name
  const qrcodeMatch = path.match(/^\/instance\/qrcode\/(.+)$/)
  if (req.method === 'GET' && qrcodeMatch) {
    const instanceName = qrcodeMatch[1]
    try {
      const res = await fetch(`${EVOLUTION_URL}/instance/connect/${instanceName}`, {
        headers: evolutionHeaders(),
      })
      if (!res.ok) return err('Erro ao gerar QR: ' + res.status, 500)
      const data = await res.json()
      // Evolution API returns { code: "...", base64: "data:image/png;base64,..." }
      return json({ base64: data.base64 ?? data.qrcode?.base64 ?? null, code: data.code ?? null })
    } catch (e) {
      return err('Erro ao buscar QR: ' + (e as Error).message, 500)
    }
  }

  // GET /groups?instance=X&participants=true
  if (req.method === 'GET' && path === '/groups') {
    const instance = url.searchParams.get('instance')
    const withParticipants = url.searchParams.get('participants') === 'true'
    if (!instance) return err('Parâmetro instance obrigatório')
    try {
      const res = await fetch(
        `${EVOLUTION_URL}/group/fetchAllGroups/${instance}?getParticipants=${withParticipants}`,
        { headers: evolutionHeaders() }
      )
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.data ?? [])
      // Normaliza para { id, subject, size }
      const normalized = list.map((g: { id: string; subject: string; participants?: unknown[]; size?: number }) => ({
        id: g.id,
        subject: g.subject,
        size: g.size ?? (Array.isArray(g.participants) ? g.participants.length : undefined),
      }))
      return json(normalized)
    } catch (e) {
      return err('Erro ao buscar grupos: ' + (e as Error).message, 500)
    }
  }

  // GET /group/picture?instance=X&groupId=Y
  if (req.method === 'GET' && path === '/group/picture') {
    const instance = url.searchParams.get('instance')
    const groupId = url.searchParams.get('groupId')
    if (!instance || !groupId) return err('instance e groupId obrigatórios')
    try {
      const res = await fetch(
        `${EVOLUTION_URL}/misc/profilePicture/${instance}?number=${encodeURIComponent(groupId)}`,
        { headers: evolutionHeaders() }
      )
      const data = await res.json()
      return json({ url: data.profilePictureUrl ?? data.picture ?? null })
    } catch (e) {
      return err('Erro ao buscar foto: ' + (e as Error).message, 500)
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
        }).catch(() => {})
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
    if (error) return err('Erro: ' + error.message, 500)
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
      .insert({ nome: body.nome.trim(), descricao: body.descricao ?? '', instancias: [], foto_url: '' })
      .select()
      .single()
    if (error) return err('Erro: ' + error.message, 500)
    return json(data, 201)
  }

  // GET /campanhas/:id
  const campanhaId = path.match(/^\/campanhas\/([^/]+)$/)
  if (req.method === 'GET' && campanhaId) {
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('campanhas')
      .select('*, campanha_grupos(*)')
      .eq('id', campanhaId[1])
      .single()
    if (error) return err('Erro: ' + error.message, 500)
    return json(data)
  }

  // PATCH /campanhas/:id
  if (req.method === 'PATCH' && campanhaId) {
    let body: { nome?: string; instancias?: string[]; foto_url?: string }
    try { body = await req.json() } catch { return err('JSON inválido') }
    const db = supabaseAdmin()
    const updates: Record<string, unknown> = {}
    if (body.nome) updates.nome = body.nome
    if (body.instancias !== undefined) updates.instancias = body.instancias
    if (body.foto_url !== undefined) updates.foto_url = body.foto_url
    const { data, error } = await db
      .from('campanhas')
      .update(updates)
      .eq('id', campanhaId[1])
      .select('*, campanha_grupos(*)')
      .single()
    if (error) return err('Erro: ' + error.message, 500)
    return json(data)
  }

  // DELETE /campanhas/:id
  if (req.method === 'DELETE' && campanhaId) {
    const db = supabaseAdmin()
    const { error } = await db.from('campanhas').delete().eq('id', campanhaId[1])
    if (error) return err('Erro: ' + error.message, 500)
    return json({ ok: true })
  }

  // GET /campanhas/:id/atividades
  const atividadesMatch = path.match(/^\/campanhas\/([^/]+)\/atividades$/)
  if (req.method === 'GET' && atividadesMatch) {
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('disparos')
      .select('*, disparo_itens(*)')
      .eq('campanha_id', atividadesMatch[1])
      .order('criado_em', { ascending: false })
      .limit(50)
    if (error) return err('Erro: ' + error.message, 500)
    return json(data ?? [])
  }

  // POST /campanhas/:id/disparar
  const dispararMatch = path.match(/^\/campanhas\/([^/]+)\/disparar$/)
  if (req.method === 'POST' && dispararMatch) {
    const cId = dispararMatch[1]
    let body: { nome?: string; mensagem: string; imageUrl?: string; imageMimetype?: string; mentionAll: boolean; agendadoPara: string; groupIds?: string[] }
    try { body = await req.json() } catch { return err('JSON inválido') }
    if (!body.mensagem) return err('mensagem obrigatória')

    const db = supabaseAdmin()
    const { data: campanha, error: cErr } = await db
      .from('campanhas')
      .select('*, campanha_grupos(*)')
      .eq('id', cId)
      .single()
    if (cErr || !campanha) return err('Campanha não encontrada', 404)
    if (!campanha.campanha_grupos?.length) return err('Campanha sem grupos')
    if (!campanha.instancias?.length) return err('Campanha sem instâncias')

    const { mensagem, imageUrl, imageMimetype, mentionAll, agendadoPara } = body
    const baseTime = new Date(agendadoPara).getTime()

    // Filter groups if specific groupIds provided
    const targetGroups = body.groupIds?.length
      ? campanha.campanha_grupos.filter((g: { group_id: string }) => body.groupIds!.includes(g.group_id))
      : campanha.campanha_grupos

    const { data: disparo, error: dErr } = await db
      .from('disparos')
      .insert({
        nome: body.nome || campanha.nome,
        mensagem,
        image_url: imageUrl ?? '',
        image_mimetype: imageMimetype ?? '',
        mention_all: mentionAll,
        agendado_para: new Date(baseTime).toISOString(),
        status: 'agendado',
        total_grupos: targetGroups.length,
        campanha_id: cId,
      })
      .select()
      .single()
    if (dErr || !disparo) return err('Erro ao salvar: ' + dErr?.message, 500)

    let acumulado = 0
    const itens = targetGroups.map((g: { group_id: string; group_name: string; instancia: string }, i: number) => {
      if (i > 0) acumulado += 40000 + Math.floor(Math.random() * 20001)
      const instancia = campanha.instancias[Math.floor(Math.random() * campanha.instancias.length)]
      return { disparo_id: disparo.id, group_id: g.group_id, group_name: g.group_name, instancia, send_at: new Date(baseTime + acumulado).toISOString(), status: 'pendente' }
    })

    const { data: insertedItens, error: iErr } = await db.from('disparo_itens').insert(itens).select()
    if (iErr || !insertedItens) return err('Erro ao salvar itens: ' + iErr?.message, 500)

    if (N8N_DISPATCHER) {
      for (const item of insertedItens) {
        fetch(N8N_DISPATCHER, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId: item.group_id, instancia: item.instancia, sendAt: item.send_at, message: mensagem, imageUrl: imageUrl ?? '', imageMimetype: imageMimetype ?? 'image/jpeg', mentionAll, disparoItemId: item.id }),
        }).catch(() => {})
      }
    }
    return json({ id: disparo.id, itens: itens.length }, 201)
  }

  // POST /group/create-batch
  if (req.method === 'POST' && path === '/group/create-batch') {
    let body: { instance: string; nomeBase: string; quantidade: number; limite: number; ownerJid?: string }
    try { body = await req.json() } catch { return err('JSON inválido') }
    const { instance, nomeBase, quantidade, ownerJid } = body
    if (!instance || !nomeBase || !quantidade) return err('instance, nomeBase e quantidade são obrigatórios')

    // Evolution API requires at least one participant — use the instance's own number
    const jid = ownerJid
      ? (ownerJid.includes('@') ? ownerJid : `${ownerJid.replace(/\D/g, '')}@s.whatsapp.net`)
      : null
    const participants = jid ? [jid] : []

    const results: { id: string; subject: string; error?: string }[] = []
    for (let i = 1; i <= quantidade; i++) {
      const subject = `${nomeBase} #${i}`
      try {
        const res = await fetch(`${EVOLUTION_URL}/group/create/${instance}`, {
          method: 'POST',
          headers: evolutionHeaders(),
          body: JSON.stringify({ subject, participants }),
        })
        const data = await res.json()
        if (!res.ok) {
          const msg = data?.message ?? data?.error ?? `HTTP ${res.status}`
          results.push({ id: '', subject, error: String(msg) })
        } else {
          const id = data.id ?? data.groupJid ?? data.jid ?? data.data?.id ?? data.data?.groupJid ?? ''
          if (!id) {
            results.push({ id: '', subject, error: `ID não encontrado. Resposta: ${JSON.stringify(data).slice(0, 200)}` })
          } else {
            results.push({ id, subject })
          }
        }
      } catch (e) {
        results.push({ id: '', subject, error: (e as Error).message })
      }
    }
    const failed = results.filter(r => !r.id)
    if (failed.length === results.length && results.length > 0) {
      return err(`Falha ao criar grupos: ${failed[0].error ?? 'Erro desconhecido'}`, 400)
    }
    return json(results, 201)
  }

  // POST /group/action-batch
  if (req.method === 'POST' && path === '/group/action-batch') {
    let body: { action: string; instances: string[]; groupIds: string[]; content?: Record<string, unknown> }
    try { body = await req.json() } catch { return err('JSON inválido') }
    const { action, instances, groupIds, content } = body
    if (!action || !instances?.length || !groupIds?.length) return err('action, instances e groupIds são obrigatórios')

    const results: { groupId: string; ok: boolean; error?: string }[] = []

    for (const groupId of groupIds) {
      const instance = instances[Math.floor(Math.random() * instances.length)]
      try {
        let res: Response
        if (action === 'trocar-nome') {
          res = await fetch(`${EVOLUTION_URL}/group/subject/${instance}`, {
            method: 'PUT',
            headers: evolutionHeaders(),
            body: JSON.stringify({ id: groupId, subject: content?.value }),
          })
        } else if (action === 'trocar-descricao') {
          res = await fetch(`${EVOLUTION_URL}/group/description/${instance}`, {
            method: 'PUT',
            headers: evolutionHeaders(),
            body: JSON.stringify({ id: groupId, description: content?.value }),
          })
        } else if (action === 'trocar-imagem') {
          res = await fetch(`${EVOLUTION_URL}/group/picture/${instance}`, {
            method: 'PUT',
            headers: evolutionHeaders(),
            body: JSON.stringify({ id: groupId, image: content?.image }),
          })
        } else if (action === 'fechar-grupos') {
          res = await fetch(`${EVOLUTION_URL}/group/update-setting/${instance}`, {
            method: 'PUT',
            headers: evolutionHeaders(),
            body: JSON.stringify({ groupJid: groupId, action: 'announcement' }),
          })
        } else if (action === 'abrir-grupos') {
          res = await fetch(`${EVOLUTION_URL}/group/update-setting/${instance}`, {
            method: 'PUT',
            headers: evolutionHeaders(),
            body: JSON.stringify({ groupJid: groupId, action: 'not_announcement' }),
          })
        } else if (action === 'trocar-configuracao') {
          const settingAction = content?.onlyAdmins ? 'announcement' : 'not_announcement'
          res = await fetch(`${EVOLUTION_URL}/group/update-setting/${instance}`, {
            method: 'PUT',
            headers: evolutionHeaders(),
            body: JSON.stringify({ groupJid: groupId, action: settingAction }),
          })
        } else if (action === 'add-admins') {
          const phones = (content?.phones as string[]) ?? []
          res = await fetch(`${EVOLUTION_URL}/group/update-participant/${instance}`, {
            method: 'PATCH',
            headers: evolutionHeaders(),
            body: JSON.stringify({ groupJid: groupId, action: 'promote', participants: phones }),
          })
        } else if (action === 'entrar-grupo') {
          // No-op for now
          results.push({ groupId, ok: true })
          continue
        } else {
          results.push({ groupId, ok: false, error: 'Ação desconhecida: ' + action })
          continue
        }
        results.push({ groupId, ok: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` })
      } catch (e) {
        results.push({ groupId, ok: false, error: (e as Error).message })
      }
    }

    return json({ results })
  }

  // GET /campanhas/:id/stats
  const statsMatch = path.match(/^\/campanhas\/([^/]+)\/stats$/)
  if (req.method === 'GET' && statsMatch) {
    const db = supabaseAdmin()
    const { data: grupos, error } = await db
      .from('campanha_grupos')
      .select('group_id, instancia')
      .eq('campanha_id', statsMatch[1])
    if (error) return err('Erro: ' + error.message, 500)
    if (!grupos?.length) return json({ participantes: 0, gruposCheios: 0, gruposDisponiveis: 0 })

    const byInstance = new Map<string, string[]>()
    for (const g of grupos) {
      const arr = byInstance.get(g.instancia) ?? []
      arr.push(g.group_id)
      byInstance.set(g.instancia, arr)
    }

    const sizeMap = new Map<string, number>()
    await Promise.all(Array.from(byInstance.entries()).map(async ([inst, ids]) => {
      try {
        const res = await fetch(
          `${EVOLUTION_URL}/group/fetchAllGroups/${inst}?getParticipants=true`,
          { headers: evolutionHeaders() }
        )
        const data = await res.json()
        const list = Array.isArray(data) ? data : (data.data ?? [])
        for (const g of list) {
          if (ids.includes(g.id)) {
            sizeMap.set(g.id, g.size ?? (Array.isArray(g.participants) ? g.participants.length : 0))
          }
        }
      } catch { /* ignora */ }
    }))

    let participantes = 0, gruposCheios = 0, gruposDisponiveis = 0
    for (const g of grupos) {
      const size = sizeMap.get(g.group_id) ?? 0
      participantes += size
      if (size >= 1000) gruposCheios++
      else gruposDisponiveis++
    }
    return json({ participantes, gruposCheios, gruposDisponiveis })
  }

  // POST /campanhas/:id/grupos
  const addGrupos = path.match(/^\/campanhas\/([^/]+)\/grupos$/)
  if (req.method === 'POST' && addGrupos) {
    let body: { grupos: { group_id: string; group_name: string; instancia: string }[] }
    try { body = await req.json() } catch { return err('JSON inválido') }
    if (!body.grupos?.length) return err('grupos obrigatório')
    const db = supabaseAdmin()
    const rows = body.grupos.map(g => ({ campanha_id: addGrupos[1], group_id: g.group_id, group_name: g.group_name, instancia: g.instancia }))
    const { data, error } = await db.from('campanha_grupos').insert(rows).select()
    if (error) return err('Erro: ' + error.message, 500)
    return json(data, 201)
  }

  // DELETE /campanha-grupos/:id
  const deleteGrupo = path.match(/^\/campanha-grupos\/([^/]+)$/)
  if (req.method === 'DELETE' && deleteGrupo) {
    const db = supabaseAdmin()
    const { error } = await db.from('campanha_grupos').delete().eq('id', deleteGrupo[1])
    if (error) return err('Erro: ' + error.message, 500)
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
