# GroupShot — Relatório do Projeto

**Data:** 2026-06-05  
**Repositório:** `pedrolabreu/GroupShot` / `kaiopessoa220-byte/Groupshot`  
**Deploy:** Vercel (auto-deploy via `kaiopessoa220-byte/Groupshot` branch `main`)

---

## Visão Geral

Plataforma de disparo em massa via WhatsApp. Permite gerenciar instâncias conectadas, organizar grupos em campanhas e agendar disparos de mensagens (texto + imagem) para múltiplos grupos simultaneamente, com rastreamento de entrega.

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Estilização | Tailwind CSS 3 |
| Roteamento | React Router 7 |
| Backend | Supabase Edge Functions (Deno) |
| Banco de Dados | Supabase PostgreSQL |
| Storage | Supabase Storage (bucket `sendflow`) |
| Autenticação | Supabase Auth (JWT) |
| WhatsApp | Evolution API 2.3.7 |
| Automação | n8n (workflow de disparo) |

---

## Estrutura de Arquivos

### Frontend (`src/`)

| Arquivo | Descrição |
|---|---|
| `App.tsx` | Roteador principal — rotas autenticadas vs. login |
| `contexts/AuthContext.tsx` | Gerenciamento de sessão, login/logout |
| `lib/supabase.ts` | Inicialização do cliente Supabase |
| `lib/api.ts` | Todas as chamadas HTTP para a edge function + tipos TypeScript |
| `pages/Login.tsx` | Tela de login (email + senha) |
| `pages/VisaoGeral.tsx` | Dashboard — instâncias, campanhas, estatísticas |
| `pages/Campanhas.tsx` | Listagem, criação e exclusão de campanhas |
| `pages/CampanhaDetalhe.tsx` | Detalhe da campanha — grupos, ações em lote, wizard de disparo |
| `pages/NovoDisparo.tsx` | Disparo avulso (fora de campanha) |
| `pages/Historico.tsx` | Histórico de todos os disparos com status e progresso |
| `pages/Contas.tsx` | Gerenciamento de instâncias WhatsApp + QR Code |
| `components/Sidebar.tsx` | Menu lateral de navegação |
| `components/StatusBadge.tsx` | Badge visual de status (pendente / enviado / falhou) |

### Backend (`supabase/functions/groupshot-api/`)

Única edge function em Deno que expõe todas as rotas da API.

---

## Banco de Dados — Tabelas Principais

| Tabela | Descrição | Colunas Relevantes |
|---|---|---|
| `campanhas` | Campanhas de disparo | `id`, `nome`, `descricao`, `instancias[]`, `foto_url`, `criado_em` |
| `campanha_grupos` | Grupos vinculados às campanhas | `id`, `campanha_id`, `group_id`, `group_name`, `instancia` |
| `disparos` | Registros de disparo | `id`, `nome`, `mensagem`, `image_url`, `mention_all`, `agendado_para`, `status`, `total_grupos` |
| `disparo_itens` | Itens individuais por grupo | `id`, `disparo_id`, `group_id`, `instancia`, `send_at`, `status`, `enviado_em`, `erro` |

---

## Variáveis de Ambiente (Edge Function)

| Variável | Uso |
|---|---|
| `EVOLUTION_API_URL` | URL base da Evolution API |
| `EVOLUTION_API_KEY` | Chave de autenticação da Evolution API |
| `N8N_DISPATCHER_URL` | Webhook do n8n para disparo |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de admin para acesso ao banco |

---

## Rotas da API (Edge Function)

### Instâncias
- `GET /instances` — listar todas as instâncias com status
- `POST /instance/create` — criar instância
- `DELETE /instance/:name` — deletar instância
- `GET /instance/qrcode/:name` — obter QR code

### Grupos
- `GET /groups?instance=X` — listar grupos de uma instância
- `POST /group/create-batch` — criar grupos em lote
- `POST /group/action-batch` — ações em lote (renomear, trocar foto, abrir/fechar, etc.)

### Campanhas
- `GET /campanhas` — listar campanhas
- `POST /campanhas` — criar campanha
- `GET /campanhas/:id` — detalhe da campanha
- `PATCH /campanhas/:id` — atualizar campanha
- `DELETE /campanhas/:id` — deletar campanha
- `GET /campanhas/:id/stats` — estatísticas (participantes, grupos cheios/disponíveis)
- `GET /campanhas/:id/atividades` — histórico de disparos da campanha
- `POST /campanhas/:id/disparar` — criar disparo (suporta múltiplos blocos de mensagem)
- `POST /campanhas/:id/grupos` — adicionar grupos
- `DELETE /campanha-grupos/:id` — remover grupo

### Disparos
- `POST /dispatch` — criar e agendar disparo
- `GET /history` — histórico geral

### Dashboard
- `GET /visao-geral` — estatísticas gerais

---

## Integrações Externas

### Evolution API 2.3.7
- Gerencia instâncias WhatsApp
- Envio de mensagens de texto e imagem
- Listagem de grupos e participantes
- **Quirk importante:** `mentioned` array deve ter ≥1 item se fornecido; `mentionsEveryOne` só deve ser enviado quando `true`

### n8n (Workflow `kAklrpEA5t62UKgV`)
- URL: `https://n8n.nuvantperformance.com.br/workflow/kAklrpEA5t62UKgV`
- Webhook: `/webhook/disparar-grupo`
- Recebe: `{ groupId, instancia, sendAt, message, imageUrl, imageMimetype, mentionAll, disparoItemId }`
- Fluxo: Normalizar → aguardar `sendAt` → enviar texto ou imagem via Evolution API → atualizar status no Supabase
- **Obs:** Credenciais da Evolution API precisam ser re-atribuídas manualmente nos nós "Enviar Texto" e "Enviar Imagem" após atualizações via MCP

---

## Wizard de Disparo (CampanhaDetalhe — Ações)

Fluxo em 5 etapas:

1. **Ação** — selecionar tipo (Disparo, Renomear, Trocar Foto, etc.)
2. **Contas** — selecionar instâncias
3. **Grupos** — selecionar grupos da campanha
4. **Conteúdo** — compor mensagem (layout 3 painéis):
   - Esquerda: preview estilo WhatsApp com background doodle
   - Centro: textarea com borda accent + botão enviar verde circular
   - Direita: opções (mencionar todos, mensagens temporárias, velocidade de envio)
5. **Confirmar** — resumo e execução

### Suporte a múltiplos blocos
- Botão "salvar" (círculo verde / paper plane) salva bloco atual e limpa textarea para nova mensagem
- Todos os blocos são enviados sequencialmente, com intervalo configurável:
  - Rápido: 10–20s
  - Padrão: 40–60s
  - Seguro: 60–120s

---

## Histórico de Mudanças Relevantes

| Commit | Descrição |
|---|---|
| `aea3e22` | Background do preview: SVG com padrão doodle estilo WhatsApp |
| `9f21615` | Botão SALVAR: círculo verde (#00a884) com ícone paper plane |
| `7b858f6` | Layout Conteúdo: 3 painéis idênticos ao SendFlow |
| `b7927a5` | Widening da página: `max-w-3xl` → `max-w-7xl` |
| `7871f18` | Fix `imageMimetype` com `??` em vez de `||` |
| `ec34559` | Suporte a comunidades: flag `isCommunity`, badge megafone |
| `2da34db` | Fix disparo multi-bloco: único registro com itens por mensagem |
| `199d117` | Preview dos blocos salvos com double checkmarks azuis |
| `c8f96f6` | Redesign Conteúdo: ícones circulares amarelos, textarea accent |
| `d32378a` | `vercel.json` para corrigir 404 no reload de página |
| `15763b1` | Fix nomes de instância com espaços em URLs da Evolution API |

---

## Supabase

- **Project ID:** `loaazqaucclypxffhpka`
- **Edge Function:** `groupshot-api` (deploy manual via CLI)
- **Storage Bucket:** `sendflow` (imagens dos disparos)

---

## Observações / Pendências

- [ ] Credenciais Evolution API nos nós do n8n precisam ser re-atribuídas manualmente após atualizações via MCP
- [ ] Testar fluxo completo de disparo após Evolution API voltar online
- [ ] O SVG `public/wa-bg.svg` é uma aproximação do padrão real do WhatsApp (CDN original bloqueado)
- [ ] Frontend hardcodeia anon key + URL do Supabase em `src/lib/supabase.ts` (comportamento esperado para auth client-side)
