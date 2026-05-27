<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../utils/api'
import { formatDate, formatPoints } from '../utils/format'
import { useToast } from '../composables/useToast'

const toast = useToast()
const stats = ref({}); const pendentes = ref([]); const validacoes = ref([]); const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const [s, p, v] = await Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/institutos?status=pendente').catch(() => []),
      api.get('/admin/validacoes').catch(() => []),
    ])
    stats.value = s; pendentes.value = p; validacoes.value = v
  } catch (e) { toast.error(e.message) } finally { loading.value = false }
}
onMounted(load)

async function aprovar(i) { try { await api.patch(`/admin/institutos/${i.id}/aprovar`); toast.success('Instituto aprovado'); load() } catch (e) { toast.error(e.message) } }
async function suspender(i) { try { await api.patch(`/admin/institutos/${i.id}/suspender`); toast.success('Instituto suspenso'); load() } catch (e) { toast.error(e.message) } }
</script>
<template>
  <div class="container">
    <h1>Painel administrativo</h1>
    <div class="grid metrics">
      <div class="card"><span>Usuários</span><strong>{{ formatPoints(stats.total_usuarios) }}</strong></div>
      <div class="card"><span>Limpezas</span><strong>{{ formatPoints(stats.total_limpezas) }}</strong></div>
      <div class="card"><span>NFTs emitidos</span><strong>{{ formatPoints(stats.total_nfts) }}</strong></div>
      <div class="card"><span>Pontos distribuídos</span><strong>{{ formatPoints(stats.total_pontos) }}</strong></div>
      <div class="card"><span>Institutos pendentes</span><strong>{{ formatPoints(stats.institutos_pendentes) }}</strong></div>
    </div>

    <section>
      <h2>Institutos pendentes</h2>
      <div v-if="!pendentes.length" class="card muted">Nenhum instituto aguardando.</div>
      <ul v-else class="list">
        <li v-for="i in pendentes" :key="i.id" class="card row">
          <div><strong>{{ i.name }}</strong><div class="muted">{{ i.email }} · CNPJ {{ i.cnpj }}</div></div>
          <div style="display:flex; gap:.5rem">
            <button class="btn btn-primary" @click="aprovar(i)">Aprovar</button>
            <button class="btn btn-ghost" @click="suspender(i)">Suspender</button>
          </div>
        </li>
      </ul>
    </section>

    <section>
      <h2>Validações recentes</h2>
      <table class="tbl card" v-if="validacoes.length">
        <thead><tr><th>Data</th><th>Tipo</th><th>Status</th><th>Score</th></tr></thead>
        <tbody>
          <tr v-for="v in validacoes" :key="v.id">
            <td class="muted">{{ formatDate(v.created_at) }}</td>
            <td>{{ v.tipo_acao }}</td>
            <td>{{ v.status }}</td>
            <td>
              <div class="score"><div class="score-fill" :style="{ width: ((v.score||0)*100)+'%', background: (v.score||0) > .7 ? 'var(--color-success)' : 'var(--color-warn)' }"></div></div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="card muted">Sem validações.</div>
    </section>
  </div>
</template>
<style scoped>
.metrics { grid-template-columns: repeat(auto-fill,minmax(180px,1fr)); margin-bottom:2rem; }
.metrics .card { display:flex; flex-direction:column; gap:.3rem; }
.metrics span { color: var(--color-muted); font-size:.85rem; }
.metrics strong { font-family: var(--font-display); font-size:1.8rem; color: var(--color-primary); }
.list { list-style:none; padding:0; display:flex; flex-direction:column; gap:.6rem; }
.row { display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap; }
.tbl { width:100%; border-collapse:collapse; padding:0; overflow:hidden; }
.tbl th, .tbl td { padding:.7rem 1rem; text-align:left; border-bottom:1px solid var(--color-border); font-size:.9rem; }
.score { width:140px; height:10px; background:#eef3ee; border-radius:999px; overflow:hidden; }
.score-fill { height:100%; }
section { margin-top:2rem; }
</style>
