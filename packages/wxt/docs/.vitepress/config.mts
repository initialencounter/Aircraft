import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Lims',
  description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: '快速开始', link: '/quick_start' },
    ],

    sidebar: [
      {
        text: '使用方法',
        items: [
          { text: '快速开始', link: '/quick_start' },
          { text: '功能介绍', link: '/about' },
          { text: '问题反馈', link: '/issue' },
          { text: '更新日志', link: '/changelog' },
          { text: '验证规则', link: '/rule' },
          { text: '验证概要', link: '/attachment' },
        ],
      },
    ],

    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/initialencounter/chrome-extensions',
      },
    ],
  },
  head: [['link', { rel: 'icon', href: '/logo.png' }]],
})
