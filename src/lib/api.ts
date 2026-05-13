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

export async function fetchGroups(instance: string): Promise<Group[]> {
  const res = await fetch(`${API_BASE}/groups?instance=${encodeURIComponent(instance)}`, {
    headers: headers(),
  })
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
    const err = await res.text()
    throw new Error(err || 'Erro ao criar disparo')
  }
  return res.json()
}

export async function fetchHistory(): Promise<Disparo[]> {
  const res = await fetch(`${API_BASE}/history`, { headers: headers() })
  if (!res.ok) throw new Error('Erro ao buscar histórico')
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
