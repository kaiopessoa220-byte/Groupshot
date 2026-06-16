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

function GroupAvatar({ pic, name, size = 10, isCommunity = false }: { pic?: string | null; name: string; size?: number; isCommunity?: boolean }) {
  const sz = `w-${size} h-${size}`
  return (
    <div className={`${sz} relative flex-shrink-0`}>
      {pic ? (
        <img src={pic} alt={name} className={`${sz} rounded-full object-cover border border-border`} />
      ) : (
        <div className={`${sz} rounded-full bg-surface-2 border border-border flex items-center justify-center`}>
          <span className="text-xs font-semibold text-secondary">{getInitials(name)}</span>
        </div>
      )}
      {isCommunity && (
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent flex items-center justify-center border border-surface" title="Comunidade">
          <svg width="9" height="9" fill="none" stroke="#000" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        </span>
      )}
    </div>
  )
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
  const [communityGroupIds, setCommunityGroupIds] = useState<Set<string>>(new Set())
  const [groupSearch, setGroupSearch] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<{ id: string; instancia: string }[]>([])
  const [salvandoGrupos, setSalvandoGrupos] = useState(false)
  const [filterInst, setFilterInst] = useState<string | 'todas'>('todas')

  // Grupos tab profile pictures
  const [groupPics, setGroupPics] = useState<Record<string, string | null>>({})
  // Grupos tab participant counts
  const [groupSizes, setGroupSizes] = useState<Record<string, number>>({})

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
  const [wizardAgendarMode, setWizardAgendarMode] = useState(false)

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
        .then(gs => {
          setInstGroups(prev => ({ ...prev, [inst.name]: { groups: gs, error: false } }))
          setCommunityGroupIds(prev => {
            const next = new Set(prev)
            gs.filter(g => g.isCommunity).forEach(g => next.add(g.id))
            return next
          })
        })
        .catch(() => setInstGroups(prev => ({ ...prev, [inst.name]: { groups: [], error: true } })))
        .finally(() => setInstLoading(prev => ({ ...prev, [inst.name]: false })))
    })
  }, [showAddGrupos, allInstances])

  // Load group profile pictures and participant counts when grupos tab opens
  useEffect(() => {
    if (tab !== 'grupos' || !campanha) return
    for (const g of campanha.campanha_grupos) {
      if (g.group_id in groupPics) continue
      fetchProfilePicture(g.instancia, g.group_id)
        .then(url => setGroupPics(prev => ({ ...prev, [g.group_id]: url })))
        .catch(() => setGroupPics(prev => ({ ...prev, [g.group_id]: null })))
    }
    // Fetch sizes grouped by instance to avoid N calls
    const instancesNeeded = [...new Set(campanha.campanha_grupos.map(g => g.instancia))]
    for (const inst of instancesNeeded) {
      fetchGroups(inst)
        .then(gs => {
          setGroupSizes(prev => {
            const next = { ...prev }
            for (const g of gs) if (g.size != null) next[g.id] = g.size
            return next
          })
        })
        .catch(() => {})
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
        const msgContent = wizardContent as { mensagem?: string; mentionAll?: boolean; agendadoPara?: string; imageFile?: File; intervaloMin?: number; intervaloMax?: number; blocos?: Array<{ mensagem: string; imageFile?: File }> }
        const baseTime = sendNow
          ? new Date().toISOString()
          : msgContent.agendadoPara
            ? new Date(msgContent.agendadoPara as string).toISOString()
            : new Date().toISOString()
        // Build final list of blocks (saved + current unsaved if non-empty)
        const savedBlocos = msgContent.blocos ?? []
        const currentBloco = { mensagem: msgContent.mensagem ?? '', imageFile: msgContent.imageFile }
        const allBlocos = savedBlocos.length > 0
          ? (currentBloco.mensagem.trim() || currentBloco.imageFile ? [...savedBlocos, currentBloco] : savedBlocos)
          : [currentBloco]
        // Upload images and build mensagens payload
        const mensagens = await Promise.all(allBlocos.map(async bloco => {
          let imageUrl = ''
          let imageMimetype = ''
          if (bloco.imageFile) {
            imageUrl = await uploadImage(bloco.imageFile)
            imageMimetype = bloco.imageFile.type
          }
          return { mensagem: bloco.mensagem || '', imageUrl, imageMimetype }
        }))
        const result = await dispararCampanha(campanha.id, {
          mensagem: mensagens[0].mensagem,
          mensagens: mensagens.length > 1 ? mensagens : undefined,
          imageUrl: mensagens[0].imageUrl,
          imageMimetype: mensagens[0].imageMimetype,
          mentionAll: !!(msgContent.mentionAll),
          agendadoPara: baseTime,
          groupIds: wizardGroupsMode === 'especificos' ? groupIds : undefined,
          intervaloMin: msgContent.intervaloMin ?? 40,
          intervaloMax: msgContent.intervaloMax ?? 60,
        })
        // Reset content and go back to conteudo step for next dispatch
        setWizardContent({})
        setImagePreview(null)
        setWizardLastSuccess(`Disparo criado! ${result.itens} grupos agendados (${allBlocos.length} bloco${allBlocos.length > 1 ? 's' : ''}).`)
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
    if (ag.group.linkedParent) return false // sub-grupos aparecem só via seleção da comunidade
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
        const hasCurrent = !!((wizardContent as { mensagem?: string }).mensagem?.trim())
        const hasBlocos = ((wizardContent as { blocos?: unknown[] }).blocos?.length ?? 0) > 0
        return hasCurrent || hasBlocos
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
    <div className="p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <button
          onClick={() => navigate('/campanhas')}
          className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-muted hover:text-foreground hover:border-border-2 transition-colors flex-shrink-0"
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
          <h1 className="text-lg font-semibold text-foreground leading-tight">{campanha.nome}</h1>
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
                ? 'border-accent text-foreground'
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
              <p className="text-sm font-medium text-foreground mb-1">{campanha.nome}</p>
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
                <p className="text-2xl font-bold text-foreground tracking-tight">{s.value}</p>
                <p className="text-xs text-muted mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Instâncias */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-foreground">Instâncias da campanha</p>
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
                          : 'bg-surface-2 border-border text-muted hover:text-foreground hover:border-border-2'
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
                    <div className="mb-3">
                      <GroupAvatar pic={pic} name={grupo.group_name} size={12} isCommunity={communityGroupIds.has(grupo.group_id)} />
                    </div>
                    <p className="text-sm font-medium text-foreground truncate w-full" title={grupo.group_name}>
                      {grupo.group_name}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{grupo.instancia}</p>
                    {groupSizes[grupo.group_id] != null && (
                      <p className="text-xs text-muted mt-1 flex items-center gap-1">
                        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {groupSizes[grupo.group_id]} participantes
                      </p>
                    )}
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
                          <span className="text-sm font-medium text-foreground truncate">{d.nome}</span>
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
                            <p className="text-sm text-foreground">{item.group_name || item.group_id}</p>
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
                      ? 'bg-accent/10 border-accent/40 text-foreground'
                      : 'bg-card border-border text-secondary hover:border-border-2 hover:text-foreground'
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
                          <p className="text-sm font-medium text-foreground">{inst.name}</p>
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
                  <p className={`text-sm font-medium ${wizardGroupsMode === 'todos' ? 'text-foreground' : 'text-secondary'}`}>Todos os grupos</p>
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
                  <p className={`text-sm font-medium ${wizardGroupsMode === 'especificos' ? 'text-foreground' : 'text-secondary'}`}>Grupos específicos</p>
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
                      const isCommunity = communityGroupIds.has(g.group_id)
                      return (
                        <label
                          key={g.id}
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface transition-colors"
                        >
                          <GroupAvatar pic={pic} name={g.group_name} size={8} isCommunity={isCommunity} />
                          <span className="flex-1 text-sm text-foreground truncate">{g.group_name}</span>
                          {isCommunity && <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded flex-shrink-0">Comunidade</span>}
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
                const tempMessages = (wizardContent as { tempMessages?: boolean }).tempMessages ?? false
                const curMin = (wizardContent as { intervaloMin?: number }).intervaloMin ?? 40
                const blocos = (wizardContent as { blocos?: Array<{ mensagem: string; imagePreview?: string; imageFile?: File }> }).blocos ?? []
                const now = new Date()
                const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                const intervalOpts = [
                  { label: '10–20s', min: 10, max: 20, desc: 'Rápido' },
                  { label: '40–60s', min: 40, max: 60, desc: 'Padrão' },
                  { label: '60–120s', min: 60, max: 120, desc: 'Seguro' },
                ] as const
                const selectedOpt = intervalOpts.find(o => o.min === curMin) ?? intervalOpts[1]
                const handleSalvarBloco = () => {
                  if (!msg.trim() && !imagePreview) return
                  setWizardContent(prev => {
                    const prevBlocos = (prev as { blocos?: Array<{ mensagem: string; imageFile?: File; imagePreview?: string }> }).blocos ?? []
                    return {
                      ...prev,
                      mensagem: '',
                      imageFile: undefined,
                      blocos: [...prevBlocos, {
                        mensagem: msg,
                        imageFile: (prev as { imageFile?: File }).imageFile,
                        imagePreview: imagePreview ?? undefined,
                      }],
                    }
                  })
                  setImagePreview(null)
                }
                const iconPaths = [
                  { d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', fn: undefined },
                  { d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', fn: undefined },
                  { d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', fn: undefined },
                  { d: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1', fn: undefined },
                  { d: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z', fn: undefined },
                  { d: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', fn: () => wizardFileRef.current?.click() },
                  { d: 'M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', fn: () => wizardFileRef.current?.click() },
                ]
                return (
                  <div className="flex gap-5 items-start">
                    {/* Left: Editor de mensagens */}
                    <div className="w-80 flex-shrink-0 rounded-xl overflow-hidden border border-border">
                      <div className="flex items-center justify-between px-3 py-2.5" style={{ background: '#202c33' }}>
                        <span className="text-xs font-medium text-secondary">Editor de mensagens</span>
                        <button
                          type="button"
                          onClick={() => { setWizardContent(prev => ({ ...prev, mensagem: '', imageFile: undefined, blocos: [] })); setImagePreview(null) }}
                          title="Limpar tudo"
                          className="text-muted hover:text-foreground transition-colors"
                        >
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                        <input ref={wizardFileRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setWizardContent(prev => ({ ...prev, imageFile: f })); setImagePreview(URL.createObjectURL(f)) } }} />
                      </div>
                      {/* Chat preview body */}
                      <div className="min-h-56 flex flex-col justify-end gap-1.5 p-3 overflow-y-auto max-h-80" style={{ background: '#111b21', backgroundImage: 'url(/wa-bg.svg)', backgroundSize: '480px 480px' }}>
                        {blocos.length === 0 && !msg && !imagePreview ? (
                          <div className="text-center py-4">
                            <p className="text-[10px]" style={{ color: '#8696a0' }}>Digite uma mensagem para ver o preview</p>
                          </div>
                        ) : (
                          <>
                            {blocos.map((b, i) => (
                              <div
                                key={i}
                                className="self-end max-w-[85%] rounded-xl rounded-tr-sm px-2.5 pt-2 pb-1.5 group relative cursor-pointer"
                                style={{ background: '#005c4b' }}
                                onClick={() => {
                                  setWizardContent(prev => ({
                                    ...prev,
                                    mensagem: b.mensagem,
                                    imageFile: b.imageFile,
                                    blocos: ((prev as { blocos?: Array<{ mensagem: string; imageFile?: File; imagePreview?: string }> }).blocos ?? []).filter((_, idx) => idx !== i),
                                  }))
                                  setImagePreview(b.imagePreview ?? null)
                                }}
                              >
                                {b.imagePreview && (b.imageFile?.type.startsWith('video/') ? <video src={b.imagePreview} className="rounded-lg mb-1.5 w-full max-h-24" controls /> : <img src={b.imagePreview} alt="" className="rounded-lg mb-1.5 w-full object-cover max-h-24" />)}
                                {b.mensagem && <p className="text-white text-[11px] leading-[1.4] whitespace-pre-wrap break-words">{b.mensagem}</p>}
                                {mentionAll && <p className="text-[10px] mt-0.5" style={{ color: '#53bdeb' }}>@todos</p>}
                                <div className="flex items-center justify-end gap-1 mt-1">
                                  <span className="text-[9px]" style={{ color: '#8696a0' }}>{timeStr}</span>
                                  <svg width="14" height="8" viewBox="0 0 16 11" fill="none"><path d="M11 1L5.5 6.5L3 4" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 1L9.5 6.5L7 4" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </div>
                                <div className="absolute -top-1.5 -right-1.5 hidden group-hover:flex gap-0.5">
                                  <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); setWizardContent(prev => ({ ...prev, blocos: ((prev as { blocos?: unknown[] }).blocos ?? []).filter((_, idx) => idx !== i) })) }}
                                    className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-bold"
                                  >×</button>
                                </div>
                              </div>
                            ))}
                            {(msg || imagePreview) && (
                              <div className="self-end max-w-[85%] rounded-xl rounded-tr-sm px-2.5 pt-2 pb-1.5" style={{ background: '#005c4b' }}>
                                {imagePreview && ((wizardContent as { imageFile?: File }).imageFile?.type.startsWith('video/') ? <video src={imagePreview} className="rounded-lg mb-1.5 w-full max-h-24" controls /> : <img src={imagePreview} alt="" className="rounded-lg mb-1.5 w-full object-cover max-h-24" />)}
                                {msg && <p className="text-white text-[11px] leading-[1.4] whitespace-pre-wrap break-words">{msg}</p>}
                                {mentionAll && <p className="text-[10px] mt-0.5" style={{ color: '#53bdeb' }}>@todos</p>}
                                <div className="flex items-center justify-end gap-1 mt-1">
                                  <span className="text-[9px]" style={{ color: '#8696a0' }}>{timeStr}</span>
                                  <svg width="14" height="8" viewBox="0 0 16 11" fill="none"><path d="M11 1L5.5 6.5L3 4" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 1L9.5 6.5L7 4" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {/* Icon bar */}
                      <div className="px-3 py-2.5 flex flex-wrap gap-2" style={{ background: '#202c33' }}>
                        {iconPaths.map((ic, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={ic.fn}
                            className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                            style={{ background: '#f5c518' }}
                          >
                            <svg width="13" height="13" fill="none" stroke="#000" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d={ic.d} />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Center: Textarea */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="flex justify-end">
                        <button type="button" onClick={() => wizardFileRef.current?.click()} className="text-xs text-accent hover:text-accent/80 font-medium transition-colors">
                          + Adicionar preview
                        </button>
                      </div>
                      <textarea
                        placeholder="Escreva a sua mensagem"
                        value={msg}
                        onChange={e => setWizardContent(prev => ({ ...prev, mensagem: e.target.value }))}
                        className="w-full bg-transparent border-2 border-accent rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted resize-none outline-none min-h-[230px]"
                      />
                      <div className="flex items-center justify-between px-1">
                        <button type="button" className="text-muted hover:text-foreground transition-colors p-1">
                          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                        <div className="flex items-center gap-2">
                          <button type="button" className="flex items-center gap-1.5 text-xs font-bold text-black px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80" style={{ background: '#f5c518' }}>
                            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                            MODELOS
                          </button>
                          <button
                            type="button"
                            onClick={handleSalvarBloco}
                            disabled={!msg.trim() && !imagePreview}
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-85 disabled:opacity-30 flex-shrink-0"
                            style={{ background: '#00a884' }}
                            title="Salvar como bloco e adicionar outro"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="white"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right: Options — collapsed accordion rows */}
                    <div className="w-56 flex-shrink-0 flex flex-col border border-border rounded-xl overflow-hidden">
                      {/* Marcar todos os participantes */}
                      <div
                        className="flex items-center gap-2.5 px-4 py-3.5 cursor-pointer hover:bg-surface-2 transition-colors border-b border-border"
                        onClick={() => setWizardContent(prev => ({ ...prev, mentionAll: !mentionAll }))}
                      >
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="flex-shrink-0 text-accent"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        <span className="text-sm text-secondary flex-1 leading-tight">Marcar todos os participantes</span>
                        {mentionAll && <svg width="12" height="12" fill="none" stroke="#f5c518" strokeWidth="2.5" viewBox="0 0 24 24" className="flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>

                      {/* Mensagens temporárias */}
                      <div
                        className="flex items-center gap-2.5 px-4 py-3.5 cursor-pointer hover:bg-surface-2 transition-colors border-b border-border"
                        onClick={() => setWizardContent(prev => ({ ...prev, tempMessages: !tempMessages }))}
                      >
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="flex-shrink-0 text-accent"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        <span className="text-sm text-secondary flex-1 leading-tight">Mensagens temporárias</span>
                        <span className="text-xs text-muted flex-shrink-0">{tempMessages ? 'on' : 'off'}</span>
                      </div>

                      {/* Velocidade de envio */}
                      <div className="px-4 py-3.5 border-b border-border">
                        <div className="flex items-center gap-2.5 mb-2.5">
                          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="flex-shrink-0 text-accent"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                          <span className="text-sm text-secondary flex-1">Velocidade de envio</span>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-semibold text-foreground leading-none">{selectedOpt.desc}</p>
                            <p className="text-[10px] text-muted leading-none mt-0.5">{selectedOpt.label}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          {intervalOpts.map(opt => {
                            const sel = curMin === opt.min
                            return (
                              <button
                                key={opt.label}
                                type="button"
                                onClick={() => setWizardContent(prev => ({ ...prev, intervaloMin: opt.min, intervaloMax: opt.max }))}
                                className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${sel ? 'bg-accent text-black border-accent' : 'bg-surface-2 border-border text-muted hover:text-foreground hover:border-border-2'}`}
                              >
                                <span>{opt.desc}</span>
                                <span className={sel ? 'opacity-70' : 'opacity-50'}>{opt.label}</span>
                              </button>
                            )
                          })}
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
                    <p className="text-sm font-medium text-foreground mb-1">
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
          {wizardStep === 'confirmar' && !wizardResult && (() => {
            const msg = (wizardContent as { mensagem?: string }).mensagem ?? ''
            const mentionAll = (wizardContent as { mentionAll?: boolean }).mentionAll ?? false
            const agendadoPara = (wizardContent as { agendadoPara?: string }).agendadoPara ?? ''
            const curMin = (wizardContent as { intervaloMin?: number }).intervaloMin ?? 40
            const intervalOpts = [
              { label: '10–20s', min: 10, max: 20, desc: 'Rápido' },
              { label: '40–60s', min: 40, max: 60, desc: 'Padrão' },
              { label: '60–120s', min: 60, max: 120, desc: 'Seguro' },
            ] as const
            const selectedOpt = intervalOpts.find(o => o.min === curMin) ?? intervalOpts[1]
            const now = new Date()
            const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            return (
              <div>
                <div className="flex gap-5">
                  {/* Left: Summary */}
                  <div className="flex-1 min-w-0 space-y-4">
                    {/* Campanhas */}
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wider mb-2">Campanhas</p>
                      <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-accent/20 border border-accent/20 flex items-center justify-center">
                          {campanha.foto_url
                            ? <img src={campanha.foto_url} alt="" className="w-full h-full object-cover" />
                            : <span className="text-accent font-bold text-xs">{campanha.nome.slice(0,2).toUpperCase()}</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{campanha.nome}</p>
                          {campanha.descricao && <p className="text-xs text-muted truncate">{campanha.descricao}</p>}
                        </div>
                      </div>
                    </div>
                    {/* Contas */}
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wider mb-2">Contas</p>
                      <div className="space-y-2">
                        {wizardAccounts.map(acc => (
                          <div key={acc} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-surface-2 border border-border flex items-center justify-center">
                              {instPics[acc]
                                ? <img src={instPics[acc]!} alt="" className="w-full h-full object-cover" />
                                : <span className="text-foreground font-bold text-xs">{acc.slice(0,2).toUpperCase()}</span>
                              }
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{acc}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                                <span className="text-xs text-muted">Conectado</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Grupos da campanha */}
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wider mb-2">Grupos da campanha</p>
                      <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-accent/20 border border-accent/20 flex items-center justify-center">
                          {campanha.foto_url
                            ? <img src={campanha.foto_url} alt="" className="w-full h-full object-cover" />
                            : <span className="text-accent font-bold text-xs">{campanha.nome.slice(0,2).toUpperCase()}</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{campanha.nome}</p>
                          <p className="text-xs text-muted">
                            {wizardGroupsMode === 'todos'
                              ? `Todos os grupos (${campanha.campanha_grupos.length})`
                              : `${wizardGroupIds.length} grupos selecionados`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Action + Content + Options */}
                  <div className="w-80 flex-shrink-0 space-y-3">
                    {/* Ação header */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-muted uppercase tracking-wider">Ação</p>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setWizardStep('acao')} className="text-muted hover:text-foreground transition-colors" title="Alterar ação">
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          </button>
                          {wizardAction === 'enviar-mensagem' && (
                            <button
                              type="button"
                              onClick={() => setWizardAgendarMode(m => !m)}
                              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${wizardAgendarMode ? 'bg-accent text-black border-accent' : 'border-border text-muted hover:text-foreground hover:border-border-2'}`}
                            >
                              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              AGENDAR
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-2">
                        <svg width="14" height="14" fill="none" stroke="#f5c518" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        <span className="text-sm text-foreground">{ACTIONS.find(a => a.key === wizardAction)?.label}</span>
                      </div>
                    </div>

                    {/* Conteúdo preview (only for enviar-mensagem) */}
                    {wizardAction === 'enviar-mensagem' && (() => {
                      const confirmarBlocos = (wizardContent as { blocos?: Array<{ mensagem: string; imagePreview?: string }> }).blocos ?? []
                      const allMsgs = confirmarBlocos.length > 0
                        ? (msg.trim() ? [...confirmarBlocos, { mensagem: msg }] : confirmarBlocos)
                        : [{ mensagem: msg }]
                      return (
                      <div>
                        <p className="text-xs text-muted uppercase tracking-wider mb-2">
                          Conteúdo {allMsgs.length > 1 && <span className="normal-case font-normal">({allMsgs.length} blocos)</span>}
                        </p>
                        <div className="border border-border rounded-xl overflow-hidden">
                          <div className="px-3 py-3 flex flex-col gap-2" style={{ background: '#0b141a' }}>
                            {allMsgs.length === 0 || (allMsgs.length === 1 && !allMsgs[0].mensagem) ? (
                              <p className="text-[10px] text-center py-4" style={{ color: '#8696a0' }}>Sem mensagem</p>
                            ) : allMsgs.map((b, i) => b.mensagem ? (
                              <div key={i} className="self-end max-w-[85%] rounded-xl rounded-tr-sm px-2.5 pt-2 pb-1.5" style={{ background: '#005c4b' }}>
                                {allMsgs.length > 1 && <span className="text-[9px] font-bold" style={{ color: '#f5c518' }}>#{i + 1}</span>}
                                <p className="text-white text-[11px] leading-[1.4] whitespace-pre-wrap break-words">{b.mensagem}</p>
                                {mentionAll && <p className="text-[10px] mt-0.5" style={{ color: '#53bdeb' }}>@todos</p>}
                                <div className="flex items-center justify-end gap-1 mt-1">
                                  <span className="text-[9px]" style={{ color: '#8696a0' }}>{timeStr}</span>
                                  <svg width="14" height="8" viewBox="0 0 16 11" fill="none"><path d="M11 1L5.5 6.5L3 4" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 1L9.5 6.5L7 4" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </div>
                              </div>
                            ) : null)}
                          </div>
                          {/* Options */}
                          <div className="divide-y divide-border">
                            <div className="flex items-center justify-between px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <svg width="10" height="10" fill="none" stroke="#71717a" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                <span className="text-xs text-secondary">Marcar todos os participantes</span>
                              </div>
                              <span className="text-xs text-muted">{mentionAll ? 'Sim' : 'Não'}</span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <svg width="10" height="10" fill="none" stroke="#71717a" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                <span className="text-xs text-secondary">Velocidade de envio</span>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted leading-none">{selectedOpt.desc}</p>
                                <p className="text-xs text-muted leading-none mt-0.5">{selectedOpt.label}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                    })()}

                    {/* Schedule datetime (shown when AGENDAR mode is on) */}
                    {wizardAction === 'enviar-mensagem' && wizardAgendarMode && (
                      <div>
                        <label className="block text-xs text-muted uppercase tracking-wider mb-2">Agendar para <span className="normal-case">(BRT — UTC-3)</span></label>
                        <input
                          type="datetime-local"
                          value={agendadoPara}
                          onChange={e => setWizardContent(prev => ({ ...prev, agendadoPara: e.target.value }))}
                          className="input w-full"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom send button */}
                {wizardRunning && (
                  <div className="flex items-center gap-2 text-muted text-sm mt-4">
                    <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
                    {wizardAgendarMode ? 'Agendando...' : 'Enviando...'}
                  </div>
                )}
                {wizardAction === 'enviar-mensagem' ? (
                  <button
                    onClick={() => handleWizardExecute(!wizardAgendarMode)}
                    disabled={wizardRunning || (wizardAgendarMode && !agendadoPara)}
                    className="w-full mt-5 py-3.5 rounded-xl font-bold text-sm tracking-widest transition-colors disabled:opacity-40"
                    style={{ background: '#f5c518', color: '#000' }}
                  >
                    {wizardRunning ? '...' : wizardAgendarMode ? 'AGENDAR' : 'ENVIAR AGORA'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleWizardExecute()}
                    disabled={wizardRunning}
                    className="w-full mt-5 py-3.5 rounded-xl font-bold text-sm tracking-widest transition-colors disabled:opacity-40"
                    style={{ background: '#f5c518', color: '#000' }}
                  >
                    {wizardRunning ? '...' : 'EXECUTAR'}
                  </button>
                )}
              </div>
            )
          })()}

          {/* Wizard Navigation */}
          {!wizardResult && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <button
                onClick={prevStep}
                disabled={wizardStepIndex === 0}
                className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                      : 'bg-surface-2 border-border text-muted hover:text-foreground'
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
                          : 'bg-surface-2 border-border text-muted hover:text-foreground'
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
                  className="flex-1 bg-transparent text-sm text-foreground placeholder-muted focus:outline-none"
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
                        onChange={() => {
                          if (g.isCommunity) {
                            // Select/deselect community + all its sub-groups
                            const subGroups = allFlatGroups.filter(ag => ag.group.linkedParent === g.id && ag.instancia === instancia)
                            if (isSelected) {
                              setSelectedGroups(prev => prev.filter(sg => !(sg.id === g.id && sg.instancia === instancia) && !subGroups.some(sub => sub.group.id === sg.id && sub.instancia === sg.instancia)))
                            } else {
                              const toAdd = [{ id: g.id, instancia }, ...subGroups.filter(sub => !campanha.campanha_grupos.some(cg => cg.group_id === sub.group.id)).map(sub => ({ id: sub.group.id, instancia: sub.instancia }))]
                              setSelectedGroups(prev => [...prev.filter(sg => !toAdd.some(a => a.id === sg.id && a.instancia === sg.instancia)), ...toAdd])
                            }
                          } else {
                            setSelectedGroups(prev =>
                              isSelected
                                ? prev.filter(sg => !(sg.id === g.id && sg.instancia === instancia))
                                : [...prev, { id: g.id, instancia }]
                            )
                          }
                        }}
                        className="accent-accent w-4 h-4 flex-shrink-0"
                      />
                      <GroupAvatar pic={null} name={g.subject} size={7} isCommunity={!!g.isCommunity} />
                      <span className="text-sm text-foreground flex-1 truncate">{g.subject}</span>
                      {g.isCommunity && <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded flex-shrink-0">Comunidade</span>}
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
                className="text-muted hover:text-foreground transition-colors"
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
                          : 'bg-surface-2 border-border text-muted hover:text-foreground hover:border-border-2'
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
