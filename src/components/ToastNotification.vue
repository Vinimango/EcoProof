<script setup>
import { useToast } from '../composables/useToast'
const { state } = useToast()
</script>
<template>
  <div class="toasts">
    <div v-for="t in state.toasts" :key="t.id" class="toast" :class="t.type">{{ t.message }}</div>
  </div>
</template>
<style scoped>
.toasts { position:fixed; bottom:1rem; right:1rem; display:flex; flex-direction:column; gap:.5rem; z-index:100; }
.toast { padding:.8rem 1rem; border-radius: var(--radius-md); color:#fff; box-shadow: var(--shadow-lg); min-width:240px; }
.toast.success { background: var(--color-success); }
.toast.error { background: var(--color-danger); }
.toast.warn { background: var(--color-warn); }
.toast.info { background: var(--color-secondary); }
</style>
