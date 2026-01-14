import { createRouter, createWebHashHistory } from 'vue-router'

import Home from '../views/Home.vue'
import Schema from '../components/Schema.vue'
import Logs from '../views/Logs.vue'
import Md5Checker from '../views/Md5checker.vue'
//@ts-ignore
import Stack from '../views/Stack.vue'
import PdfParse from '../views/PdfParse.vue'
import SearchTNotes from '../components/SearchTNotes.vue'
import Clipkeeper from '../views/Clipkeeper.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/home',
    },
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
      path: '/md5',
      name: 'Md5Checker',
      component: Md5Checker,
    },
    {
      path: '/stack',
      name: 'Stack',
      component: Stack,
    },
    {
      path: '/summary_parse',
      name: 'Pdf Parse',
      component: PdfParse,
    },
    {
      path: '/searchTNotes',
      name: 'searchTNotes',
      component: SearchTNotes,
    },
    {
      path: '/clipkeeper',
      name: 'ClipKeeper',
      component: Clipkeeper,
    },
  ],
})

export default router
