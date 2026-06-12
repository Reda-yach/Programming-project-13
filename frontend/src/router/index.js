import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      meta: { requiresAuth: false },
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
      path: '/aanvragen',
      name: 'commissie-aanvragen',
      component: () => import('@/views/CommissieAanvragenView.vue'),
    },
    {
      path: '/docent/studenten',
      name: 'docent-studenten',
      component: () => import('../views/docent/StudentenOverzichtView.vue'),
    },
    {
      path: '/docent/studenten/:id',
      name: 'docent-student-detail',
      component: () => import('../views/docent/StudentDetailView.vue'),
    },
    {
      path: '/docent',
      name: 'docent-dashboard',
      component: () => import('../views/PlaceholderView.vue'),
    },
    {
      path: '/docent/logboek',
      name: 'docent-logboek',
      component: () => import('../views/PlaceholderView.vue'),
    },
    {
      path: '/docent/evaluatie',
      name: 'docent-evaluatie',
      component: () => import('../views/PlaceholderView.vue'),
    },
    {
      path: '/docent/documenten',
      name: 'docent-documenten',
      component: () => import('../views/PlaceholderView.vue'),
    },
    {
      path: '/student/logboek',
      name: 'student-logboek',
      component: () => import('../views/PlaceholderView.vue'),
    },
    {
      path: '/student/evaluatie',
      name: 'student-evaluatie',
      component: () => import('../views/PlaceholderView.vue'),
    },
    {
      path: '/student/evaluatie-eind',
      name: 'student-evaluatie-eind',
      component: () => import('../views/PlaceholderView.vue'),
    },
    {
      path: '/mentor',
      name: 'mentor-dashboard',
      component: () => import('../views/PlaceholderView.vue'),
    },
    {
      path: '/admin',
      name: 'admin-dashboard',
      component: () => import('../views/PlaceholderView.vue'),
    },
    {
      path: '/commissie',
      name: 'commissie-dashboard',
      component: () => import('../views/PlaceholderView.vue'),
    },
    {
      path: '/wachtwoord-vergeten',
      name: 'wachtwoord-vergeten',
      meta: { requiresAuth: false },
      component: () => import('../views/WachtwoordVergetenView.vue'),
    },
    {
      path: '/wachtwoord-reset',
      name: 'wachtwoord-reset',
      meta: { requiresAuth: false },
      component: () => import('../views/WachtwoordResetView.vue'),
    },

  ],
})

export default router
