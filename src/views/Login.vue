<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'

const auth = useAuthStore(); const router = useRouter(); const route = useRoute(); const toast = useToast()
const email = ref(''); const password = ref(''); const loading = ref(false); const err = ref('')

async function submit() {
  err.value = ''
  if (!email.value || !password.value) { err.value = 'Preencha email e senha.'; return }
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    const dest = route.query.redirect || (auth.isAdmin ? '/admin/dashboard' : auth.isInstituto ? '/instituto/dashboard' : '/app/dashboard')
    router.push(dest)
  } catch (e) {
    if (e.status === 403) err.value = 'Sua conta de instituto ainda aguarda aprovação.'
    else err.value = e.message || 'Credenciais inválidas.'
  } finally { loading.value = false }
}
</script>
<template>
  <div class="container auth">
    <div class="card form">
      <h1>Entrar</h1>
      <form @submit.prevent="submit">
        <div class="field"><label class="label">E-mail</label><input class="input" type="email" v-model="email" /></div>
        <div class="field"><label class="label">Senha</label><input class="input" type="password" v-model="password" /></div>
        <p v-if="err" class="error-text">{{ err }}</p>
        <button class="btn btn-primary" :disabled="loading" type="submit">
          <span v-if="loading" class="spinner"></span>{{ loading ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
      <p class="muted" style="margin-top:1rem">Novo aqui? <RouterLink to="/register">Crie sua conta</RouterLink></p>
    </div>
  </div>
</template>
<style scoped>.auth { max-width:480px; } .form { padding:2rem; }</style>
