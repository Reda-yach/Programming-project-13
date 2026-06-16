import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
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
      path: '/docent-logboek-detail/:stageId',
      name: 'docent-logboek-detail',
      component: () => import('../views/DocentLogboekDetail.vue'),
    },
    {
      path: '/docent-studenten',
      name: 'docent-studenten',
      component: () => import('../views/DocentInCommissieStudenten.vue'),
    },
    {
      path: '/docent/studenten',
      name: 'docent-studenten-overzicht',
      component: () => import('../views/DocentStudenten.vue'),
    },
    {
      path: '/docent/studenten/:id',
      name: 'docent-student-detail',
      component: () => import('../views/DocentStudentDetail.vue'),
    },
    {
      path: '/docent/logboek/:studentId',
      name: 'docent-logboek-detail-nieuw',
      component: () => import('../views/DocentLogboekDetail.vue'),
    },
    {
      path: '/docent/aanvragen',
      name: 'docent-aanvragen-overzicht',
      component: () => import('../views/DocentAanvragen.vue'),
    },
    {
      path: '/docent/evaluaties/:stageId',
      name: 'docent-evaluatie-overzicht',
      component: () => import('../views/DocentEvaluatieOverzicht.vue'),
    },
    {
      path: '/docent/evaluatie/:stageId/:type',
      name: 'docent-evaluatie',
      component: () => import('../views/DocentEvaluatie.vue'),
    },
    {
      path: '/docent/evaluatie/:stageId/:type/invullen',
      name: 'docent-evaluatie-invullen',
      component: () => import('../views/DocentEvaluatieInvullen.vue'),
    },
    {
      path: '/mentor',
      name: 'mentor-dashboard',
      component: () => import('../views/MentorDashboard.vue'),
    },
    {
      path: '/mentor/logboeken',
      name: 'mentor-logboeken',
      component: () => import('../views/MentorLogboeken.vue'),
    },
    {
      path: '/mentor/evaluatie',
      name: 'mentor-evaluatie',
      component: () => import('../views/MentorEvaluatie.vue'),
    },
    {
      path: '/mentor/probleem',
      name: 'mentor-probleem',
      component: () => import('../views/MentorProbleemmelding.vue'),
    },
    {
      path: '/student/contract',
      name: 'student-contract',
      component: () => import('../views/StudentContract.vue'),
    },
    {
      path: '/student/logboek',
      name: 'student-logboek',
      component: () => import('../views/StudentLogboek.vue'),
    },
    {
      path: '/student/evaluatie',
      name: 'student-evaluatie',
      component: () => import('../views/StudentEvaluatie.vue'),
    },
    {
      path: '/student/eindoverzicht',
      name: 'student-eindoverzicht',
      component: () => import('../views/StudentEindoverzicht.vue'),
    },
    {
      path: '/commissie',
      name: 'commissie',
      component: () => import('../views/CommissieDashboard.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminDashboard.vue'),
    },
    {
      path: '/admin/competenties',
      name: 'admin-competenties',
      component: () => import('../views/AdminCompetentiebeheer.vue'),
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const openRoutes = ['login']
  const token = localStorage.getItem('token')
  if (!openRoutes.includes(to.name) && !token) {
    next({ name: 'login' })
  } else {
    next()
  }
})

export default router
