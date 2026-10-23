import { createRouter, createWebHistory } from 'vue-router'

/**
 * 路由表
 * 说明：原代码存在两个 path 均为 '/' 的路由，虽然 Vue Router 能按顺序匹配，
 *       但可读性差且容易踩坑。此处收敛为：'/' 只做重定向，业务页面统一挂在
 *       '/app' 之下，登录态判断也一并收敛到路由守卫中。
 */
const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/UserLogin.vue'),
    meta: { public: true, title: '登录' }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/UserRegister.vue'),
    meta: { public: true, title: '注册' }
  },
  {
    path: '/',
    component: () => import('../components/AppLayout.vue'),
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('../views/DataDashboard.vue'),
        meta: { title: '数据看板' }
      },
      {
        path: 'template',
        name: 'template',
        component: () => import('../views/TaskTemplate.vue'),
        meta: { title: '任务模板' }
      },
      {
        path: 'family',
        name: 'family',
        component: () => import('../views/FamilyManage.vue'),
        meta: { title: '家长管理' }
      },
      {
        path: 'medal',
        name: 'medal',
        component: () => import('../views/MedalSystem.vue'),
        meta: { title: '勋章系统' }
      },
      {
        path: 'batch',
        name: 'batch',
        component: () => import('../views/BatchTask.vue'),
        meta: { title: '批量任务' }
      },
      {
        path: 'class',
        name: 'class',
        component: () => import('../views/ClassManage.vue'),
        meta: { title: '班级管理' }
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('../views/UserProfile.vue'),
        meta: { title: '个人中心' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')

  // 已登录状态下访问登录/注册页，直接回到看板
  if (token && to.meta.public) {
    return '/dashboard'
  }

  // 未登录访问受保护页面，跳转登录并记录来源
  if (!to.meta.public && !token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  return true
})

router.afterEach((to) => {
  const base = '家校任务系统'
  document.title = to.meta.title ? `${to.meta.title} · ${base}` : base
})

export default router
