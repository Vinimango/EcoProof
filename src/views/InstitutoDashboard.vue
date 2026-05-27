<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../utils/api'
import { formatDate, formatTipoAcao } from '../utils/format'
import StatusBadge from '../components/StatusBadge.vue'
import { useToast } from '../composables/useToast'

const toast = useToast()
const eventos = ref([]); const loading = ref(true); const showForm = ref(false)
const form = ref({ titulo:'', descricao:'', local:'', data_evento:'', tipo_acao:'lixo_rua' })
const saving = ref(false)

async function load() {
  loading.value = true
  try { eventos.value = await api.get('/eventos/me') } catch (e) { toast.error(e.message) } finally { loading.value = false }
}
onMounted(load)

async function criar() {
  saving.value = true
  try { await api.post('/eventos', form.value); toast.success('Evento criado!'); showForm.value=false; form.value = { titulo:'', descricao:'', local:'', data_evento:'', tipo_acao:'lixo_rua' }; load() }
  catch (e) { toast.error(e.message) } finally { saving.value = false }
}

async function emitirNFTs(ev) {
  try { const r = await api.post(`/eventos/${ev.id}/emitir-nfts`); toast.success(`${r.total_emitidos || ''} NFTs emitidos`); load() }
  catch (e) { toast.error(e.message) }
}
</script>
<template>
  <div class="container">
    <header class="head">
      <div><h1>Painel do Instituto</h1><p class="muted">Gerencie seus eventos e participantes.</p></div>
      <button class="btn btn-primary" @click="showForm=true">+ Criar evento</button>
    </header>

    <div v-if="loading" class="skeleton" style="height:120px"></div>
    <div v-else-if="!eventos.length" class="card muted">Nenhum evento criado ainda.</div>
    <ul v-else class="list">
      <li v-for="e in eventos" :key="e.id" class="card row">
        <div>
          <div style="display:flex; gap:.5rem; align-items:center">
            <strong>{{ e.titulo }}</strong>
            <StatusBadge :status="e.status" />
          </div>
          <div class="muted">{{ formatDate(e.data_evento) }} · {{ e.local }} · {{ formatTipoAcao(e.tipo_acao) }}</div>
          <div class="muted">{{ e.total_participantes || 0 }} participantes</div>
        </div>
        <div style="display:flex; gap:.5rem; flex-wrap:wrap">
          <RouterLink :to="`/instituto/eventos/${e.id}`" class="btn btn-ghost">Gerenciar</RouterLink>
          <button class="btn btn-accent" :disabled="!e.tem_aprovados" @click="emitirNFTs(e)">Emitir NFTs em lote</button>
        </div>
      </li>
    </ul>

    <Teleport to="body">
      <div v-if="showForm" class="backdrop" @click.self="showForm=false">
        <div class="modal card">
          <h2>Novo evento</h2>
          <form @submit.prevent="criar">
            <div class="field"><label class="label">Título</label><input class="input" v-model="form.titulo" required /></div>
            <div class="field"><label class="label">Descrição</label><textarea v-model="form.descricao" rows="3"></textarea></div>
            <div class="field"><label class="label">Local</label><input class="input" v-model="form.local" required /></div>
            <div class="field"><label class="label">Data e hora</label><input class="input" type="datetime-local" v-model="form.data_evento" required /></div>
            <div class="field"><label class="label">Tipo de ação</label>
              <select class="select" v-model="form.tipo_acao">
                <option value="lixo_rua">Lixo na rua</option><option value="praia">Praia</option>
                <option value="corrego">Córrego</option><option value="queimada">Queimada</option><option value="outro">Outro</option>
              </select>
            </div>
            <div style="display:flex; gap:.5rem; justify-content:flex-end">
              <button type="button" class="btn btn-ghost" @click="showForm=false">Cancelar</button>
              <button class="btn btn-primary" :disabled="saving">{{ saving ? 'Salvando…' : 'Criar' }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
<style scoped>
.head { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
.list { list-style:none; padding:0; display:flex; flex-direction:column; gap:.8rem; }
.row { display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap; }
.backdrop { position:fixed; inset:0; background:rgba(0,0,0,.5); display:grid; place-items:center; padding:1rem; z-index:80; }
.modal { max-width:560px; width:100%; }
</style>
