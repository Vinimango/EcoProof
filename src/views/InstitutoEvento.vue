<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../utils/api'
import { formatDate } from '../utils/format'
import StatusBadge from '../components/StatusBadge.vue'
import { useToast } from '../composables/useToast'

const route = useRoute()
const toast = useToast()
const eventoId = route.params.id // UUID do evento

// ── Estado ─────────────────────────────────────────────────────────────────
const evento      = ref(null)
const items       = ref([])
const loading     = ref(true)
const filter      = ref('')
const rejecting   = ref(null)   // participação sendo rejeitada
const motivo      = ref('')
const fotoModal   = ref(null)
const aprovando   = ref(null)   // id da participação sendo aprovada
const emitindo    = ref(false)

// ── Computed ────────────────────────────────────────────────────────────────
const filtered = computed(() =>
  filter.value ? items.value.filter(p => p.status === filter.value) : items.value
)
const pendentes  = computed(() => items.value.filter(p => p.status === 'foto_enviada').length)
const aprovados  = computed(() => items.value.filter(p => p.status === 'aprovado').length)
const total      = computed(() => items.value.length)

// ── Carregamento ────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    // ✅ GET /eventos/{id}/participacoes retorna { items, total, ... }
    const [evRes, partRes] = await Promise.all([
      api.get(`/eventos/${eventoId}`),
      api.get(`/eventos/${eventoId}/participacoes?page=1&page_size=100`),
    ])
    evento.value = evRes
    items.value = Array.isArray(partRes) ? partRes : (partRes.items ?? [])
  } catch (e) {
    toast.error('Erro ao carregar dados: ' + e.message)
  } finally {
    loading.value = false
  }
}

onMounted(load)

// ── Aprovar participação ────────────────────────────────────────────────────
async function aprovar(p) {
  aprovando.value = p.id
  try {
    // ✅ Método correto: PATCH /participacoes/{id}/aprovar (não POST)
    await api.patch(`/participacoes/${p.id}/aprovar`)
    toast.success(`${p.cidadao_nome} aprovado!`)
    await load()
  } catch (e) {
    toast.error(e.message)
  } finally {
    aprovando.value = null
  }
}

// ── Rejeitar participação ───────────────────────────────────────────────────
function abrirRejeicao(p) {
  rejecting.value = p
  motivo.value = ''
}

async function confirmReject() {
  if (motivo.value.trim().length < 10) {
    toast.warn('O motivo precisa ter ao menos 10 caracteres.')
    return
  }
  try {
    // ✅ PATCH /participacoes/{id}/rejeitar com body { motivo_rejeicao } (não "motivo")
    await api.patch(`/participacoes/${rejecting.value.id}/rejeitar`, {
      motivo_rejeicao: motivo.value.trim(),
    })
    toast.success('Participação rejeitada.')
    rejecting.value = null
    motivo.value = ''
    await load()
  } catch (e) {
    toast.error(e.message)
  }
}

// ── Emitir NFTs ────────────────────────────────────────────────────────────
async function emitirNFTs() {
  if (!aprovados.value) { toast.warn('Nenhum participante aprovado para emitir NFT.'); return }
  emitindo.value = true
  try {
    const r = await api.post(`/eventos/${eventoId}/emitir-nfts`)
    toast.success(`${r.total_emitido ?? 0} NFT(s) emitido(s) · ${r.pontos_distribuidos ?? 0} pontos!`)
    await load()
  } catch (e) {
    toast.error(e.message)
  } finally {
    emitindo.value = false
  }
}
</script>

<template>
  <div class="container evento-page">

    <!-- Cabeçalho do evento -->
    <header class="dash-head">
      <div>
        <RouterLink to="/instituto/dashboard" class="back-link">← Voltar ao painel</RouterLink>
        <h1>{{ evento?.titulo || 'Carregando…' }}</h1>
        <p v-if="evento" class="muted">
          📍 {{ evento.local }} &nbsp;·&nbsp;
          📅 {{ formatDate(evento.data_evento) }}
          <StatusBadge :status="evento.status" style="margin-left:.5rem" />
        </p>
      </div>

      <button
        class="btn btn-accent"
        :disabled="emitindo || aprovados === 0"
        :title="aprovados === 0 ? 'Nenhum aprovado ainda' : `Emitir NFTs para ${aprovados} aprovados`"
        @click="emitirNFTs"
      >
        <span v-if="emitindo" class="spinner-sm"></span>
        {{ emitindo ? 'Emitindo…' : `🎖️ Emitir NFTs (${aprovados})` }}
      </button>
    </header>

    <!-- Stats -->
    <div class="stats-row" v-if="!loading">
      <div class="stat-pill">
        <span class="stat-num">{{ total }}</span>
        <span class="stat-lbl">total</span>
      </div>
      <div class="stat-pill stat-pendente">
        <span class="stat-num">{{ pendentes }}</span>
        <span class="stat-lbl">foto enviada</span>
      </div>
      <div class="stat-pill stat-aprovado">
        <span class="stat-num">{{ aprovados }}</span>
        <span class="stat-lbl">aprovados</span>
      </div>
    </div>

    <!-- Filtro -->
    <div class="filter-bar">
      <button
        v-for="opt in [
          { v: '',             l: 'Todos' },
          { v: 'confirmado',   l: 'Confirmado' },
          { v: 'foto_enviada', l: 'Foto enviada' },
          { v: 'aprovado',     l: 'Aprovado' },
          { v: 'rejeitado',    l: 'Rejeitado' },
        ]"
        :key="opt.v"
        :class="['filter-btn', { active: filter === opt.v }]"
        @click="filter = opt.v"
        type="button"
      >
        {{ opt.l }}
        <span v-if="opt.v" class="filter-count">
          {{ items.filter(p => p.status === opt.v).length }}
        </span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="skeleton-list">
      <div class="skeleton" v-for="i in 4" :key="i"></div>
    </div>

    <!-- Sem participações -->
    <div v-else-if="!filtered.length" class="empty-card">
      <span class="empty-icon">👥</span>
      <div>
        <strong>{{ filter ? `Nenhum participante com status "${filter}".` : 'Nenhuma participação ainda.' }}</strong>
        <p v-if="!filter">Compartilhe o evento para que cidadãos possam se inscrever.</p>
      </div>
    </div>

    <!-- Tabela de participantes -->
    <div v-else class="table-wrap card">
      <table class="tbl">
        <thead>
          <tr>
            <th></th>
            <th>Cidadão</th>
            <th>Status</th>
            <th>Check-in</th>
            <th>Foto</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filtered" :key="p.id" :class="{ 'row-pendente': p.status === 'foto_enviada' }">

            <!-- Avatar -->
            <td>
              <div class="avatar">{{ (p.cidadao_nome || '?')[0].toUpperCase() }}</div>
            </td>

            <!-- Nome -->
            <td>
              <strong>{{ p.cidadao_nome || '—' }}</strong>
              <div v-if="p.motivo_rejeicao" class="motivo-text">{{ p.motivo_rejeicao }}</div>
            </td>

            <!-- Status -->
            <td><StatusBadge :status="p.status" /></td>

            <!-- Check-in -->
            <td class="muted">{{ formatDate(p.checkin_at) }}</td>

            <!-- Foto -->
            <td>
              <img
                v-if="p.foto_url"
                :src="p.foto_url"
                class="thumb"
                alt="Foto de participação"
                @click="fotoModal = p.foto_url"
              />
              <span v-else class="muted" style="font-size:.8rem">—</span>
            </td>

            <!-- Ações -->
            <td>
              <div class="action-btns" v-if="p.status === 'foto_enviada'">
                <button
                  class="btn btn-sm btn-success"
                  :disabled="aprovando === p.id"
                  @click="aprovar(p)"
                >
                  <span v-if="aprovando === p.id" class="spinner-sm"></span>
                  {{ aprovando === p.id ? '…' : '✓ Aprovar' }}
                </button>
                <button
                  class="btn btn-sm btn-danger"
                  @click="abrirRejeicao(p)"
                >
                  ✗ Rejeitar
                </button>
              </div>
              <span v-else class="muted" style="font-size:.8rem">—</span>
            </td>

          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Teleports ─────────────────────────────────────────────────────── -->
    <Teleport to="body">

      <!-- Modal: Rejeitar participação -->
      <div v-if="rejecting" class="backdrop" @click.self="rejecting = null">
        <div class="modal card">
          <div class="modal-header">
            <h3>Rejeitar participação</h3>
            <button class="btn-close" @click="rejecting = null" aria-label="Fechar">✕</button>
          </div>
          <p class="muted" style="margin-bottom:1rem">
            Informe o motivo da rejeição de <strong>{{ rejecting.cidadao_nome }}</strong>.
          </p>
          <textarea
            id="textarea-motivo"
            class="input"
            v-model="motivo"
            rows="4"
            placeholder="Descreva o motivo (mínimo 10 caracteres)…"
            maxlength="500"
          ></textarea>
          <p class="char-count" :class="{ 'text-warn': motivo.length < 10 }">
            {{ motivo.length }}/500 caracteres
          </p>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="rejecting = null">Cancelar</button>
            <button
              id="btn-confirmar-rejeicao"
              class="btn btn-danger-solid"
              :disabled="motivo.trim().length < 10"
              @click="confirmReject"
            >
              Confirmar rejeição
            </button>
          </div>
        </div>
      </div>

      <!-- Modal: Foto ampliada -->
      <div v-if="fotoModal" class="backdrop foto-backdrop" @click.self="fotoModal = null">
        <img
          :src="fotoModal"
          class="foto-ampliada"
          alt="Foto de participação ampliada"
        />
        <button class="foto-close" @click="fotoModal = null" aria-label="Fechar">✕</button>
      </div>

    </Teleport>
  </div>
</template>

<style scoped>
.evento-page { padding-bottom: 3rem; }

.back-link {
  display: inline-block;
  color: var(--color-muted, #64748b);
  font-size: .9rem;
  text-decoration: none;
  margin-bottom: .5rem;
}
.back-link:hover { color: var(--color-primary, #22c55e); }

.dash-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.dash-head h1 { font-size: 1.75rem; margin: 0 0 .25rem; }

/* Stats */
.stats-row {
  display: flex;
  gap: .75rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}
.stat-pill {
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  padding: .6rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 72px;
}
.stat-pill.stat-pendente { background: #fffbeb; border-color: #fcd34d; }
.stat-pill.stat-aprovado { background: #f0fdf4; border-color: #86efac; }
.stat-num { font-size: 1.4rem; font-weight: 800; color: var(--color-primary, #22c55e); }
.stat-lbl { font-size: .75rem; color: var(--color-muted, #64748b); font-weight: 500; }

/* Filtros */
.filter-bar {
  display: flex;
  gap: .4rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}
.filter-btn {
  padding: .45rem .9rem;
  border: 1.5px solid var(--color-border, #e2e8f0);
  border-radius: 999px;
  background: var(--color-surface, #fff);
  color: var(--color-muted, #64748b);
  font-size: .85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all .15s;
  display: flex;
  align-items: center;
  gap: .3rem;
}
.filter-btn:hover { border-color: var(--color-primary, #22c55e); color: var(--color-primary, #22c55e); }
.filter-btn.active { background: var(--color-primary, #22c55e); border-color: var(--color-primary, #22c55e); color: #fff; }
.filter-count { background: rgba(0,0,0,.1); border-radius: 999px; padding: 0 .4em; font-size: .75em; }
.filter-btn.active .filter-count { background: rgba(255,255,255,.25); }

/* Skeleton */
.skeleton-list { display: flex; flex-direction: column; gap: .6rem; }
.skeleton { height: 60px; border-radius: var(--radius-sm, 8px); background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* Empty */
.empty-card { display: flex; align-items: flex-start; gap: 1rem; border: 1px dashed var(--color-border, #e2e8f0); border-radius: var(--radius-md, 12px); padding: 2rem; color: var(--color-muted, #64748b); }
.empty-icon { font-size: 2rem; flex-shrink: 0; }
.empty-card strong { display: block; color: var(--color-text, #1a1a1a); margin-bottom: .3rem; }

/* Tabela */
.table-wrap { padding: 0; overflow: hidden; }
.tbl { width: 100%; border-collapse: collapse; }
.tbl th, .tbl td { text-align: left; padding: .8rem 1rem; border-bottom: 1px solid var(--color-border, #e2e8f0); }
.tbl th { background: #f6faf7; font-size: .82rem; color: var(--color-muted, #64748b); font-weight: 700; text-transform: uppercase; letter-spacing: .03em; }
.tbl tr:last-child td { border-bottom: none; }
.tbl tr.row-pendente { background: #fffef0; }

.avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--color-primary, #22c55e); color: #fff; display: grid; place-items: center; font-weight: 700; font-size: .9rem; }
.thumb { width: 52px; height: 52px; object-fit: cover; border-radius: var(--radius-sm, 8px); cursor: pointer; transition: opacity .15s; }
.thumb:hover { opacity: .85; }
.motivo-text { font-size: .78rem; color: #dc2626; margin-top: .2rem; }

/* Botões de ação */
.action-btns { display: flex; gap: .35rem; flex-wrap: wrap; }
.btn-sm { padding: .35rem .7rem; font-size: .82rem; border-radius: var(--radius-sm, 8px); font-weight: 600; cursor: pointer; border: none; display: flex; align-items: center; gap: .3rem; }
.btn-success { background: #dcfce7; color: #166534; }
.btn-success:hover:not(:disabled) { background: #bbf7d0; }
.btn-danger  { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
.btn-danger:hover { background: #fee2e2; }

/* Modal */
.backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: grid; place-items: center; padding: 1rem; z-index: 80; backdrop-filter: blur(2px); }
.modal { max-width: 500px; width: 100%; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.modal-header h3 { margin: 0; font-size: 1.1rem; }
.btn-close { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: var(--color-muted, #64748b); padding: .25rem; }
.btn-close:hover { color: var(--color-text, #1a1a1a); }
.input { width: 100%; padding: .65rem .9rem; border: 1.5px solid var(--color-border, #e2e8f0); border-radius: var(--radius-sm, 8px); font-size: .95rem; background: var(--color-bg, #fff); color: var(--color-text, #1a1a1a); outline: none; box-sizing: border-box; }
.input:focus { border-color: var(--color-primary, #22c55e); box-shadow: 0 0 0 3px rgba(34,197,94,.15); }
textarea.input { resize: vertical; min-height: 80px; }
.char-count { font-size: .8rem; color: var(--color-muted, #64748b); text-align: right; margin: .3rem 0 0; }
.text-warn { color: #dc2626; }
.modal-footer { display: flex; justify-content: flex-end; gap: .5rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-border, #e2e8f0); }
.btn-danger-solid { background: #dc2626; color: #fff; border: none; border-radius: var(--radius-sm, 8px); padding: .6rem 1.1rem; font-weight: 700; cursor: pointer; font-size: .9rem; }
.btn-danger-solid:hover:not(:disabled) { background: #b91c1c; }
.btn-danger-solid:disabled { opacity: .5; cursor: not-allowed; }

/* Foto ampliada */
.foto-backdrop { background: rgba(0,0,0,.85); }
.foto-ampliada { max-width: 90vw; max-height: 85vh; border-radius: var(--radius-md, 12px); object-fit: contain; }
.foto-close { position: fixed; top: 1.25rem; right: 1.25rem; background: rgba(255,255,255,.15); border: none; color: #fff; font-size: 1.5rem; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: grid; place-items: center; }
.foto-close:hover { background: rgba(255,255,255,.3); }

/* Spinner */
.spinner-sm { display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(0,0,0,.2); border-top-color: currentColor; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
