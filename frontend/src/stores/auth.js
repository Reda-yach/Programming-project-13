import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'stage-auth'

function readStoredAuth() {
  if (typeof window === 'undefined') {
    return { token: null, user: null }
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    return { token: null, user: null }
  }

  try {
    return JSON.parse(stored)
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return { token: null, user: null }
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(readStoredAuth().token)
  const user = ref(readStoredAuth().user)

  const isLoggedIn = computed(() => Boolean(token.value))

  function saveSession(session) {
    token.value = session.token
    user.value = session.user

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: session.token, user: session.user })
    )
  }

  function clearSession() {
    token.value = null
    user.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  function getRoleHomePath(role) {
    const map = {
      student: '/student',
      docent: '/docent',
      mentor: '/mentor',
      admin: '/admin',
      commissie: '/commissie',
    }

    return map[role] || '/login'
  }

  return { token, user, isLoggedIn, saveSession, clearSession, getRoleHomePath }
})
