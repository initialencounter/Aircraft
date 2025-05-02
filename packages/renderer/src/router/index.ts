import { createRouter, createWebHashHistory } from 'vue-router'

import { useMaskStore } from '../stores/mask'
import Home from '../views/Home.vue'
import Schema from '../components/Schema.vue'
import SchemaBase from '../components/SchemaBase.vue'
import SchemaHotkey from '../components/SchemaHotkey.vue'
import Logs from '../views/Logs.vue'
import Blake2 from '../views/Blake2.vue'
//@ts-ignore
import Stack from '../views/Stack.vue'
import SchemaLLM from '../components/SchemaLLM.vue'
import PdfParse from '../views/PdfParse.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home,
    },
    {
      path: '/schema',
      name: 'Schema',
      component: Schema,
    },
    {
      path: '/schema_base',
      name: 'SchemaBase',
      component: SchemaBase,
    },
    {
      path: '/schema_hotkey',
      name: 'SchemaHotkey',
      component: SchemaHotkey,
    },
    {
      path: '/logs',
      name: 'Logs',
      component: Logs,
    },
    {
      path: '/blake2',
      name: 'Blake2',
      component: Blake2,
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
      path: '/llm_config',
      name: 'LLM Config',
      component: SchemaLLM,
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
