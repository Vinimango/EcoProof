<script setup>
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const initials = computed(() => (auth.user?.name || '?').split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase())
function logout() { auth.logout(); router.push('/') }
</script>

<template>
  <header class="nav">
    <div class="nav-inner">
      <RouterLink to="/" class="brand">🌿 EcoProof</RouterLink>
      <nav class="links">
        <RouterLink to="/app/eventos">Eventos</RouterLink>
        <template v-if="auth.isCidadao">
          <RouterLink to="/app/dashboard">Dashboard</RouterLink>
          <RouterLink to="/app/carteira">Carteira</RouterLink>
        </template>
        <RouterLink v-if="auth.isInstituto" to="/instituto/dashboard">Instituto</RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/admin/dashboard">Admin</RouterLink>
      </nav>
      <div class="actions">
        <template v-if="auth.isAuthenticated">
          <div class="avatar" :title="auth.user?.name">{{ initials }}</div>
          <button class="btn btn-ghost" @click="logout">Sair</button>
        </template>
        <template v-else>
          <RouterLink to="/login" class="btn btn-ghost">Entrar</RouterLink>
          <RouterLink to="/register" class="btn btn-primary">Criar conta</RouterLink>
        </template>
      </div>
    </div>
  </header>
</template>

<style scoped>
.nav { background:#fff; border-bottom:1px solid var(--color-border); position:sticky; top:0; z-index:50; }
.nav-inner { max-width:1200px; margin:0 auto; padding: .8rem 1.25rem; display:flex; align-items:center; gap:1rem; }
.brand { font-family: var(--font-display); font-weight:800; font-size:1.25rem; color: var(--color-primary); }
.links { display:flex; gap:1.1rem; margin-left:1.5rem; flex:1; }
.links a { color: var(--color-text); font-weight:500; }
.links a.router-link-active { color: var(--color-secondary); }
.actions { display:flex; gap:.6rem; align-items:center; }
.avatar { width:36px; height:36px; border-radius:50%; background: var(--color-tertiary); color:#fff; display:grid; place-items:center; font-weight:700; }
@media (max-width:768px){ .links { display:none; } }
</style>
