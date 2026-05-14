import { API_BASE, supabase } from './supabase'

const headers = () => ({
  'Content-Type': 'application/json',
  apikey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvYWF6cWF1Y2NseXB4ZmZocGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDkwNzMsImV4cCI6MjA5Mjg4NTA3M30.tYaY9tPayRziGhVCnECIEjytM1ykwyWhTt3Mjae54oc',
})

export interface Instance {
  name: string
  connectionStatus: string
  ownerJid: string
}

export interface Group {
  id: string
  subject: string
  size?: number
}

export interface Disparo {
  id: string
  nome: string
  mensagem: string
  image_url: string
  image_mimetype: string
  mention_all: boolean
  agendado_para: string
  status: 'agendado' | 'disparando' | 'concluido' | 'falhou'
  total_grupos: number
  enviados: number
  falhas: number
  criado_em: string
  disparo_itens?: DisparoItem[]
}

export interface DisparoItem {
  id: string
  disparo_id: string
  group_id: string
  group_name: string
  instancia: string
  send_at: string
  status: 'pendente' | 'enviado' | 'falhou'
  enviado_em: string | null
  erro: string | null
}

export async function fetchInstances(): Promise<Instance[]> {
  const res = await fetch(`${API_BASE}/instances`, { headers: headers() })
  if (!res.ok) throw new Error('Erro ao buscar instâncias')
  return res.json()
}

export async function fetchQRCode(instanceName: string): Promise<{ base64: string | null; code: string | null }> {
  const res = await fetch(`${API_BASE}/instance/qrcode/${encodeURIComponent(instanceName)}`, {
    headers: headers(),
  })
  if (!res.ok) throw new Error('Erro ao buscar QR Code')
  return res.json()
}

export async function createInstance(instanceName: string): Promise<void> {
  const res = await fetch(`${API_BASE}/instance/create`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ instanceName }),
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function fetchProfilePicture(instance: string, jid: string): Promise<string | null> {
  const params = new URLSearchParams({ instance, groupId: jid })
  const res = await fetch(`${API_BASE}/group/picture?${params}`, { headers: headers() })
  if (!res.ok) return null
  const data = await res.json()
  return data.url ?? null
}

export async function fetchGroups(instance: string, withParticipants = false): Promise<Group[]> {
  const params = new URLSearchParams({ instance })
  if (withParticipants) params.set('participants', 'true')
  const res = await fetch(`${API_BASE}/groups?${params}`, { headers: headers() })
  if (!res.ok) throw new Error('Erro ao buscar grupos')
  return res.json()
}

export interface DispatchPayload {
  nome: string
  mensagem: string
  imageUrl?: string
  imageMimetype?: string
  mentionAll: boolean
  agendadoPara: string
  groupIds: string[]
  instancias: string[]
}

export async function dispatch(payload: DispatchPayload): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/dispatch`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const e = await res.text()
    throw new Error(e || 'Erro ao criar disparo')
  }
  return res.json()
}

export async function fetchHistory(): Promise<Disparo[]> {
  const res = await fetch(`${API_BASE}/history`, { headers: headers() })
  if (!res.ok) throw new Error('Erro ao buscar histórico')
  return res.json()
}

// --- Campanhas ---

export interface CampanhaGrupo {
  id: string
  campanha_id: string
  group_id: string
  group_name: string
  instancia: string
}

export interface Campanha {
  id: string
  nome: string
  descricao: string
  instancias: string[]
  foto_url: string
  criado_em: string
  campanha_grupos: CampanhaGrupo[]
}

export async function fetchCampanhas(): Promise<Campanha[]> {
  const res = await fetch(`${API_BASE}/campanhas`, { headers: headers() })
  if (!res.ok) throw new Error('Erro ao buscar campanhas')
  return res.json()
}

export async function createCampanha(nome: string, descricao?: string): Promise<Campanha> {
  const res = await fetch(`${API_BASE}/campanhas`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ nome, descricao }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function fetchCampanha(id: string): Promise<Campanha> {
  const res = await fetch(`${API_BASE}/campanhas/${id}`, { headers: headers() })
  if (!res.ok) throw new Error('Erro ao buscar campanha')
  return res.json()
}

export async function updateCampanha(
  id: string,
  data: { nome?: string; instancias?: string[]; foto_url?: string }
): Promise<Campanha> {
  const res = await fetch(`${API_BASE}/campanhas/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteCampanha(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/campanhas/${id}`, { method: 'DELETE', headers: headers() })
  if (!res.ok) throw new Error(await res.text())
}

export async function fetchAtividades(campanhaId: string): Promise<Disparo[]> {
  const res = await fetch(`${API_BASE}/campanhas/${campanhaId}/atividades`, { headers: headers() })
  if (!res.ok) throw new Error('Erro ao buscar atividades')
  return res.json()
}

export interface DispararCampanhaPayload {
  nome?: string
  mensagem: string
  imageUrl?: string
  imageMimetype?: string
  mentionAll: boolean
  agendadoPara: string
}

export async function dispararCampanha(
  campanhaId: string,
  payload: DispararCampanhaPayload
): Promise<{ id: string; itens: number }> {
  const res = await fetch(`${API_BASE}/campanhas/${campanhaId}/disparar`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function addGruposToCampanha(
  campanhaId: string,
  grupos: { group_id: string; group_name: string; instancia: string }[]
): Promise<CampanhaGrupo[]> {
  const res = await fetch(`${API_BASE}/campanhas/${campanhaId}/grupos`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ grupos }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function removeGrupoDaCampanha(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/campanha-grupos/${id}`, { method: 'DELETE', headers: headers() })
  if (!res.ok) throw new Error(await res.text())
}

export interface VisaoGeral {
  totalCampanhas: number
  disparos: { agendado: number; disparando: number; concluido: number; falhou: number }
}

export async function fetchVisaoGeral(): Promise<VisaoGeral> {
  const res = await fetch(`${API_BASE}/visao-geral`, { headers: headers() })
  if (!res.ok) throw new Error('Erro ao buscar visão geral')
  return res.json()
}

export async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('sendflow').upload(filename, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error('Erro no upload: ' + error.message)
  return `https://loaazqaucclypxffhpka.supabase.co/storage/v1/object/public/sendflow/${filename}`
}
