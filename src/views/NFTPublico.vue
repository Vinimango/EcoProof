<script setup>
import { onMounted, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../utils/api'
import { formatDate, formatTipoAcao, truncateHash } from '../utils/format'

const route = useRoute()
const nft = ref(null); const metadata = ref(null); const loading = ref(true); const err = ref('')

onMounted(async () => {
  try {
    nft.value = await api.get(`/nfts/${route.params.token_id}`)
    try { metadata.value = await api.get(`/nfts/${route.params.token_id}/metadata.json`) } catch {}
  } catch (e) { err.value = e.message } finally { loading.value = false }
})

watchEffect(() => {
  if (!nft.value) return
  document.title = `NFT #${nft.value.token_id} — EcoProof`
  setMeta('og:title', `EcoProof NFT #${nft.value.token_id}`)
  setMeta('og:description', `Ação verificada: ${formatTipoAcao(nft.value.tipo_acao)}`)
  setMeta('og:image', nft.value.foto_url)
  setMeta('og:type', 'article')
})
function setMeta(prop, content) {
  let el = document.querySelector(`meta[property="${prop}"]`)
  if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el) }
  el.setAttribute('content', content || '')
}
</script>
<template>
  <div class="container">
    <div v-if="loading" class="skeleton" style="height:400px"></div>
    <div v-else-if="err" class="card muted">{{ err }}</div>
    <article v-else class="card nft">
      <img :src="nft.foto_url" />
      <div class="info">
        <span v-if="nft.assinado_por==='instituto'" class="badge" style="background:var(--color-accent); color:#1a2620">🏛️ Assinado por Instituto</span>
        <h1>{{ metadata?.name || `NFT #${nft.token_id}` }}</h1>
        <p class="muted">{{ formatTipoAcao(nft.tipo_acao) }} · {{ formatDate(nft.created_at) }}</p>
        <p v-if="metadata?.description">{{ metadata.description }}</p>
        <dl v-if="metadata?.attributes">
          <template v-for="a in metadata.attributes" :key="a.trait_type">
            <dt>{{ a.trait_type }}</dt><dd>{{ a.value }}</dd>
          </template>
        </dl>
        <p><strong>Tx:</strong> {{ truncateHash(nft.tx_hash) }}</p>
        <a class="btn btn-primary" :href="`https://etherscan.io/tx/${nft.tx_hash}`" target="_blank">Verificar na blockchain ↗</a>
      </div>
    </article>
  </div>
</template>
<style scoped>
.nft { display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; align-items:start; }
.nft img { width:100%; border-radius: var(--radius-md); }
dl { display:grid; grid-template-columns:auto 1fr; gap:.3rem .8rem; margin:1rem 0; }
dt { color: var(--color-muted); }
dd { margin:0; }
@media (max-width:768px){ .nft { grid-template-columns:1fr; } }
</style>
