import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// @ts-ignore
import form from 'schemastery-vue'
import { createI18n } from 'vue-i18n'
// @ts-ignore
import Markdown from 'markdown-vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import './assets/css/main.scss'
import router from './router'

export function apply() {
  const i18n = createI18n({})
  const app = createApp(App)

  app.use(ElementPlus)
  app.use(i18n)
  // @ts-ignore
  app.use(form)
  app.use(router)
  app.use(createPinia())
  app.component('k-markdown', Markdown)
  app.mount('#app').$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })
}
