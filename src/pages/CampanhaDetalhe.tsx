import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  fetchCampanha, updateCampanha,
  fetchAtividades, dispararCampanha,
  fetchInstances, fetchGroups,
  addGruposToCampanha, removeGrupoDaCampanha,
  uploadImage, fetchProfilePicture,
  createGroups, executeGroupAction,
} from '../lib/api'
import type { Campanha, CampanhaGrupo, Disparo, Instance, Group } from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Tab = 'visao-geral' | 'grupos' | 'atividades' | 'acoes'

type ActionType =
  | 'enviar-mensagem'
  | 'trocar-nome'
  | 'trocar-descricao'
  | 'trocar-imagem'
  | 'trocar-configuracao'
  | 'fechar-grupos'
  | 'abrir-grupos'
  | 'entrar-grupo'
  | 'add-admins'

type WizardStep = 'acao' | 'contas' | 'grupos' | 'conteudo' | 'confirmar'

const WIZARD_STEPS: WizardStep[] = ['acao', 'contas', 'grupos', 'conteudo', 'confirmar']
const WIZARD_LABELS: Record<WizardStep, string> = {
  acao: 'Ação',
  contas: 'Contas',
  grupos: 'Grupos',
  conteudo: 'Conteúdo',
  confirmar: 'Confirmar',
}

const ACTIONS: { key: ActionType; label: string; icon: React.ReactNode }[] = [
  {
    key: 'enviar-mensagem',
    label: 'Enviar mensagem',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4-1-4z" />
      </svg>
    ),
  },
  {
    key: 'trocar-nome',
    label: 'Trocar nome',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    key: 'trocar-descricao',
    label: 'Trocar descrição',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" />
      </svg>
    ),
  },
  {
    key: 'trocar-imagem',
    label: 'Trocar imagem',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: 'trocar-configuracao',
    label: 'Trocar configuração',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    key: 'fechar-grupos',
    label: 'Fechar Grupos',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    key: 'abrir-grupos',
    label: 'Abrir Grupos',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: 'entrar-grupo',
    label: 'Entrar no Grupo',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: 'add-admins',
    label: 'Adicionar administradores',
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
      </svg>
    ),
  },
]

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

export default function CampanhaDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [campanha, setCampanha] = useState<Campanha | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('visao-geral')
  const [error, setError] = useState('')

  const [atividades, setAtividades] = useState<Disparo[]>([])
  const [loadingAtiv, setLoadingAtiv] = useState(false)
  const [expandedAtiv, setExpandedAtiv] = useState<string | null>(null)

  const [allInstances, setAllInstances] = useState<Instance[]>([])

  // Add Grupos modal
  const [showAddGrupos, setShowAddGrupos] = useState(false)
  const [instGroups, setInstGroups] = useState<Record<string, { groups: Group[]; error: boolean }>>({})
  const [instLoading, setInstLoading] = useState<Record<string, boolean>>({})
  const [groupSearch, setGroupSearch] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<{ id: string; instancia: string }[]>([])
  const [salvandoGrupos, setSalvandoGrupos] = useState(false)
  const [filterInst, setFilterInst] = useState<string | 'todas'>('todas')

  // Grupos tab profile pictures
  const [groupPics, setGroupPics] = useState<Record<string, string | null>>({})

  // Criar Grupos modal
  const [showCriarGrupos, setShowCriarGrupos] = useState(false)
  const [criarNomeBase, setCriarNomeBase] = useState('')
  const [criarQuantidade, setCriarQuantidade] = useState(1)
  const [criarLimite, setCriarLimite] = useState(550)
  const [criarInstancia, setCriarInstancia] = useState('')
  const [criarParticipante, setCriarParticipante] = useState('')
  const [criandoGrupos, setCriandoGrupos] = useState(false)
  const [criarError, setCriarError] = useState('')

  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>('acao')
  const [wizardAction, setWizardAction] = useState<ActionType>('enviar-mensagem')
  const [wizardAccounts, setWizardAccounts] = useState<string[]>([])
  const [wizardGroupsMode, setWizardGroupsMode] = useState<'todos' | 'especificos'>('todos')
  const [wizardGroupIds, setWizardGroupIds] = useState<string[]>([])
  const [wizardContent, setWizardContent] = useState<Record<string, unknown>>({})
  const [wizardRunning, setWizardRunning] = useState(false)
  const [wizardResult, setWizardResult] = useState<string | null>(null)
  const [wizardLastSuccess, setWizardLastSuccess] = useState<string | null>(null)

  // Instance profile pictures (for wizard contas step)
  const [instPics, setInstPics] = useState<Record<string, string | null>>({})

  // Image file for wizard
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const wizardFileRef = useRef<HTMLInputElement>(null)

  const [uploadingFoto, setUploadingFoto] = useState(false)
  const fotoInputRef = useRef<HTMLInputElement>(null)

  const load = () => {
    if (!id) return
    setLoading(true)
    fetchCampanha(id)
      .then(setCampanha)
      .catch(() => setError('Campanha não encontrada'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])
  useEffect(() => { fetchInstances().then(setAllInstances).catch(() => {}) }, [])

  useEffect(() => {
    if (tab === 'atividades' && id) {
      setLoadingAtiv(true)
      fetchAtividades(id).then(setAtividades).finally(() => setLoadingAtiv(false))
    }
  }, [tab, id])

  // Load groups per instance when modal opens — triggered by showAddGrupos OR allInstances loading
  useEffect(() => {
    if (!showAddGrupos) return
    const connected = allInstances.filter(i => i.connectionStatus === 'open')
    if (connected.length === 0) return
    connected.forEach(inst => {
      // Skip if already loaded for this instance
      if (instGroups[inst.name]) return
      setInstLoading(prev => ({ ...prev, [inst.name]: true }))
      fetchGroups(inst.name)
        .then(gs => setInstGroups(prev => ({ ...prev, [inst.name]: { groups: gs, error: false } })))
        .catch(() => setInstGroups(prev => ({ ...prev, [inst.name]: { groups: [], error: true } })))
        .finally(() => setInstLoading(prev => ({ ...prev, [inst.name]: false })))
    })
  }, [showAddGrupos, allInstances])

  // Load group profile pictures when grupos tab opens
  useEffect(() => {
    if (tab !== 'grupos' || !campanha) return
    for (const g of campanha.campanha_grupos) {
      if (g.group_id in groupPics) continue
      fetchProfilePicture(g.instancia, g.group_id)
        .then(url => setGroupPics(prev => ({ ...prev, [g.group_id]: url })))
        .catch(() => setGroupPics(prev => ({ ...prev, [g.group_id]: null })))
    }
  }, [tab, campanha])

  // Load instance pics for wizard contas step
  useEffect(() => {
    if (wizardStep !== 'contas' || !campanha) return
    const campInsts = connectedInstances.filter(i => campanha.instancias?.includes(i.name))
    for (const inst of campInsts) {
      if (inst.name in instPics) continue
      if (!inst.ownerJid) continue
      fetchProfilePicture(inst.name, inst.ownerJid)
        .then(url => setInstPics(prev => ({ ...prev, [inst.name]: url })))
        .catch(() => setInstPics(prev => ({ ...prev, [inst.name]: null })))
    }
  }, [wizardStep, campanha])

  const fmt = (iso: string) => format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

  const toggleInstancia = async (name: string) => {
    if (!campanha) return
    const atual = campanha.instancias ?? []
    const novas = atual.includes(name) ? atual.filter(i => i !== name) : [...atual, name]
    try {
      const updated = await updateCampanha(campanha.id, { instancias: novas })
      setCampanha(updated)
    } catch { setError('Erro ao atualizar instâncias') }
  }

  const handleRemoveGrupo = async (grupo: CampanhaGrupo) => {
    try {
      await removeGrupoDaCampanha(grupo.id)
      load()
    } catch { setError('Erro ao remover grupo') }
  }

  const handleSalvarGrupos = async () => {
    if (!campanha || selectedGroups.length === 0) return
    setSalvandoGrupos(true)
    const jaAdicionados = new Set(campanha.campanha_grupos.map(g => g.group_id))
    const novos = selectedGroups
      .filter(sg => !jaAdicionados.has(sg.id))
      .map(sg => {
        const g = instGroups[sg.instancia]?.groups.find(x => x.id === sg.id)
        return { group_id: sg.id, group_name: g?.subject ?? sg.id, instancia: sg.instancia }
      })
    try {
      if (novos.length > 0) await addGruposToCampanha(campanha.id, novos)
      setShowAddGrupos(false)
      setSelectedGroups([])
      setInstGroups({})
      setInstLoading({})
      setFilterInst('todas')
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar grupos')
    } finally { setSalvandoGrupos(false) }
  }

  const handleFotoUpload = async (file: File) => {
    if (!campanha || !file.type.startsWith('image/')) return
    setUploadingFoto(true)
    try {
      const url = await uploadImage(file)
      const updated = await updateCampanha(campanha.id, { foto_url: url })
      setCampanha(updated)
    } catch { setError('Erro ao salvar foto') }
    finally { setUploadingFoto(false) }
  }

  const handleRemoveFoto = async () => {
    if (!campanha) return
    try {
      const updated = await updateCampanha(campanha.id, { foto_url: '' })
      setCampanha(updated)
    } catch { setError('Erro ao remover foto') }
  }


  const handleCriarGrupos = async () => {
    if (!campanha || !criarNomeBase.trim() || !criarInstancia) return
    setCriandoGrupos(true)
    setCriarError('')
    try {
      const created = await createGroups({
        instance: criarInstancia,
        nomeBase: criarNomeBase.trim(),
        quantidade: criarQuantidade,
        limite: criarLimite,
        ownerJid: criarParticipante.trim() || undefined,
      })
      const toAdd = created
        .filter(g => g.id)
        .map(g => ({ group_id: g.id, group_name: g.subject, instancia: criarInstancia }))
      if (toAdd.length === 0) {
        setCriarError('Nenhum grupo foi criado. A Evolution API pode ter rejeitado a criação — verifique se a instância está conectada e tente novamente.')
        return
      }
      await addGruposToCampanha(campanha.id, toAdd)
      setShowCriarGrupos(false)
      setCriarNomeBase('')
      setCriarQuantidade(1)
      setCriarLimite(550)
      setCriarInstancia('')
      setCriarParticipante('')
      setCriarError('')
      load()
    } catch (e: unknown) {
      setCriarError(e instanceof Error ? e.message : 'Erro ao criar grupos')
    } finally { setCriandoGrupos(false) }
  }

  // Wizard execution
  const handleWizardExecute = async (sendNow?: boolean) => {
    if (!campanha) return
    setWizardRunning(true)
    setWizardResult(null)
    try {
      const groupIds = wizardGroupsMode === 'todos'
        ? campanha.campanha_grupos.map(g => g.group_id)
        : wizardGroupIds

      if (wizardAction === 'enviar-mensagem') {
        let imageUrl = ''
        let imageMimetype = ''
        const msgContent = wizardContent as { mensagem?: string; mentionAll?: boolean; agendadoPara?: string; imageFile?: File }
        if (msgContent.imageFile) {
          imageUrl = await uploadImage(msgContent.imageFile as File)
          imageMimetype = (msgContent.imageFile as File).type
        }
        const baseTime = sendNow
          ? new Date().toISOString()
          : msgContent.agendadoPara
            ? new Date(msgContent.agendadoPara as string).toISOString()
            : new Date().toISOString()
        const result = await dispararCampanha(campanha.id, {
          mensagem: (msgContent.mensagem as string) || '',
          imageUrl,
          imageMimetype,
          mentionAll: !!(msgContent.mentionAll),
          agendadoPara: baseTime,
          groupIds: wizardGroupsMode === 'especificos' ? groupIds : undefined,
          intervaloMin: (msgContent.intervaloMin as number | undefined) ?? 40,
          intervaloMax: (msgContent.intervaloMax as number | undefined) ?? 60,
        })
        // Reset content and go back to conteudo step for next dispatch
        setWizardContent({})
        setImagePreview(null)
        setWizardLastSuccess(`Disparo criado! ${result.itens} grupos agendados.`)
        setWizardStep('conteudo')
      } else {
        const result = await executeGroupAction({
          action: wizardAction,
          instances: wizardAccounts,
          groupIds,
          content: wizardContent,
        })
        const ok = result.results.filter(r => r.ok).length
        const fail = result.results.filter(r => !r.ok).length
        setWizardResult(`Concluído: ${ok} grupos com sucesso${fail > 0 ? `, ${fail} falhas` : ''}.`)
      }
    } catch (e: unknown) {
      setWizardResult('Erro: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setWizardRunning(false)
    }
  }

  const connectedInstances = allInstances.filter(i => i.connectionStatus === 'open')

  const allFlatGroups: { group: Group; instancia: string }[] = Object.entries(instGroups).flatMap(
    ([inst, { groups }]) => groups.map(g => ({ group: g, instancia: inst }))
  )
  const filteredGroups = allFlatGroups.filter(ag => {
    const matchSearch = ag.group.subject.toLowerCase().includes(groupSearch.toLowerCase())
    const matchInst = filterInst === 'todas' || ag.instancia === filterInst
    return matchSearch && matchInst
  })

  // Campaign instances that are connected
  const campInstances = campanha
    ? connectedInstances.filter(i => campanha.instancias?.includes(i.name))
    : []

  if (loading) return (
    <div className="p-8 flex items-center gap-2 text-muted text-sm">
      <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
      Carregando...
    </div>
  )
  if (!campanha) return <div className="p-8 text-red-400 text-sm">{error || 'Campanha não encontrada'}</div>

  const tabs: { key: Tab; label: string }[] = [
    { key: 'visao-geral', label: 'Visão Geral' },
    { key: 'grupos', label: `Grupos (${campanha.campanha_grupos.length})` },
    { key: 'atividades', label: 'Atividades' },
    { key: 'acoes', label: 'Ações' },
  ]

  const wizardStepIndex = WIZARD_STEPS.indexOf(wizardStep)

  const canProceedWizard = (): boolean => {
    if (wizardStep === 'acao') return true
    if (wizardStep === 'contas') return wizardAccounts.length > 0
    if (wizardStep === 'grupos') return wizardGroupsMode === 'todos' || wizardGroupIds.length > 0
    if (wizardStep === 'conteudo') {
      if (wizardAction === 'enviar-mensagem') {
        return !!((wizardContent as { mensagem?: string }).mensagem?.trim())
      }
      if (wizardAction === 'trocar-nome' || wizardAction === 'trocar-descricao') {
        return !!((wizardContent as { value?: string }).value?.trim())
      }
      if (wizardAction === 'trocar-imagem') {
        return !!(wizardContent as { image?: string }).image
      }
      return true
    }
    return true
  }

  const nextStep = () => {
    const idx = WIZARD_STEPS.indexOf(wizardStep)
    if (idx < WIZARD_STEPS.length - 1) setWizardStep(WIZARD_STEPS[idx + 1])
  }

  const prevStep = () => {
    const idx = WIZARD_STEPS.indexOf(wizardStep)
    if (idx > 0) setWizardStep(WIZARD_STEPS[idx - 1])
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <button
          onClick={() => navigate('/campanhas')}
          className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-muted hover:text-white hover:border-border-2 transition-colors flex-shrink-0"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
          <svg width="13" height="13" fill="none" stroke="#f5c518" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white leading-tight">{campanha.nome}</h1>
          <p className="text-xs text-muted">{campanha.campanha_grupos.length} grupos · {campanha.instancias?.length ?? 0} instâncias</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-accent text-white'
                : 'border-transparent text-muted hover:text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* === VISÃO GERAL === */}
      {tab === 'visao-geral' && (
        <div className="space-y-6">
          {/* Foto da campanha */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              {campanha.foto_url ? (
                <img
                  src={campanha.foto_url}
                  alt={campanha.nome}
                  className="w-16 h-16 rounded-xl object-cover border border-border"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-surface-2 border border-border flex items-center justify-center">
                  <svg width="20" height="20" fill="none" stroke="#71717a" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-1">{campanha.nome}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fotoInputRef.current?.click()}
                  disabled={uploadingFoto}
                  className="text-xs text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
                >
                  {uploadingFoto ? 'Salvando...' : campanha.foto_url ? 'Alterar foto' : 'Adicionar foto'}
                </button>
                {campanha.foto_url && (
                  <>
                    <span className="text-muted text-xs">·</span>
                    <button onClick={handleRemoveFoto} className="text-xs text-muted hover:text-red-400 transition-colors">
                      Remover
                    </button>
                  </>
                )}
              </div>
              <input
                ref={fotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFotoUpload(f) }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Grupos', value: campanha.campanha_grupos.length },
              { label: 'Instâncias', value: campanha.instancias?.length ?? 0 },
              { label: 'Disparos', value: atividades.length },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                <p className="text-2xl font-bold text-white tracking-tight">{s.value}</p>
                <p className="text-xs text-muted mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Instâncias */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white">Instâncias da campanha</p>
              <p className="text-xs text-muted">Clique para ativar/desativar</p>
            </div>
            {connectedInstances.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma instância WhatsApp conectada.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {connectedInstances.map(inst => {
                  const ativa = campanha.instancias?.includes(inst.name)
                  return (
                    <button
                      key={inst.name}
                      onClick={() => toggleInstancia(inst.name)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                        ativa
                          ? 'bg-accent text-black border-accent'
                          : 'bg-surface-2 border-border text-muted hover:text-white hover:border-border-2'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ativa ? 'bg-black/40' : 'bg-green-400'}`} />
                      {inst.name}
                    </button>
                  )
                })}
              </div>
            )}
            {!campanha.instancias?.length && connectedInstances.length > 0 && (
              <p className="text-xs text-muted mt-2">Nenhuma instância selecionada ainda.</p>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setTab('acoes')} className="btn-primary flex-1 py-2.5">
              Disparar campanha
            </button>
            <button onClick={() => setTab('grupos')} className="btn-secondary flex-1 py-2.5">
              Gerenciar grupos
            </button>
          </div>
        </div>
      )}

      {/* === GRUPOS === */}
      {tab === 'grupos' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted">{campanha.campanha_grupos.length} grupo(s)</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCriarGrupos(true)}
                className="btn-secondary text-sm"
              >
                Criar Grupos
              </button>
              <button onClick={() => setShowAddGrupos(true)} className="btn-primary text-sm">
                + Adicionar grupos
              </button>
            </div>
          </div>
          {campanha.campanha_grupos.length === 0 ? (
            <div className="bg-card border border-border rounded-xl px-6 py-14 text-center">
              <p className="text-sm text-muted">Nenhum grupo adicionado ainda.</p>
              <div className="flex gap-3 justify-center mt-4">
                <button onClick={() => setShowCriarGrupos(true)} className="btn-secondary text-sm">
                  Criar Grupos
                </button>
                <button onClick={() => setShowAddGrupos(true)} className="text-accent text-sm hover:underline">
                  Adicionar grupos
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {campanha.campanha_grupos.map(grupo => {
                const pic = groupPics[grupo.group_id]
                return (
                  <div
                    key={grupo.id}
                    className="bg-card border border-border rounded-xl p-4 flex flex-col items-center text-center relative group"
                  >
                    {pic ? (
                      <img
                        src={pic}
                        alt={grupo.group_name}
                        className="w-12 h-12 rounded-full object-cover border border-border mb-3"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center mb-3 flex-shrink-0">
                        <span className="text-sm font-semibold text-secondary">
                          {getInitials(grupo.group_name)}
                        </span>
                      </div>
                    )}
                    <p className="text-sm font-medium text-white truncate w-full" title={grupo.group_name}>
                      {grupo.group_name}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{grupo.instancia}</p>
                    <button
                      onClick={() => handleRemoveGrupo(grupo)}
                      className="absolute top-2 right-2 p-1 text-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 rounded"
                      title="Remover"
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* === ATIVIDADES === */}
      {tab === 'atividades' && (
        <div>
          {loadingAtiv ? (
            <div className="flex items-center gap-2 text-muted text-sm">
              <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
              Carregando atividades...
            </div>
          ) : atividades.length === 0 ? (
            <div className="bg-card border border-border rounded-xl px-6 py-14 text-center">
              <p className="text-sm text-muted">Nenhum disparo ainda para esta campanha.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {atividades.map(d => (
                <div key={d.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div
                    className="px-5 py-4 cursor-pointer hover:bg-surface transition-colors"
                    onClick={() => setExpandedAtiv(expandedAtiv === d.id ? null : d.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white truncate">{d.nome}</span>
                          <StatusBadge status={d.status} />
                        </div>
                        <p className="text-xs text-muted truncate">{d.mensagem}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                          <span>{fmt(d.agendado_para)}</span>
                          <span>{d.total_grupos} grupos</span>
                          {d.enviados > 0 && <span className="text-green-400">{d.enviados} enviados</span>}
                          {d.falhas > 0 && <span className="text-red-400">{d.falhas} falhas</span>}
                        </div>
                      </div>
                      {d.total_grupos > 0 && (
                        <div className="w-20 flex-shrink-0">
                          <div className="flex justify-between text-xs text-muted mb-1.5">
                            <span>{Math.round((d.enviados / d.total_grupos) * 100)}%</span>
                          </div>
                          <div className="h-1 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full" style={{ width: `${(d.enviados / d.total_grupos) * 100}%` }} />
                          </div>
                        </div>
                      )}
                      <svg width="14" height="14" fill="none" stroke="#71717a" strokeWidth="2" viewBox="0 0 24 24"
                        className={`flex-shrink-0 transition-transform ${expandedAtiv === d.id ? 'rotate-180' : ''}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {expandedAtiv === d.id && d.disparo_itens && (
                    <div className="border-t border-border divide-y divide-border">
                      {d.disparo_itens.map(item => (
                        <div key={item.id} className="px-5 py-2.5 flex items-center justify-between">
                          <div>
                            <p className="text-sm text-white">{item.group_name || item.group_id}</p>
                            <p className="text-xs text-muted mt-0.5">{item.instancia} · {fmt(item.send_at)}</p>
                          </div>
                          <StatusBadge status={item.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === AÇÕES (WIZARD) === */}
      {tab === 'acoes' && (
        <div>
          {/* Wizard Stepper */}
          <div className="flex items-center mb-8">
            {WIZARD_STEPS.map((step, idx) => (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      idx < wizardStepIndex
                        ? 'bg-accent text-black'
                        : idx === wizardStepIndex
                        ? 'bg-accent text-black ring-2 ring-accent/30'
                        : 'bg-surface-2 border border-border text-muted'
                    }`}
                  >
                    {idx < wizardStepIndex ? (
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium ${idx === wizardStepIndex ? 'text-accent' : 'text-muted'}`}>
                    {WIZARD_LABELS[step]}
                  </span>
                </div>
                {idx < WIZARD_STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-1 mb-4 ${idx < wizardStepIndex ? 'bg-accent' : 'bg-border'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Result message */}
          {wizardResult && (
            <div className={`mb-4 px-4 py-3 rounded-lg text-sm border ${
              wizardResult.startsWith('Erro')
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-green-500/10 border-green-500/20 text-green-400'
            }`}>
              {wizardResult}
              <button
                onClick={() => { setWizardStep('acao'); setWizardResult(null) }}
                className="ml-3 text-xs underline opacity-70 hover:opacity-100"
              >
                Nova ação
              </button>
            </div>
          )}

          {/* Step: Ação */}
          {wizardStep === 'acao' && !wizardResult && (
            <div className="space-y-1">
              <p className="text-xs text-muted uppercase tracking-wider mb-3">Selecione uma ação</p>
              {ACTIONS.map(action => (
                <label
                  key={action.key}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border cursor-pointer transition-all ${
                    wizardAction === action.key
                      ? 'bg-accent/10 border-accent/40 text-white'
                      : 'bg-card border-border text-secondary hover:border-border-2 hover:text-white'
                  }`}
                >
                  <span className={wizardAction === action.key ? 'text-accent' : 'text-muted'}>
                    {action.icon}
                  </span>
                  <span className="flex-1 text-sm font-medium">{action.label}</span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    wizardAction === action.key ? 'border-accent' : 'border-border'
                  }`}>
                    {wizardAction === action.key && <div className="w-2 h-2 rounded-full bg-accent" />}
                  </div>
                  <input
                    type="radio"
                    className="hidden"
                    checked={wizardAction === action.key}
                    onChange={() => setWizardAction(action.key)}
                  />
                </label>
              ))}
            </div>
          )}

          {/* Step: Contas */}
          {wizardStep === 'contas' && !wizardResult && (
            <div>
              <p className="text-xs text-muted uppercase tracking-wider mb-3">Contas que irão executar a ação</p>
              {campInstances.length === 0 ? (
                <div className="bg-card border border-border rounded-xl px-6 py-10 text-center">
                  <p className="text-sm text-muted">Nenhuma instância conectada na campanha.</p>
                  <button onClick={() => setTab('visao-geral')} className="mt-2 text-accent text-sm hover:underline">
                    Adicionar instâncias
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {campInstances.map(inst => {
                    const selected = wizardAccounts.includes(inst.name)
                    const pic = instPics[inst.name]
                    return (
                      <label
                        key={inst.name}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border cursor-pointer transition-all ${
                          selected
                            ? 'bg-accent/10 border-accent/40'
                            : 'bg-card border-border hover:border-border-2'
                        }`}
                      >
                        {pic ? (
                          <img src={pic} alt={inst.name} className="w-9 h-9 rounded-full object-cover border border-border flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-surface-2 border border-border flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-secondary">{getInitials(inst.name)}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{inst.name}</p>
                          {inst.ownerJid && (
                            <p className="text-xs text-muted truncate">{inst.ownerJid.replace('@s.whatsapp.net', '')}</p>
                          )}
                        </div>
                        <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" title="Conectado" />
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          selected ? 'border-accent bg-accent' : 'border-border'
                        }`}>
                          {selected && (
                            <svg width="10" height="10" fill="none" stroke="#000" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={selected}
                          onChange={() => setWizardAccounts(prev =>
                            prev.includes(inst.name) ? prev.filter(n => n !== inst.name) : [...prev, inst.name]
                          )}
                        />
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step: Grupos */}
          {wizardStep === 'grupos' && !wizardResult && (
            <div className="space-y-3">
              <p className="text-xs text-muted uppercase tracking-wider mb-3">Selecione os grupos</p>
              <button
                onClick={() => setWizardGroupsMode('todos')}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border transition-all ${
                  wizardGroupsMode === 'todos'
                    ? 'bg-accent/10 border-accent/40'
                    : 'bg-card border-border hover:border-border-2'
                }`}
              >
                <svg width="16" height="16" fill="none" stroke={wizardGroupsMode === 'todos' ? '#f5c518' : '#71717a'} strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-medium ${wizardGroupsMode === 'todos' ? 'text-white' : 'text-secondary'}`}>Todos os grupos</p>
                  <p className="text-xs text-muted">{campanha.campanha_grupos.length} grupos na campanha</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${wizardGroupsMode === 'todos' ? 'border-accent' : 'border-border'}`}>
                  {wizardGroupsMode === 'todos' && <div className="w-2 h-2 rounded-full bg-accent" />}
                </div>
              </button>

              <button
                onClick={() => setWizardGroupsMode('especificos')}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border transition-all ${
                  wizardGroupsMode === 'especificos'
                    ? 'bg-accent/10 border-accent/40'
                    : 'bg-card border-border hover:border-border-2'
                }`}
              >
                <svg width="16" height="16" fill="none" stroke={wizardGroupsMode === 'especificos' ? '#f5c518' : '#71717a'} strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-medium ${wizardGroupsMode === 'especificos' ? 'text-white' : 'text-secondary'}`}>Grupos específicos</p>
                  <p className="text-xs text-muted">
                    {wizardGroupIds.length > 0 ? `${wizardGroupIds.length} selecionados` : 'Escolha manualmente'}
                  </p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${wizardGroupsMode === 'especificos' ? 'border-accent' : 'border-border'}`}>
                  {wizardGroupsMode === 'especificos' && <div className="w-2 h-2 rounded-full bg-accent" />}
                </div>
              </button>

              {wizardGroupsMode === 'especificos' && (
                <div className="mt-2 bg-card border border-border rounded-xl overflow-hidden">
                  <div className="max-h-64 overflow-y-auto divide-y divide-border">
                    {campanha.campanha_grupos.map(g => {
                      const pic = groupPics[g.group_id]
                      const sel = wizardGroupIds.includes(g.group_id)
                      return (
                        <label
                          key={g.id}
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface transition-colors"
                        >
                          {pic ? (
                            <img src={pic} alt={g.group_name} className="w-8 h-8 rounded-full object-cover border border-border flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-semibold text-secondary">{getInitials(g.group_name)}</span>
                            </div>
                          )}
                          <span className="flex-1 text-sm text-white truncate">{g.group_name}</span>
                          <input
                            type="checkbox"
                            className="accent-accent w-4 h-4 flex-shrink-0"
                            checked={sel}
                            onChange={() => setWizardGroupIds(prev =>
                              prev.includes(g.group_id) ? prev.filter(x => x !== g.group_id) : [...prev, g.group_id]
                            )}
                          />
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step: Conteúdo */}
          {wizardStep === 'conteudo' && !wizardResult && (
            <div className="space-y-4">
              {wizardLastSuccess && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {wizardLastSuccess}
                  <button onClick={() => setWizardLastSuccess(null)} className="ml-auto text-green-400/60 hover:text-green-400">
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              <p className="text-xs text-muted uppercase tracking-wider mb-3">Conteúdo da ação</p>

              {wizardAction === 'enviar-mensagem' && (() => {
                const msg = (wizardContent as { mensagem?: string }).mensagem ?? ''
                const mentionAll = (wizardContent as { mentionAll?: boolean }).mentionAll ?? false
                const agendadoPara = (wizardContent as { agendadoPara?: string }).agendadoPara ?? ''
                const now = new Date()
                const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                return (
                  <div className="flex gap-6">
                    {/* Editor */}
                    <div className="flex-1 space-y-4 min-w-0">
                      <div>
                        <label className="block text-xs text-muted uppercase tracking-wider mb-2">Mensagem</label>
                        <textarea
                          placeholder="Digite a mensagem..."
                          value={msg}
                          onChange={e => setWizardContent(prev => ({ ...prev, mensagem: e.target.value }))}
                          rows={5}
                          className="input resize-none"
                        />
                        <p className="text-xs text-muted mt-1">{msg.length} caracteres</p>
                      </div>
                      <div>
                        <label className="block text-xs text-muted uppercase tracking-wider mb-2">Imagem <span className="normal-case">(opcional)</span></label>
                        <div
                          onClick={() => wizardFileRef.current?.click()}
                          onDrop={e => {
                            e.preventDefault()
                            const f = e.dataTransfer.files[0]
                            if (f && f.type.startsWith('image/')) {
                              setWizardContent(prev => ({ ...prev, imageFile: f }))
                              setImagePreview(URL.createObjectURL(f))
                            }
                          }}
                          onDragOver={e => e.preventDefault()}
                          className="border border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-border-2 transition-colors"
                        >
                          {imagePreview ? (
                            <div className="relative inline-block">
                              <img src={imagePreview} alt="preview" className="max-h-24 rounded-lg mx-auto" />
                              <button
                                onClick={e => { e.stopPropagation(); setWizardContent(prev => ({ ...prev, imageFile: undefined })); setImagePreview(null) }}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                              >×</button>
                            </div>
                          ) : (
                            <div>
                              <svg width="18" height="18" fill="none" stroke="#71717a" strokeWidth="1.5" viewBox="0 0 24 24" className="mx-auto mb-1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="text-xs text-muted">Arraste ou clique para selecionar</p>
                            </div>
                          )}
                        </div>
                        <input ref={wizardFileRef} type="file" accept="image/*" className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) { setWizardContent(prev => ({ ...prev, imageFile: f })); setImagePreview(URL.createObjectURL(f)) }
                          }} />
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div
                          onClick={() => setWizardContent(prev => ({ ...prev, mentionAll: !mentionAll }))}
                          className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${mentionAll ? 'bg-accent' : 'bg-surface-2 border border-border'}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${mentionAll ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </div>
                        <span className="text-sm text-secondary">Mencionar todos (@todos)</span>
                      </label>
                      <div>
                        <label className="block text-xs text-muted uppercase tracking-wider mb-2">Agendar para <span className="normal-case">(BRT — UTC-3)</span></label>
                        <input
                          type="datetime-local"
                          value={agendadoPara}
                          onChange={e => setWizardContent(prev => ({ ...prev, agendadoPara: e.target.value }))}
                          className="input w-auto"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted uppercase tracking-wider mb-2">Intervalo entre grupos</label>
                        <div className="flex gap-2">
                          {[
                            { label: '10–20s', min: 10, max: 20, desc: 'Rápido' },
                            { label: '40–60s', min: 40, max: 60, desc: 'Padrão' },
                            { label: '60–120s', min: 60, max: 120, desc: 'Seguro' },
                          ].map(opt => {
                            const curMin = (wizardContent as { intervaloMin?: number }).intervaloMin ?? 40
                            const selected = curMin === opt.min
                            return (
                              <button
                                key={opt.label}
                                type="button"
                                onClick={() => setWizardContent(prev => ({ ...prev, intervaloMin: opt.min, intervaloMax: opt.max }))}
                                className={`flex-1 py-2 px-2 rounded-lg border text-xs font-medium transition-colors ${
                                  selected
                                    ? 'bg-accent text-black border-accent'
                                    : 'bg-surface-2 border-border text-muted hover:text-white hover:border-border-2'
                                }`}
                              >
                                <div className="font-semibold">{opt.label}</div>
                                <div className="opacity-70 mt-0.5">{opt.desc}</div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp Preview */}
                    <div className="w-64 flex-shrink-0">
                      <p className="text-xs text-muted uppercase tracking-wider mb-2">Pré-visualização</p>
                      <div className="rounded-2xl overflow-hidden border border-border" style={{ background: '#111b21' }}>
                        {/* Chat header */}
                        <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ background: '#202c33' }}>
                          <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent font-bold text-xs">
                            {campanha.nome.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{campanha.nome}</p>
                            <p className="text-[10px]" style={{ color: '#8696a0' }}>{campanha.campanha_grupos.length} participantes</p>
                          </div>
                        </div>
                        {/* Chat body */}
                        <div className="px-3 py-4 min-h-36 flex flex-col justify-end gap-1" style={{ background: '#0b141a' }}>
                          {(msg || imagePreview) ? (
                            <div className="self-end max-w-[90%] rounded-xl rounded-tr-sm px-2.5 pt-2 pb-1.5 text-xs relative" style={{ background: '#005c4b' }}>
                              {imagePreview && (
                                <img src={imagePreview} alt="" className="rounded-lg mb-1.5 w-full object-cover max-h-32" />
                              )}
                              {msg && (
                                <p className="text-white text-[11px] leading-[1.4] whitespace-pre-wrap break-words">{msg}</p>
                              )}
                              {mentionAll && (
                                <p className="text-[10px] mt-0.5" style={{ color: '#53bdeb' }}>@todos</p>
                              )}
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <span className="text-[9px]" style={{ color: '#8696a0' }}>{timeStr}</span>
                                <svg width="14" height="8" viewBox="0 0 16 11" fill="none">
                                  <path d="M11 1L5.5 6.5L3 4" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M15 1L9.5 6.5L7 4" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-[10px]" style={{ color: '#8696a0' }}>Digite uma mensagem para ver o preview</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {(wizardAction === 'trocar-nome') && (
                <div>
                  <label className="block text-xs text-muted uppercase tracking-wider mb-2">Novo nome do grupo</label>
                  <input
                    type="text"
                    placeholder="Nome do grupo..."
                    value={(wizardContent as { value?: string }).value ?? ''}
                    onChange={e => setWizardContent(prev => ({ ...prev, value: e.target.value }))}
                    className="input"
                  />
                </div>
              )}

              {wizardAction === 'trocar-descricao' && (
                <div>
                  <label className="block text-xs text-muted uppercase tracking-wider mb-2">Nova descrição</label>
                  <textarea
                    placeholder="Descrição do grupo..."
                    value={(wizardContent as { value?: string }).value ?? ''}
                    onChange={e => setWizardContent(prev => ({ ...prev, value: e.target.value }))}
                    rows={4}
                    className="input resize-none"
                  />
                </div>
              )}

              {wizardAction === 'trocar-imagem' && (
                <div>
                  <label className="block text-xs text-muted uppercase tracking-wider mb-2">Nova imagem do grupo</label>
                  <div
                    onClick={() => wizardFileRef.current?.click()}
                    onDrop={e => {
                      e.preventDefault()
                      const f = e.dataTransfer.files[0]
                      if (f && f.type.startsWith('image/')) {
                        const reader = new FileReader()
                        reader.onload = ev => {
                          const base64 = (ev.target?.result as string)?.split(',')[1]
                          setWizardContent(prev => ({ ...prev, image: base64 }))
                        }
                        reader.readAsDataURL(f)
                        setImagePreview(URL.createObjectURL(f))
                      }
                    }}
                    onDragOver={e => e.preventDefault()}
                    className="border border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-border-2 transition-colors"
                  >
                    {imagePreview ? (
                      <div className="relative inline-block">
                        <img src={imagePreview} alt="preview" className="max-h-28 rounded-lg mx-auto" />
                        <button
                          onClick={e => { e.stopPropagation(); setWizardContent(prev => ({ ...prev, image: undefined })); setImagePreview(null) }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >×</button>
                      </div>
                    ) : (
                      <div>
                        <svg width="20" height="20" fill="none" stroke="#71717a" strokeWidth="1.5" viewBox="0 0 24 24" className="mx-auto mb-2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-muted">Arraste ou clique para selecionar</p>
                      </div>
                    )}
                  </div>
                  <input ref={wizardFileRef} type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) {
                        const reader = new FileReader()
                        reader.onload = ev => {
                          const base64 = (ev.target?.result as string)?.split(',')[1]
                          setWizardContent(prev => ({ ...prev, image: base64 }))
                        }
                        reader.readAsDataURL(f)
                        setImagePreview(URL.createObjectURL(f))
                      }
                    }} />
                </div>
              )}

              {wizardAction === 'trocar-configuracao' && (
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer select-none bg-card border border-border rounded-xl px-4 py-3">
                    <div
                      onClick={() => setWizardContent(prev => ({ ...prev, onlyAdmins: !(prev as { onlyAdmins?: boolean }).onlyAdmins }))}
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${(wizardContent as { onlyAdmins?: boolean }).onlyAdmins ? 'bg-accent' : 'bg-surface-2 border border-border'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(wizardContent as { onlyAdmins?: boolean }).onlyAdmins ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-sm text-secondary">Apenas admins podem enviar</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer select-none bg-card border border-border rounded-xl px-4 py-3">
                    <div
                      onClick={() => setWizardContent(prev => ({ ...prev, tempMessages: !(prev as { tempMessages?: boolean }).tempMessages }))}
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${(wizardContent as { tempMessages?: boolean }).tempMessages ? 'bg-accent' : 'bg-surface-2 border border-border'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(wizardContent as { tempMessages?: boolean }).tempMessages ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-sm text-secondary">Mensagens temporárias</span>
                  </label>
                </div>
              )}

              {(wizardAction === 'fechar-grupos' || wizardAction === 'abrir-grupos' || wizardAction === 'entrar-grupo') && (
                <div className="bg-card border border-border rounded-xl px-5 py-5 flex items-start gap-3">
                  <svg width="16" height="16" fill="none" stroke="#f5c518" strokeWidth="2" viewBox="0 0 24 24" className="mt-0.5 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-white mb-1">
                      {wizardAction === 'fechar-grupos' && 'Fechar grupos'}
                      {wizardAction === 'abrir-grupos' && 'Abrir grupos'}
                      {wizardAction === 'entrar-grupo' && 'Entrar nos grupos'}
                    </p>
                    <p className="text-xs text-muted">
                      {wizardAction === 'fechar-grupos' && 'Esta ação irá restringir o envio de mensagens apenas para administradores nos grupos selecionados.'}
                      {wizardAction === 'abrir-grupos' && 'Esta ação irá permitir que todos os participantes enviem mensagens nos grupos selecionados.'}
                      {wizardAction === 'entrar-grupo' && 'As contas selecionadas irão entrar nos grupos selecionados.'}
                    </p>
                  </div>
                </div>
              )}

              {wizardAction === 'add-admins' && (
                <div>
                  <label className="block text-xs text-muted uppercase tracking-wider mb-2">Números de telefone</label>
                  <textarea
                    placeholder="5511999999999, 5521888888888..."
                    value={(wizardContent as { phonesText?: string }).phonesText ?? ''}
                    onChange={e => {
                      const phones = e.target.value.split(/[\s,]+/).map(p => p.trim()).filter(Boolean)
                      setWizardContent(prev => ({ ...prev, phonesText: e.target.value, phones }))
                    }}
                    rows={4}
                    className="input resize-none"
                  />
                  <p className="text-xs text-muted mt-1">Separe múltiplos números por vírgula ou nova linha. Formato: DDI + DDD + número</p>
                </div>
              )}
            </div>
          )}

          {/* Step: Confirmar */}
          {wizardStep === 'confirmar' && !wizardResult && (
            <div className="space-y-4">
              <p className="text-xs text-muted uppercase tracking-wider mb-3">Resumo</p>

              <div className="bg-card border border-border rounded-xl divide-y divide-border">
                <div className="px-5 py-3 flex justify-between">
                  <span className="text-xs text-muted">Ação</span>
                  <span className="text-sm text-white font-medium">
                    {ACTIONS.find(a => a.key === wizardAction)?.label}
                  </span>
                </div>
                <div className="px-5 py-3 flex justify-between">
                  <span className="text-xs text-muted">Contas</span>
                  <span className="text-sm text-white font-medium">{wizardAccounts.join(', ')}</span>
                </div>
                <div className="px-5 py-3 flex justify-between">
                  <span className="text-xs text-muted">Grupos</span>
                  <span className="text-sm text-white font-medium">
                    {wizardGroupsMode === 'todos'
                      ? `Todos (${campanha.campanha_grupos.length})`
                      : `${wizardGroupIds.length} selecionados`}
                  </span>
                </div>
              </div>

              {wizardRunning && (
                <div className="flex items-center gap-2 text-muted text-sm py-2">
                  <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
                  Executando...
                </div>
              )}

              {wizardAction === 'enviar-mensagem' ? (
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => handleWizardExecute(true)}
                    disabled={wizardRunning}
                    className="flex-1 py-2.5 rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-semibold text-sm transition-colors"
                  >
                    {wizardRunning ? 'Enviando...' : 'Enviar Agora'}
                  </button>
                  <button
                    onClick={() => handleWizardExecute(false)}
                    disabled={wizardRunning}
                    className="btn-primary flex-1 py-2.5"
                  >
                    {wizardRunning ? 'Agendando...' : 'Agendar'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleWizardExecute()}
                  disabled={wizardRunning}
                  className="btn-primary w-full py-2.5"
                >
                  {wizardRunning ? 'Executando...' : 'Executar'}
                </button>
              )}
            </div>
          )}

          {/* Wizard Navigation */}
          {!wizardResult && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <button
                onClick={prevStep}
                disabled={wizardStepIndex === 0}
                className="flex items-center gap-1.5 text-sm text-muted hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
              </button>
              {wizardStep !== 'confirmar' && (
                <button
                  onClick={nextStep}
                  disabled={!canProceedWizard()}
                  className="flex items-center gap-1.5 text-sm font-semibold text-black bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
                >
                  PRÓXIMA
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal adicionar grupos */}
      {showAddGrupos && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-lg p-6 shadow-modal">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold">Adicionar grupos</h2>
              {selectedGroups.length > 0 && (
                <span className="text-xs text-accent font-medium">{selectedGroups.length} selecionados</span>
              )}
            </div>
            <p className="text-xs text-muted mb-4">Grupos de todas as instâncias conectadas.</p>

            {/* Instance filter tabs */}
            {connectedInstances.length > 1 && (
              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                <button
                  onClick={() => setFilterInst('todas')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                    filterInst === 'todas'
                      ? 'bg-accent text-black border-accent'
                      : 'bg-surface-2 border-border text-muted hover:text-white'
                  }`}
                >
                  Todas
                </button>
                {connectedInstances.map(inst => {
                  const loading = instLoading[inst.name]
                  const loaded = instGroups[inst.name]
                  const hasError = loaded?.error
                  return (
                    <button
                      key={inst.name}
                      onClick={() => setFilterInst(inst.name)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border flex items-center gap-1.5 ${
                        filterInst === inst.name
                          ? 'bg-accent text-black border-accent'
                          : hasError
                          ? 'bg-red-500/10 border-red-500/30 text-red-400'
                          : 'bg-surface-2 border-border text-muted hover:text-white'
                      }`}
                    >
                      {loading && <span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />}
                      {!loading && hasError && <span className="text-red-400">!</span>}
                      {!loading && loaded && !hasError && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                      {inst.name}
                      {loaded && !hasError && <span className="opacity-60">({loaded.groups.length})</span>}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Search + list */}
            <div className="bg-surface-2 border border-border rounded-xl overflow-hidden mb-5">
              <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                <svg width="13" height="13" fill="none" stroke="#71717a" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar grupos..."
                  value={groupSearch}
                  onChange={e => setGroupSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white placeholder-muted focus:outline-none"
                />
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-border">
                {/* Show loading for instances not yet loaded */}
                {connectedInstances.some(i => instLoading[i.name]) && filteredGroups.length === 0 && (
                  <div className="px-4 py-6 text-muted text-sm text-center flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
                    Buscando grupos...
                  </div>
                )}
                {/* Error state when instance failed and no groups */}
                {filterInst !== 'todas' && instGroups[filterInst]?.error && (
                  <div className="px-4 py-4 text-red-400 text-xs text-center">
                    Erro ao carregar grupos de <strong>{filterInst}</strong>. Verifique se a instância está conectada.
                  </div>
                )}
                {!connectedInstances.some(i => instLoading[i.name]) && filteredGroups.length === 0 && connectedInstances.length > 0 && !(filterInst !== 'todas' && instGroups[filterInst]?.error) && (
                  <div className="px-4 py-6 text-muted text-sm text-center">Nenhum grupo encontrado</div>
                )}
                {filteredGroups.map(({ group: g, instancia }) => {
                  const jaAdicionado = campanha.campanha_grupos.some(cg => cg.group_id === g.id)
                  const isSelected = selectedGroups.some(sg => sg.id === g.id && sg.instancia === instancia)
                  return (
                    <label
                      key={`${instancia}:${g.id}`}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-surface transition-colors ${jaAdicionado ? 'opacity-40 cursor-default' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={jaAdicionado}
                        onChange={() => setSelectedGroups(prev =>
                          isSelected
                            ? prev.filter(sg => !(sg.id === g.id && sg.instancia === instancia))
                            : [...prev, { id: g.id, instancia }]
                        )}
                        className="accent-accent w-4 h-4 flex-shrink-0"
                      />
                      <span className="text-sm text-white flex-1 truncate">{g.subject}</span>
                      {filterInst === 'todas' && (
                        <span className="text-[10px] text-muted bg-surface px-1.5 py-0.5 rounded flex-shrink-0">{instancia}</span>
                      )}
                      {g.size != null && !jaAdicionado && (
                        <span className="text-[11px] text-muted flex-shrink-0">{g.size} part.</span>
                      )}
                      {jaAdicionado && <span className="text-xs text-muted flex-shrink-0">já adicionado</span>}
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowAddGrupos(false); setSelectedGroups([]); setInstGroups({}); setInstLoading({}); setFilterInst('todas') }}
                className="btn-secondary flex-1 py-2.5"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarGrupos}
                disabled={salvandoGrupos || selectedGroups.length === 0}
                className="btn-primary flex-1 py-2.5"
              >
                {salvandoGrupos ? 'Salvando...' : `Adicionar ${selectedGroups.length || ''} grupo(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal criar grupos */}
      {showCriarGrupos && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md p-6 shadow-modal">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold">Criar Grupos</h2>
                <p className="text-xs text-muted mt-0.5">Crie múltiplos grupos automaticamente via WhatsApp</p>
              </div>
              <button
                onClick={() => setShowCriarGrupos(false)}
                className="text-muted hover:text-white transition-colors"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-2">Nome base</label>
                <input
                  type="text"
                  placeholder="Ex: Dia das Mães"
                  value={criarNomeBase}
                  onChange={e => setCriarNomeBase(e.target.value)}
                  className="input"
                />
                <p className="text-xs text-muted mt-1">Os grupos serão nomeados: {criarNomeBase || 'Nome'} #1, {criarNomeBase || 'Nome'} #2...</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted uppercase tracking-wider mb-2">Quantidade</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={criarQuantidade}
                    onChange={e => setCriarQuantidade(Number(e.target.value))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted uppercase tracking-wider mb-2">Limite de pessoas</label>
                  <input
                    type="number"
                    min={1}
                    max={1024}
                    value={criarLimite}
                    onChange={e => setCriarLimite(Number(e.target.value))}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-2">Número participante inicial</label>
                <input
                  type="text"
                  placeholder="5511999999999"
                  value={criarParticipante}
                  onChange={e => setCriarParticipante(e.target.value)}
                  className="input"
                />
                <p className="text-xs text-muted mt-1">WhatsApp exige ao menos 1 participante (diferente do criador) para criar um grupo.</p>
              </div>

              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-2">Instância</label>
                <div className="flex flex-wrap gap-2">
                  {connectedInstances.length === 0 && (
                    <p className="text-sm text-muted">Nenhuma instância conectada.</p>
                  )}
                  {connectedInstances.map(inst => (
                    <button
                      key={inst.name}
                      onClick={() => setCriarInstancia(inst.name)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        criarInstancia === inst.name
                          ? 'bg-accent text-black border-accent'
                          : 'bg-surface-2 border-border text-muted hover:text-white hover:border-border-2'
                      }`}
                    >
                      {inst.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {criarError && (
              <div className="mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {criarError}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setShowCriarGrupos(false); setCriarError('') }}
                className="btn-secondary flex-1 py-2.5"
              >
                Cancelar
              </button>
              <button
                onClick={handleCriarGrupos}
                disabled={criandoGrupos || !criarNomeBase.trim() || !criarInstancia || !criarParticipante.trim()}
                className="btn-primary flex-1 py-2.5"
              >
                {criandoGrupos ? 'Criando...' : `Criar ${criarQuantidade} grupo(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
