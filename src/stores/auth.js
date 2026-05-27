import { defineStore } from 'pinia'
import { api } from '../utils/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('ecoproof_token') || null,
    role: localStorage.getItem('ecoproof_role') || null,
    user: null,
  }),
  getters: {
    isAuthenticated: (s) => !!s.token,
    isCidadao: (s) => s.role === 'cidadao',
    isInstituto: (s) => s.role === 'instituto',
    isAdmin: (s) => s.role === 'admin',
  },
  actions: {
    _persist() {
      if (this.token) localStorage.setItem('ecoproof_token', this.token); else localStorage.removeItem('ecoproof_token')
      if (this.role) localStorage.setItem('ecoproof_role', this.role); else localStorage.removeItem('ecoproof_role')
    },
    async login(email, password) {
      const data = await api.post('/auth/login', { email, password })
      this.token = data.access_token; this.role = data.role; this._persist()
      await this.fetchMe()
    },
    async registerCidadao(payload) {
      const data = await api.post('/auth/register/cidadao', payload)
      this.token = data.access_token; this.role = data.role; this._persist()
      await this.fetchMe()
    },
    async registerInstituto(payload) {
      return api.post('/auth/register/instituto', payload)
    },
    async fetchMe() {
      try { this.user = await api.get('/users/me') } catch (e) { this.user = null; throw e }
    },
    async updateWallet(wallet_address) {
      this.user = await api.patch('/users/me', { wallet_address })
    },
    logout() { this.token = null; this.role = null; this.user = null; this._persist() },
  },
})
