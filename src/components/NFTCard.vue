<script setup>
import { formatDate, formatTipoAcao } from '../utils/format'
defineProps({ nft: Object })
defineEmits(['click'])
</script>
<template>
  <article class="nft-card" @click="$emit('click', nft)">
    <div class="img" :style="{ backgroundImage: `url(${nft.foto_url})` }">
      <span class="seal" :class="nft.assinado_por">
        {{ nft.assinado_por === 'instituto' ? '🏛️ Instituto' : '✅ EcoProof' }}
      </span>
    </div>
    <div class="body">
      <div class="tipo">{{ formatTipoAcao(nft.tipo_acao) }}</div>
      <div class="muted">{{ formatDate(nft.created_at) }}</div>
      <slot />
    </div>
  </article>
</template>
<style scoped>
.nft-card { background:#fff; border-radius: var(--radius-md); overflow:hidden; box-shadow: var(--shadow-card); cursor:pointer; transition: transform .15s, box-shadow .15s; }
.nft-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
.img { height:180px; background-size:cover; background-position:center; background-color:#dde6df; position:relative; }
.seal { position:absolute; top:.6rem; left:.6rem; padding:.3rem .6rem; border-radius:999px; font-size:.75rem; font-weight:700; }
.seal.cidadao { background: var(--color-tertiary); color:#fff; }
.seal.instituto { background: var(--color-accent); color:#1a2620; }
.body { padding: .9rem 1rem 1rem; }
.tipo { font-weight:700; color: var(--color-primary); margin-bottom:.2rem; }
</style>
