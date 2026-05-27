<script setup>
import { onMounted, ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { api } from '../utils/api'
import { formatDate, formatTipoAcao, formatPoints, truncateHash } from '../utils/format'
import { useToast } from '../composables/useToast'
import StatusBadge from '../components/StatusBadge.vue'

const auth = useAuthStore(); const toast = useToast()
const limpezas = ref([]); const loading = ref(true)
const editingWallet = ref(false); const walletDraft = ref('')
const META = 500

const pontos = computed(() => auth.user?.pontos || 0)
const progresso = computed(() => Math.min(100, (pontos.value/META)*100))

onMounted(async () => {
  try { limpezas.value = await api.get('/limpezas/me') } catch (e) { toast.error(e.message) } finally { loading.value = false }
})

async function saveWallet() {
  try { await auth.updateWallet(walletDraft.value); toast.success('Wallet atualizada'); editingWallet.value = false }
  catch (e) { toast.error(e.message) }
}
function startEdit() { walletDraft.value = auth.user?.wallet_address || ''; editingWallet.value = true }
</script>
<template>
  <div class="container">
    <header class="head">
      <div>
        <h1>Olá, {{ auth.user?.name || '…' }} 🌿</h1>
        <p class="muted">Seu impacto ambiental, registrado em blockchain.</p>
      </div>
      <RouterLink to="/app/registrar-limpeza" class="btn btn-primary">+ Registrar limpeza</RouterLink>
    </header>

    <div class="grid two">
      <div class="card">
        <h3>Pontos rumo ao IPTU Verde</h3>
        <div class="points">{{ formatPoints(pontos) }} <span class="muted">/ {{ META }}</span></div>
        <div class="bar"><div class="bar-fill" :style="{ width: progresso + '%' }"></div></div>
        <p class="muted" style="margin-top:.5rem">Faltam {{ Math.max(0, META - pontos) }} pontos para o desconto.</p>
      </div>

      <div class="card">
        <h3>Wallet</h3>
        <template v-if="!editingWallet">
          <p class="mono">{{ auth.user?.wallet_address ? truncateHash(auth.user.wallet_address) : '— não configurada —' }}</p>
          <button class="btn btn-ghost" @click="startEdit">Editar wallet</button>
        </template>
        <template v-else>
          <input class="input" v-model="walletDraft" placeholder="0x…" />
          <div style="display:flex; gap:.5rem; margin-top:.6rem">
            <button class="btn btn-primary" @click="saveWallet">Salvar</button>
            <button class="btn btn-ghost" @click="editingWallet=false">Cancelar</button>
          </div>
        </template>
      </div>
    </div>

    <section style="margin-top:2rem">
      <h2>Últimas limpezas</h2>
      <div v-if="loading" class="grid"><div class="skeleton" style="height:64px" v-for="i in 3" :key="i"></div></div>
      <div v-else-if="!limpezas.length" class="card muted">Você ainda não registrou nenhuma limpeza.</div>
      <ul v-else class="list">
        <li v-for="l in limpezas.slice(0,5)" :key="l.id" class="card row">
          <div>
            <strong>{{ formatTipoAcao(l.tipo_acao) }}</strong>
            <div class="muted">{{ formatDate(l.created_at) }}</div>
          </div>
          <StatusBadge :status="l.status" />
        </li>
      </ul>
    </section>
  </div>
</template>
<style scoped>
.head { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem; }
.two { grid-template-columns: 1fr 1fr; }
@media (max-width:768px){ .two { grid-template-columns:1fr; } }
.points { font-family: var(--font-display); font-size:2rem; color: var(--color-primary); }
.bar { background:#eef3ee; border-radius:999px; height:10px; overflow:hidden; margin-top:.4rem; }
.bar-fill { height:100%; background: linear-gradient(90deg, var(--color-tertiary), var(--color-accent)); transition:width .6s; }
.mono { font-family: ui-monospace, monospace; }
.list { list-style:none; padding:0; display:flex; flex-direction:column; gap:.6rem; }
.row { display:flex; justify-content:space-between; align-items:center; }
</style>
