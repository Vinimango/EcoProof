<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { api, apiFormData } from '../utils/api'
import { formatDate, formatTipoAcao, formatPoints, truncateHash } from '../utils/format'
import { useToast } from '../composables/useToast'
import StatusBadge from '../components/StatusBadge.vue'
import NFTCard from '../components/NFTCard.vue'
import ImageUpload from '../components/ImageUpload.vue'

// Blockchain stats
const chainStats = ref(null)

const auth = useAuthStore()
const toast = useToast()
const router = useRouter()

// ── Estado ─────────────────────────────────────────────────────────────────
const limpezas    = ref([])
const nfts        = ref([])
const participacoes = ref([])
const loadingLimpezas  = ref(true)
const loadingNFTs      = ref(true)
const loadingPartic    = ref(true)

// Wallet
const editingWallet  = ref(false)
const walletDraft    = ref('')
const savingWallet   = ref(false)

// Envio de foto de participação
const fotoModal      = ref(null)   // participação selecionada
const fotoFile       = ref(null)
const enviandoFoto   = ref(false)

const META = 500

// ── Computed ────────────────────────────────────────────────────────────────
// A API retorna total_points no perfil do cidadão
const pontos    = computed(() => auth.user?.total_points ?? 0)
const progresso = computed(() => Math.min(100, (pontos.value / META) * 100))
const pctLabel  = computed(() => `${Math.round(progresso.value)}%`)

// Estatísticas rápidas
const totalAprovadas  = computed(() => limpezas.value.filter(l => l.status === 'aprovado').length)
const totalPendentes  = computed(() => limpezas.value.filter(l => l.status === 'pendente').length)
const totalNFTs       = computed(() => nfts.value.length)

// ── Lifecycle ───────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.allSettled([
    carregarLimpezas(),
    carregarNFTs(),
    carregarParticipacoes(),
    carregarChainStats(),
  ])
})

async function carregarChainStats() {
  try {
    chainStats.value = await api.get('/nfts/stats')
  } catch { chainStats.value = null }
}

// ── Funções de carregamento ─────────────────────────────────────────────────
async function carregarLimpezas() {
  loadingLimpezas.value = true
  try {
    // GET /limpezas/me retorna { items, total, page, ... }
    const res = await api.get('/limpezas/me?page=1&page_size=10')
    limpezas.value = Array.isArray(res) ? res : (res.items ?? [])
  } catch (e) {
    toast.error('Erro ao carregar limpezas: ' + e.message)
  } finally {
    loadingLimpezas.value = false
  }
}

async function carregarNFTs() {
  loadingNFTs.value = true
  try {
    // GET /users/me/nfts retorna array de NFTs
    const res = await api.get('/users/me/nfts')
    nfts.value = Array.isArray(res) ? res : (res.items ?? [])
  } catch (e) {
    toast.error('Erro ao carregar NFTs: ' + e.message)
  } finally {
    loadingNFTs.value = false
  }
}

async function carregarParticipacoes() {
  loadingPartic.value = true
  try {
    // GET /eventos/minhas-participacoes retorna { items, total, ... }
    const res = await api.get('/eventos/minhas-participacoes?page=1&page_size=5')
    participacoes.value = Array.isArray(res) ? res : (res.items ?? [])
  } catch (e) {
    // Rota pode conflitar com parâmetro de rota UUID no backend (422) — trata silenciosamente
    participacoes.value = []
  } finally {
    loadingPartic.value = false
  }
}

// ── Wallet ──────────────────────────────────────────────────────────────────
function startEdit() {
  walletDraft.value = auth.user?.wallet_address || ''
  editingWallet.value = true
}

async function saveWallet() {
  if (!walletDraft.value.trim()) { toast.warn('Informe um endereço de wallet.'); return }
  savingWallet.value = true
  try {
    // PATCH /users/me usa query params: ?wallet_address=0x...
    await auth.updateWallet(walletDraft.value.trim())
    toast.success('Wallet atualizada com sucesso!')
    editingWallet.value = false
  } catch (e) {
    toast.error(e.message)
  } finally {
    savingWallet.value = false
  }
}


function abrirEnvioFoto(participacao) {
  fotoModal.value = participacao
  fotoFile.value  = null
}

async function enviarFotoParticipacao() {
  if (!fotoFile.value || !fotoModal.value) return
  enviandoFoto.value = true
  try {
    const fd = new FormData()
    fd.append('foto', fotoFile.value)
    await apiFormData(
      `/eventos/${fotoModal.value.evento_id}/participacoes/${fotoModal.value.id}/foto`,
      fd
    )
    toast.success('Foto enviada com sucesso! Aguarde a aprovação do instituto.')
    fotoModal.value = null
    fotoFile.value  = null
    await carregarParticipacoes()
  } catch (e) {
    toast.error('Erro ao enviar foto: ' + e.message)
  } finally {
    enviandoFoto.value = false
  }
}

function verNFT(nft) {
  router.push(`/nft/${nft.token_id}`)
}
</script>

<template>
  <div class="container dashboard">

    <!-- ── Cabeçalho ──────────────────────────────────────────────────────── -->
    <header class="dash-head">
      <div>
        <h1>Olá, {{ auth.user?.name || '…' }} 🌿</h1>
        <p class="muted">Seu impacto ambiental, registrado em blockchain.</p>
      </div>
      <RouterLink id="btn-registrar-limpeza" to="/app/registrar-limpeza" class="btn btn-primary">
        + Registrar limpeza
      </RouterLink>
    </header>

    <!-- ── Cards de Estatísticas ─────────────────────────────────────────── -->
    <div class="stats-grid">
      <div class="stat-card stat-pontos">
        <div class="stat-icon">🏆</div>
        <div class="stat-value">{{ formatPoints(pontos) }}</div>
        <div class="stat-label">Pontos totais</div>
      </div>
      <div class="stat-card stat-limpezas">
        <div class="stat-icon">✅</div>
        <div class="stat-value">{{ totalAprovadas }}</div>
        <div class="stat-label">Limpezas aprovadas</div>
      </div>
      <div class="stat-card stat-nfts">
        <div class="stat-icon">🎖️</div>
        <div class="stat-value">{{ totalNFTs }}</div>
        <div class="stat-label">NFTs conquistados</div>
      </div>
      <div class="stat-card stat-pendentes">
        <div class="stat-icon">⏳</div>
        <div class="stat-value">{{ totalPendentes }}</div>
        <div class="stat-label">Pendentes de validação</div>
      </div>
    </div>

    <!-- ── Pontos + Wallet ────────────────────────────────────────────────── -->
    <div class="grid two">

      <!-- Pontos IPTU Verde -->
      <div class="card">
        <h3>Pontos rumo ao IPTU Verde</h3>
        <div class="points-row">
          <span class="points">{{ formatPoints(pontos) }}</span>
          <span class="muted points-meta">/ {{ META }}</span>
          <span class="pct-badge">{{ pctLabel }}</span>
        </div>
        <div class="bar" role="progressbar" :aria-valuenow="pontos" :aria-valuemax="META">
          <div class="bar-fill" :style="{ width: progresso + '%' }"></div>
        </div>
        <p class="muted" style="margin-top:.5rem; font-size:.88rem">
          {{ pontos >= META
            ? '🎉 Parabéns! Você atingiu a meta para o desconto no IPTU!'
            : `Faltam ${formatPoints(Math.max(0, META - pontos))} pontos para o desconto.` }}
        </p>
      </div>

      <!-- Wallet -->
      <div class="card">
        <h3>Wallet Polygon</h3>
        <template v-if="!editingWallet">
          <p v-if="auth.user?.wallet_address" class="mono wallet-addr">
            {{ truncateHash(auth.user.wallet_address) }}
          </p>
          <p v-else class="muted wallet-empty">
            Nenhuma wallet configurada.<br>
            <small>Vincule sua wallet Polygon para receber NFTs Soulbound on-chain.</small>
          </p>
          <button id="btn-editar-wallet" class="btn btn-ghost" @click="startEdit">
            {{ auth.user?.wallet_address ? 'Editar wallet' : '+ Vincular wallet' }}
          </button>
        </template>
        <template v-else>
          <input
            id="input-wallet"
            class="input"
            v-model="walletDraft"
            placeholder="0x…"
            autocomplete="off"
          />
          <div class="wallet-actions">
            <button
              id="btn-salvar-wallet"
              class="btn btn-primary"
              :disabled="savingWallet"
              @click="saveWallet"
            >
              <span v-if="savingWallet" class="spinner-sm"></span>
              {{ savingWallet ? 'Salvando…' : 'Salvar' }}
            </button>
            <button class="btn btn-ghost" @click="editingWallet = false">Cancelar</button>
          </div>
        </template>
      </div>

    </div>

    <!-- ── Últimas Limpezas ───────────────────────────────────────────────── -->
    <section class="section">
      <div class="section-head">
        <h2>Últimas limpezas</h2>
        <RouterLink to="/app/registrar-limpeza" class="link-sm">+ Nova limpeza</RouterLink>
      </div>

      <!-- Loading -->
      <div v-if="loadingLimpezas" class="skeleton-list">
        <div class="skeleton" v-for="i in 3" :key="i"></div>
      </div>

      <!-- Vazia -->
      <div v-else-if="!limpezas.length" class="empty-card">
        <span class="empty-icon">🗺️</span>
        <div>
          <strong>Nenhuma limpeza registrada ainda.</strong>
          <p>Registre sua primeira ação ambiental e ganhe pontos!</p>
          <RouterLink to="/app/registrar-limpeza" class="btn btn-primary" style="margin-top:.75rem">
            Registrar agora
          </RouterLink>
        </div>
      </div>

      <!-- Lista -->
      <ul v-else class="limpeza-list">
        <li v-for="l in limpezas.slice(0, 5)" :key="l.id" class="limpeza-item">
          <div class="limpeza-img" v-if="l.foto_depois_url">
            <img :src="l.foto_depois_url" :alt="formatTipoAcao(l.tipo_acao)" />
          </div>
          <div class="limpeza-img limpeza-img-placeholder" v-else>🌿</div>
          <div class="limpeza-info">
            <strong>{{ formatTipoAcao(l.tipo_acao) }}</strong>
            <span class="muted">{{ formatDate(l.created_at) }}</span>
          </div>
          <StatusBadge :status="l.status" />
        </li>
      </ul>
    </section>

    <!-- ── Meus NFTs ──────────────────────────────────────────────────────── -->
    <!-- ── Blockchain Stats ────────────────────────────────────────────── -->
    <div v-if="chainStats" class="chain-stats-bar">
      <div class="chain-stat">
        <span class="chain-stat-icon">⛓️</span>
        <div>
          <div class="chain-stat-value">{{ chainStats.total_nfts_onchain }}</div>
          <div class="chain-stat-label">NFTs on-chain</div>
        </div>
      </div>
      <div class="chain-stat">
        <span class="chain-stat-icon">🔐</span>
        <div>
          <div class="chain-stat-value">{{ chainStats.total_proofs_onchain }}</div>
          <div class="chain-stat-label">Provas registradas</div>
        </div>
      </div>
      <div class="chain-stat">
        <span class="chain-stat-icon">{{ chainStats.blockchain_enabled ? '🟢' : '🟡' }}</span>
        <div>
          <div class="chain-stat-value">{{ chainStats.blockchain_enabled ? 'Ativo' : 'Simulado' }}</div>
          <div class="chain-stat-label">Modo blockchain</div>
        </div>
      </div>
    </div>

    <section class="section">
      <div class="section-head">
        <h2>Meus NFTs <span class="soulbound-label">🔒 Soulbound</span></h2>
        <RouterLink to="/app/carteira" class="link-sm">Ver todos →</RouterLink>
      </div>

      <!-- Loading -->
      <div v-if="loadingNFTs" class="nft-grid">
        <div class="skeleton nft-skeleton" v-for="i in 3" :key="i"></div>
      </div>

      <!-- Vazia -->
      <div v-else-if="!nfts.length" class="empty-card">
        <span class="empty-icon">🎖️</span>
        <div>
          <strong>Nenhum NFT ainda.</strong>
          <p>Registre limpezas aprovadas para conquistar seus primeiros NFTs.</p>
        </div>
      </div>

      <!-- Grid de NFTs -->
      <div v-else class="nft-grid">
        <NFTCard
          v-for="nft in nfts.slice(0, 6)"
          :key="nft.id"
          :nft="nft"
          @click="verNFT(nft)"
        />
      </div>
    </section>

    <!-- ── Participações em Eventos ────────────────────────────────────────── -->
    <section class="section">
      <div class="section-head">
        <h2>Participações em eventos</h2>
        <RouterLink to="/app/eventos" class="link-sm">Ver eventos →</RouterLink>
      </div>

      <div v-if="loadingPartic" class="skeleton-list">
        <div class="skeleton" v-for="i in 2" :key="i"></div>
      </div>

      <div v-else-if="!participacoes.length" class="empty-card">
        <span class="empty-icon">📅</span>
        <div>
          <strong>Você ainda não participou de nenhum evento.</strong>
          <p>Encontre mutirões de limpeza perto de você.</p>
          <RouterLink to="/app/eventos" class="btn btn-ghost" style="margin-top:.75rem">
            Ver eventos
          </RouterLink>
        </div>
      </div>

      <ul v-else class="limpeza-list">
        <li v-for="p in participacoes" :key="p.id" class="limpeza-item partic-item">

          <!-- Ícone / thumb -->
          <div class="limpeza-img limpeza-img-placeholder" v-if="!p.foto_url">📅</div>
          <img v-else :src="p.foto_url" class="limpeza-img partic-foto" alt="Foto enviada" />

          <!-- Informações -->
          <div class="limpeza-info">
            <strong>{{ p.evento_titulo || 'Evento' }}</strong>
            <span class="muted">{{ formatDate(p.checkin_at) }}</span>
            <span v-if="p.status === 'confirmado'" class="hint-foto">
              📸 Envie a foto para avançar
            </span>
            <span v-else-if="p.status === 'foto_enviada'" class="hint-foto hint-aguardando">
              ⏳ Foto enviada — aguardando aprovação
            </span>
          </div>

          <!-- Status + Botão -->
          <div class="partic-right">
            <StatusBadge :status="p.status" />
            <button
              v-if="p.status === 'confirmado'"
              class="btn btn-sm-accent"
              @click="abrirEnvioFoto(p)"
            >
              📸 Enviar foto
            </button>
          </div>
        </li>
      </ul>
    </section>

    <!-- ── Modal: Envio de foto de participação ──────────────────────────── -->
    <Teleport to="body">
      <div v-if="fotoModal" class="backdrop" @click.self="fotoModal = null">
        <div class="modal-foto card">
          <div class="modal-foto-header">
            <div>
              <h3>📸 Enviar foto de participação</h3>
              <p class="muted" style="margin:.2rem 0 0;font-size:.9rem">
                {{ fotoModal.evento_titulo || 'Evento' }}
              </p>
            </div>
            <button class="btn-close" @click="fotoModal = null">✕</button>
          </div>

          <div style="margin-bottom: 1rem;">
            <ImageUpload label="Foto da participação" @update:file="fotoFile = $event" />
          </div>

          <div class="modal-foto-footer">
            <button class="btn btn-ghost" @click="fotoModal = null">Cancelar</button>
            <button
              id="btn-enviar-foto-participacao"
              class="btn btn-primary"
              :disabled="!fotoFile || enviandoFoto"
              @click="enviarFotoParticipacao"
            >
              <span v-if="enviandoFoto" class="spinner-sm"></span>
              {{ enviandoFoto ? 'Enviando…' : 'Enviar foto' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
.dashboard { padding-bottom: 3rem; }

/* Cabeçalho */
.dash-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
}
.dash-head h1 { font-size: 1.9rem; margin: 0 0 .25rem; }

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}
@media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .stats-grid { grid-template-columns: 1fr 1fr; } }

.stat-card {
  border-radius: var(--radius-md, 12px);
  padding: 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  gap: .3rem;
  border: 1px solid transparent;
}
.stat-icon  { font-size: 1.5rem; }
.stat-value { font-size: 1.75rem; font-weight: 800; font-family: var(--font-display, inherit); }
.stat-label { font-size: .8rem; color: var(--color-muted, #64748b); font-weight: 500; }

.stat-pontos   { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
.stat-limpezas { background: #eff6ff; border-color: #bfdbfe; color: #1e40af; }
.stat-nfts     { background: #fdf4ff; border-color: #e9d5ff; color: #6b21a8; }
.stat-pendentes { background: #fffbeb; border-color: #fde68a; color: #92400e; }

/* Grid 2 col */
.two { grid-template-columns: 1fr 1fr; }
@media (max-width: 768px) { .two { grid-template-columns: 1fr; } }

/* Pontos */
.points-row { display: flex; align-items: baseline; gap: .5rem; margin: .5rem 0 .4rem; }
.points { font-family: var(--font-display, inherit); font-size: 2rem; font-weight: 800; color: var(--color-primary, #22c55e); }
.points-meta { font-size: 1.1rem; }
.pct-badge {
  margin-left: auto;
  font-size: .8rem;
  font-weight: 700;
  background: var(--color-primary, #22c55e);
  color: #fff;
  padding: .2rem .6rem;
  border-radius: 999px;
}
.bar { background: #eef3ee; border-radius: 999px; height: 10px; overflow: hidden; }
.bar-fill { height: 100%; background: linear-gradient(90deg, var(--color-tertiary, #4ade80), var(--color-accent, #86efac)); transition: width .6s ease; }

/* Wallet */
.mono { font-family: ui-monospace, monospace; font-size: 1rem; margin: .5rem 0; }
.wallet-addr { font-size: 1.05rem; color: var(--color-text, #1a1a1a); }
.wallet-empty { font-size: .9rem; margin: .5rem 0; }
.wallet-actions { display: flex; gap: .5rem; margin-top: .75rem; }

/* Seções */
.section { margin-top: 2.5rem; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.section-head h2 { font-size: 1.25rem; margin: 0; }
.link-sm { color: var(--color-primary, #22c55e); font-size: .9rem; font-weight: 600; text-decoration: none; }
.link-sm:hover { text-decoration: underline; }

/* Skeleton */
.skeleton-list { display: flex; flex-direction: column; gap: .6rem; }
.skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: var(--radius-sm, 8px); height: 64px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* Empty card */
.empty-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  background: var(--color-surface, #fff);
  border: 1px dashed var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  padding: 1.5rem;
  color: var(--color-muted, #64748b);
}
.empty-icon { font-size: 2rem; flex-shrink: 0; }
.empty-card strong { display: block; color: var(--color-text, #1a1a1a); margin-bottom: .3rem; }
.empty-card p { margin: 0; font-size: .9rem; }

/* Limpeza list */
.limpeza-list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: .6rem; }
.limpeza-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  padding: .75rem 1rem;
  transition: box-shadow .15s;
}
.limpeza-item:hover { box-shadow: var(--shadow-card, 0 2px 8px rgba(0,0,0,.06)); }
.limpeza-img { width: 48px; height: 48px; border-radius: var(--radius-sm, 8px); overflow: hidden; flex-shrink: 0; }
.limpeza-img img { width: 100%; height: 100%; object-fit: cover; }
.limpeza-img-placeholder {
  background: #f0fdf4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}
.limpeza-info { flex: 1; display: flex; flex-direction: column; gap: .15rem; }
.limpeza-info strong { font-size: .95rem; }
.limpeza-info span { font-size: .82rem; }

/* NFT Grid */
.nft-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
@media (max-width: 900px) { .nft-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .nft-grid { grid-template-columns: 1fr; } }
.nft-skeleton { height: 240px; border-radius: var(--radius-md, 12px); }

/* Spinner inline */
.spinner-sm {
  display: inline-block;
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .7s linear infinite;
  margin-right: 4px;
  vertical-align: middle;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Blockchain Stats Bar */
.chain-stats-bar {
  display: flex;
  gap: 1rem;
  margin: 1.5rem 0;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, #1e1b4b, #312e81);
  border-radius: var(--radius-md, 12px);
  color: #fff;
}
.chain-stat {
  display: flex;
  align-items: center;
  gap: .6rem;
  flex: 1;
}
.chain-stat-icon { font-size: 1.4rem; }
.chain-stat-value { font-size: 1.15rem; font-weight: 800; }
.chain-stat-label { font-size: .72rem; opacity: .7; font-weight: 500; }

@media (max-width: 600px) {
  .chain-stats-bar { flex-direction: column; gap: .6rem; }
}

/* Soulbound label */
.soulbound-label {
  font-size: .72rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  padding: .2rem .5rem;
  border-radius: 999px;
  vertical-align: middle;
  margin-left: .4rem;
}

/* ── Participação com foto ──────────────────────────────────────── */
.partic-item { align-items: flex-start; gap: 1rem; }
.partic-foto { width: 52px; height: 52px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
.partic-right { display: flex; flex-direction: column; align-items: flex-end; gap: .4rem; flex-shrink: 0; }
.hint-foto { font-size: .78rem; color: #d97706; font-weight: 600; margin-top: .2rem; display: block; }
.hint-aguardando { color: #6d28d9; }

/* Botão compacto verde */
.btn-sm-accent {
  padding: .38rem .85rem;
  font-size: .82rem;
  font-weight: 700;
  background: var(--color-primary, #22c55e);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: .3rem;
  white-space: nowrap;
  transition: background .15s;
}
.btn-sm-accent:hover { background: #16a34a; }

/* ── Modal de envio de foto ────────────────────────────────────── */
.backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.55);
  display: grid; place-items: center;
  padding: 1rem; z-index: 100;
  backdrop-filter: blur(2px);
}
.modal-foto {
  max-width: 480px; width: 100%;
  animation: fadeUp .25s ease;
}
@keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }

.modal-foto-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 1.25rem;
}
.modal-foto-header h3 { margin: 0; font-size: 1.1rem; }
.btn-close { background:none; border:none; font-size:1.2rem; cursor:pointer; color:var(--color-muted,#64748b); padding:.25rem; }
.btn-close:hover { color: var(--color-text, #1a1a1a); }

/* Área de upload */
.upload-area {
  display: flex; flex-direction: column; align-items: center; gap: .6rem;
  border: 2px dashed var(--color-border, #d1d5db);
  border-radius: 12px;
  padding: 2.5rem 1rem;
  cursor: pointer;
  user-select: none;
  text-align: center;
  transition: border-color .2s, background .2s, transform .15s;
  background: #f9fafb;
}
.upload-area:hover { border-color: var(--color-primary, #22c55e); background: #f0fdf4; }
.drag-ativo { border-color: var(--color-primary, #22c55e) !important; background: #f0fdf4 !important; transform: scale(1.01); }
.upload-icon { font-size: 2.5rem; }

/* Preview da foto selecionada */
.foto-preview { display: flex; flex-direction: column; align-items: center; gap: .75rem; }
.foto-preview img { width: 100%; max-height: 240px; object-fit: cover; border-radius: 10px; }
.btn-remove-foto { background:#fef2f2; color:#dc2626; border:1px solid #fca5a5; border-radius:8px; padding:.35rem .8rem; font-size:.85rem; cursor:pointer; font-weight:600; }
.btn-remove-foto:hover { background: #fee2e2; }

.modal-foto-footer {
  display: flex; justify-content: flex-end; gap: .5rem;
  margin-top: 1.25rem; padding-top: 1rem;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

</style>
