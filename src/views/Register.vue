<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { maskCNPJ } from '../utils/format'
import { useToast } from '../composables/useToast'

const route = useRoute(); const router = useRouter(); const auth = useAuthStore(); const toast = useToast()
const mode = ref('cidadao')
const form = ref({ name:'', email:'', password:'', confirmPassword: '', cnpj:'' })
const loading = ref(false); const err = ref(''); const ok = ref('')

onMounted(() => { if (route.query.type === 'instituto') mode.value = 'instituto' })

const cnpjMasked = computed({
  get: () => maskCNPJ(form.value.cnpj),
  set: v => form.value.cnpj = v.replace(/\D/g,'').slice(0,14),
})

function validate() {
  if (form.value.name.length < 2) return 'Nome muito curto.'
  if (!/^\S+@\S+\.\S+$/.test(form.value.email)) return 'E-mail inválido.'
  if (form.value.password.length < 8 || !/[a-z]/i.test(form.value.password) || !/\d/.test(form.value.password)) return 'Senha precisa ter 8+ caracteres com letras e números.'
  if (form.value.password !== form.value.confirmPassword) return 'As senhas não coincidem.'
  if (mode.value === 'instituto' && form.value.cnpj.length !== 14) return 'CNPJ deve ter 14 dígitos.'
  return ''
}

async function submit() {
  err.value = ''; ok.value = ''
  const v = validate(); if (v) { err.value = v; return }
  loading.value = true
  try {
    if (mode.value === 'cidadao') {
      await auth.registerCidadao({ name: form.value.name, email: form.value.email, password: form.value.password })
      toast.show('Conta de cidadão criada com sucesso!', 'success')
      router.push('/app/dashboard')
    } else {
      await auth.registerInstituto({ name: form.value.name, email: form.value.email, password: form.value.password, cnpj: form.value.cnpj })
      ok.value = 'Instituto registrado! Aguarde aprovação de um administrador.'
      toast.show('Instituto registrado com sucesso! Aguarde aprovação.', 'success')
    }
  } catch (e) { err.value = e.message } finally { loading.value = false }
}
</script>
<template>
  <div class="container auth">
    <div class="card form">
      <h1>Criar conta</h1>
      <p class="muted subtitle">Junte-se à revolução sustentável com blockchain.</p>
      
      <div class="toggle">
        <button :class="{active: mode==='cidadao'}" @click="mode='cidadao'" type="button">Cidadão</button>
        <button :class="{active: mode==='instituto'}" @click="mode='instituto'" type="button">Instituto</button>
      </div>

      <form @submit.prevent="submit">
        <div class="field">
          <label class="label">Nome {{ mode==='instituto' ? 'da instituição' : 'completo' }}</label>
          <input class="input" v-model="form.name" required placeholder="Ex: João Silva" />
        </div>

        <div class="field">
          <label class="label">E-mail</label>
          <input class="input" type="email" v-model="form.email" required placeholder="Ex: joao@exemplo.com" />
        </div>

        <div v-if="mode==='instituto'" class="field">
          <label class="label">CNPJ</label>
          <input class="input" v-model="cnpjMasked" required placeholder="XX.XXX.XXX/XXXX-XX" />
        </div>

        <div class="field">
          <label class="label">Senha</label>
          <input class="input" type="password" v-model="form.password" required placeholder="Mínimo 8 caracteres com letras e números" />
        </div>

        <div class="field">
          <label class="label">Confirmar senha</label>
          <input class="input" type="password" v-model="form.confirmPassword" required placeholder="Repita a senha digitada" />
        </div>

        <p v-if="err" class="error-text">{{ err }}</p>
        <p v-if="ok" class="success-text">{{ ok }}</p>

        <button class="btn btn-primary w-100" :disabled="loading" type="submit">
          <span v-if="loading" class="spinner"></span>{{ loading ? 'Enviando…' : 'Criar conta' }}
        </button>
      </form>

      <p class="muted login-prompt">Já tem conta? <RouterLink to="/login">Entrar</RouterLink></p>
    </div>
  </div>
</template>
<style scoped>
.auth { max-width: 520px; margin: 2rem auto; }
.form { padding: 2.5rem; display: flex; flex-direction: column; gap: 1rem; border: 1px solid var(--color-border); }
h1 { margin-bottom: 0.2rem; text-align: center; font-size: 2rem; }
.subtitle { text-align: center; margin-bottom: 1.5rem; font-size: 0.95rem; }
.toggle { display:flex; background:#eef3ee; border-radius: var(--radius-md); padding:4px; margin-bottom:1.5rem; }
.toggle button { flex:1; padding:.7rem 1rem; border:none; background:transparent; cursor:pointer; border-radius: var(--radius-sm); font-weight:600; color: var(--color-muted); transition: all 0.2s ease; }
.toggle button.active { background:#fff; color: var(--color-primary); box-shadow: var(--shadow-card); }
.success-text { color: var(--color-success); font-weight:600; font-size: 0.9rem; margin: 0.5rem 0; text-align: center; }
.w-100 { width: 100%; display: flex; justify-content: center; align-items: center; height: 48px; font-size: 1rem; margin-top: 1rem; }
.login-prompt { margin-top: 1.5rem; text-align: center; font-size: 0.95rem; }
</style>
