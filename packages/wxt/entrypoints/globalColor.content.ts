import { getLocalConfig, sleep } from '../share/utils'

export default defineContentScript({
  runAt: 'document_end',
  matches: [
    'https://*/',
    'https://*/rek/inspect*',
    'https://*/aek/inspect*',
    'https://*/sek/inspect*',
    'https://*/pek/inspect*',
  ],
  allFrames: true,
  async main() {
    await entrypoint()
  },
})

async function entrypoint() {
  console.log('全局脚本启动')
  await sleep(500)
  const localConfig = await getLocalConfig()
  
  // 缓存已处理的元素，避免重复处理
  const processedElements = new WeakSet<Element>()
  const processedProjectNoValues = new Map<string, string>() // 缓存项目编号对应的颜色
  let lastProcessedCount = 0
  
  // 防抖函数，避免频繁处理
  let processTimeout: number | null = null
  const debouncedProcess = () => {
    if (processTimeout) {
      clearTimeout(processTimeout)
    }
    processTimeout = window.setTimeout(() => {
      processElements()
      processTimeout = null
    }, 100) // 100ms防抖
  }
  
  // 使用MutationObserver监听DOM变化，而不是定时轮询
  const observer = new MutationObserver((mutations) => {
    let hasRelevantChanges = false
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        hasRelevantChanges = true
      }
      if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
        hasRelevantChanges = true
      }
    })
    
    if (hasRelevantChanges) {
      debouncedProcess()
    }
  })
  
  // 开始观察DOM变化
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['value']
  })
  
  // 初始处理
  processElements()
  
  // 降低频率的兜底检查（防止MutationObserver遗漏）
  const intervalId = setInterval(() => {
    // 定期清理缓存，防止内存泄漏
    if (processedProjectNoValues.size > 1000) {
      processedProjectNoValues.clear()
      console.log('清理项目编号颜色缓存')
    }
    
    processElements()
  }, 500)
  
  // 页面卸载时清理
  window.addEventListener('beforeunload', () => {
    observer.disconnect()
    clearInterval(intervalId)
    if (processTimeout) {
      clearTimeout(processTimeout)
    }
  })
  
  function processElements() {
    // 处理projectNo元素（优化：缓存颜色值）
    const projectNoElement = document.querySelector('#projectNo') as HTMLInputElement
    if (projectNoElement) {
      const value = projectNoElement.value
      let color = processedProjectNoValues.get(value)
      
      if (color === undefined) {
        color = getProjectNoColor(value) ?? ''
        processedProjectNoValues.set(value, color)
      }
      
      if (color && projectNoElement.style.color !== color) {
        projectNoElement.style.color = color
      }
    }
    
    // 使用更精确的选择器，而不是查询所有元素
    const targetElements = getTargetElements()
    
    // 批量处理元素，减少DOM操作
    const elementsToProcess: Array<{ element: Element; color: string }> = []
    
    for (const element of targetElements) {
      if (processedElements.has(element)) continue
      
      const innerHTML = element.innerHTML
      if (innerHTML.length === 17 && innerHTML.includes('EK')) {
        let color = processedProjectNoValues.get(innerHTML)
        
        if (color === undefined) {
          color = getProjectNoColor(innerHTML) ?? ''
          processedProjectNoValues.set(innerHTML, color)
        }
        
        if (color) {
          elementsToProcess.push({ element, color })
          processedElements.add(element)
        }
      }
    }
    
    // 批量应用样式
    elementsToProcess.forEach(({ element, color }) => {
      ;(element as HTMLElement).style.color = color
    })
  }

  function getTargetElements(): Element[] {
    const elements: Element[] = []
    
    // 使用更精确的选择器，避免查询所有元素
    // 优先查询最可能包含EK的元素类型
    const prioritySelectors = [
      'a[href*="EK"]',    // 直接包含EK的链接
      '[title*="EK"]',    // 包含EK的title属性
      'a',                  // 所有链接
      'td',                 // 表格单元格（常见）
      'span'                // 文本容器（常见）
    ]
    
    const fallbackSelectors = [
      'div',         // 通用容器
      'th',          // 表格头
      'p'            // 段落
    ]
    
    // 先查询优先选择器
    for (const selector of prioritySelectors) {
      try {
        const foundElements = document.querySelectorAll(selector)
        elements.push(...foundElements)
      } catch (error) {
        console.warn(`优先选择器 ${selector} 查询失败:`, error)
      }
    }
    
    // 如果找到的元素少于预期，再查询其他选择器
    if (elements.length < 50) {
      for (const selector of fallbackSelectors) {
        try {
          const foundElements = document.querySelectorAll(selector)
          elements.push(...foundElements)
        } catch (error) {
          console.warn(`备用选择器 ${selector} 查询失败:`, error)
        }
      }
    }
    
    // 获取iframe中的元素（优化版）
    const iframeElements = getElementsFromIframes()
    elements.push(...iframeElements)
    
    return elements
  }
  
  function getElementsFromIframes(): Element[] {
    const elements: Element[] = []
    const iframes = document.querySelectorAll('iframe')
    
    iframes.forEach(iframe => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        if (!iframeDoc) return
        
        // 在iframe中也使用精确选择器
        const selectors = ['a', 'span', 'div', 'td', 'th', 'p']
        for (const selector of selectors) {
          const iframeElements = iframeDoc.querySelectorAll(selector)
          elements.push(...iframeElements)
        }
        
        // 递归处理嵌套iframe（深度限制）
        const nestedElements = getElementsFromIframeDoc(iframeDoc, 1)
        elements.push(...nestedElements)
      } catch (error) {
        console.warn('无法访问iframe内容:', iframe.src, error)
      }
    })
    
    return elements
  }
  
  function getElementsFromIframeDoc(iframeDoc: Document, depth: number): Element[] {
    if (depth > 3) return [] // 限制递归深度防止性能问题
    
    const elements: Element[] = []
    const nestedIframes = iframeDoc.querySelectorAll('iframe')

    nestedIframes.forEach((nestedIframe: any) => {
      try {
        const nestedDoc = nestedIframe.contentDocument || nestedIframe?.contentWindow?.document
        if (!nestedDoc) return
        
        // 使用精确选择器
        const selectors = ['a', 'span', 'div', 'td', 'th', 'p']
        for (const selector of selectors) {
          const nestedElements = nestedDoc.querySelectorAll(selector)
          elements.push(...nestedElements)
        }

        // 继续递归（增加深度）
        const deeperElements = getElementsFromIframeDoc(nestedDoc, depth + 1)
        elements.push(...deeperElements)
      } catch (error) {
        console.warn('无法访问嵌套iframe内容:', error)
      }
    })

    return elements
  }

  function getProjectNoColor(projectNo: string) {
    if (!projectNo) return ''
    if (projectNo.startsWith('P')) {
      return localConfig.pekProjectNoColor
    } else if (projectNo.startsWith('S')) {
      return localConfig.sekProjectNoColor
    } else if (projectNo.startsWith('A')) {
      return localConfig.aekProjectNoColor
    } else {
      return localConfig.rekProjectNoColor
    }
  }
}
