import { createRouter, createWebHashHistory } from 'vue-router'

import { useMaskStore } from '../stores/mask'
import Home from '../views/Home.vue'
import Schema from '../components/Schema.vue'
import Logs from '../views/Logs.vue'
import Md5Checker from '../views/Md5checker.vue'
//@ts-ignore
import Stack from '../views/Stack.vue'
import PdfParse from '../views/PdfParse.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/home',
      name: 'Home',
      component: Home,
    },
    {
      path: '/schema',
      name: 'Schema',
      component: Schema,
    },
    {
      path: '/logs',
      name: 'Logs',
      component: Logs,
    },
    {
      path: '/blake2',
      name: 'Md5Checker',
      component: Md5Checker,
    },
    {
      path: '/',
      name: 'Stack',
      component: Stack,
    },
    {
      path: '/summary_parse',
      name: 'Pdf Parse',
      component: PdfParse,
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const maskStore = useMaskStore()

  if (to.meta.requiresUnlock && !maskStore.isUnlocked) {
    next('/')
  } else {
    next()
  }
})

export default router
