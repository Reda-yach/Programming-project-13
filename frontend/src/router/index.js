import { createRouter, createWebHistory } from 'vue-router'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/student',
      name: 'student-dashboard',
      component: () => import('../views/StudentDashboard.vue'),
    },
    {
      path: '/student/aanvraag',
      name: 'student-aanvraag',
      component: () => import('../views/StudentAanvraag.vue'),
    },
    {
      path: '/docent',
      name: 'docent',
      component: () => import('../views/DocentInCommissieStudenten.vue'),
    },
    {
      path: '/docent-logboek-overzicht',
      name: 'docent-logboek-overzicht',
      component: () => import('../views/Docentlogboekoverzicht.vue'),
    },
    {
      path: '/docent-evaluaties',
      name: 'docent-evaluaties',
      component: () => import('../views/DocentInCommissieEvaluaties.vue'),
    },
    {
      path: '/docent-aanvragen',
      name: 'docent-aanvragen',
      component: () => import('../views/DocentInCommissieAanvragen.vue'),
    },
    {
      path: '/docent-logboek-detail',
      name: 'docent-logboek-detail',
      component: () => import('../views/DocentLogboekDetail.vue'),
    },
    {
      path: '/docent-studenten',
      name: 'docent-studenten',
      component: () => import('../views/DocentInCommissieStudenten.vue'),
    },
    // ── Admin (all routes require admin role) ─────────────────────────────
    {
      path: '/admin',
      redirect: '/admin/competentiesets',
    },
    {
      path: '/admin/competentiesets',
      name: 'admin-competentiesets',
      component: () => import('../views/Admincompetentiesets.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/competentiebeheer',
      name: 'admin-competentiebeheer',
      component: () => import('../views/AdminCompetentiebeheer.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/stages',
      name: 'admin-stages',
      component: () => import('../views/Adminstagebeheer.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/stages/:id/koppelen',
      name: 'admin-stage-koppelen',
      component: () => import('../views/Adminaccountkoppelen.vue'),
      props: true,
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/accounts',
      name: 'admin-accounts',
      component: () => import('../views/Adminaccountbeheer.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/accounts/:id/bewerken',
      name: 'admin-account-bewerken',
      component: () => import('../views/Adminaccountbewerken.vue'),
      props: true,
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/aanvragen',
      name: 'admin-aanvragen',
      component: () => import('../views/CommissieDashboard.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/commissie',
      name: 'commissie-dashboard',
      component: () => import('../views/CommissieDashboard.vue'),
    },
  ],
})


router.beforeEach((to, from, next) => {
  const openRoutes = ['login']
  const token = localStorage.getItem('token')

  // 1. Not logged in → login
  if (!openRoutes.includes(to.name) && !token) {
    next({ name: 'login' })
    return
  }

  // 2. Admin-only route → verify rol from stored gebruiker object
  if (to.meta.requiresAdmin) {
    try {
      const gebruiker = JSON.parse(localStorage.getItem('gebruiker') || '{}')
      if (gebruiker.rol !== 'admin') {
        next({ name: 'login' })
        return
      }
    } catch {
      next({ name: 'login' })
      return
    }
  }

  next()
})

export default router