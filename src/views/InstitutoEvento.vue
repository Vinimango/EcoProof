<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../utils/api'
import { formatDate } from '../utils/format'
import StatusBadge from '../components/StatusBadge.vue'
import { useToast } from '../composables/useToast'

const route = useRoute(); const toast = useToast()
const id = route.params.id
const items = ref([]); const loading = ref(true); const filter = ref('')
const rejecting = ref(null); const motivo = ref(''); const fotoModal = ref(null)

async function load() {
  loading.value = true
  try { items.value = await api.get(`/eventos/${id}/participacoes`) } catch (e) { toast.error(e.message) } finally { loading.value = false }
}
onMounted(load)

const filtered = computed(() => filter.value ? items.value.filter(p => p.status === filter.value) : items.value)
const pendentes = computed(() => items.value.filter(p => p.status === 'foto_enviada').length)

async function aprovar(p) {
  try { await api.post(`/eventos/${id}/participacoes/${p.id}/aprovar`); toast.success('Aprovado'); load() }
  catch (e) { toast.error(e.message) }
}
async function confirmReject() {
  if (motivo.value.length < 10) return toast.warn('Motivo precisa ter ao menos 10 caracteres.')
  try { await api.post(`/eventos/${id}/participacoes/${rejecting.value.id}/rejeitar`, { motivo: motivo.value }); toast.success('Rejeitado'); rejecting.value=null; motivo.value=''; load() }
  catch (e) { toast.error(e.message) }
}
</script>
<template>
  <div class="container">
    <header class="head">
      <div>
        <h1>Participantes</h1>
        <p class="muted">{{ pendentes }} pendentes de revisão</p>
      </div>
      <select class="select" v-model="filter" style="max-width:200px">
        <option value="">Todos</option><option value="confirmado">Confirmado</option>
        <option value="foto_enviada">Foto enviada</option><option value="aprovado">Aprovado</option>
        <option value="rejeitado">Rejeitado</option>
      </select>
    </header>

    <div v-if="loading" class="skeleton" style="height:120px"></div>
    <div v-else-if="!filtered.length" class="card muted">Nenhuma participação.</div>
    <table v-else class="tbl card">
      <thead><tr><th></th><th>Cidadão</th><th>Status</th><th>Foto</th><th>Check-in</th><th>Ações</th></tr></thead>
      <tbody>
        <tr v-for="p in filtered" :key="p.id">
          <td><div class="avatar">{{ (p.cidadao_nome||'?')[0] }}</div></td>
          <td>{{ p.cidadao_nome }}</td>
          <td><StatusBadge :status="p.status" /></td>
          <td><img v-if="p.foto_url" :src="p.foto_url" class="thumb" @click="fotoModal=p.foto_url" /></td>
          <td class="muted">{{ formatDate(p.checkin_at) }}</td>
          <td>
            <div style="display:flex; gap:.4rem; flex-wrap:wrap">
              <button v-if="p.status==='foto_enviada'" class="btn btn-primary" @click="aprovar(p)">Aprovar</button>
              <button v-if="p.status==='foto_enviada'" class="btn btn-ghost" @click="rejecting=p; motivo=''">Rejeitar</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <Teleport to="body">
      <div v-if="rejecting" class="backdrop" @click.self="rejecting=null">
        <div class="modal card">
          <h3>Rejeitar participação</h3>
          <p class="muted">Explique o motivo (mínimo 10 caracteres).</p>
          <textarea v-model="motivo" rows="4"></textarea>
          <div style="display:flex; gap:.5rem; justify-content:flex-end; margin-top:1rem">
            <button class="btn btn-ghost" @click="rejecting=null">Cancelar</button>
            <button class="btn btn-primary" @click="confirmReject">Confirmar</button>
          </div>
        </div>
      </div>
      <div v-if="fotoModal" class="backdrop" @click.self="fotoModal=null">
        <img :src="fotoModal" style="max-width:90vw; max-height:90vh; border-radius:var(--radius-md)" />
      </div>
    </Teleport>
  </div>
</template>
<style scoped>
.head { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
.tbl { width:100%; border-collapse: collapse; padding:0; overflow:hidden; }
.tbl th, .tbl td { text-align:left; padding:.8rem 1rem; border-bottom:1px solid var(--color-border); }
.tbl th { background:#f6faf7; font-size:.85rem; color: var(--color-muted); }
.avatar { width:32px; height:32px; border-radius:50%; background: var(--color-tertiary); color:#fff; display:grid; place-items:center; font-weight:700; }
.thumb { width:50px; height:50px; object-fit:cover; border-radius: var(--radius-sm); cursor:pointer; }
.backdrop { position:fixed; inset:0; background:rgba(0,0,0,.6); display:grid; place-items:center; padding:1rem; z-index:80; }
.modal { max-width:500px; width:100%; }
</style>
