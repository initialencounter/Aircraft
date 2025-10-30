import { sleep, validateFormat } from '../share/utils'

export default defineContentScript({
  runAt: 'document_end',
  matches: [
    'https://*/document*',
    'https://*/page/html/*',
    'https://*/inspect/batterytest/query/main',
    'https://*/flow/inspect/inspect/main',
    'https://*/sales/entrust/list',
    'https://*/project/main',
    'https://*/sales/apply/main',
    'https://*/inspect/query/main',
    'https://*/flow/inspect/experiment/main',
    'https://*/flow/inspect/experiment/main',
    'https://*/flow/inspect/assign/main',
    'https://*/inspect/batterytest/query/main',
    'https://*/samples',
    'https://*/report/reports',
    'https://*/report/ereports',
    'https://*/report/cqpush/main',
    'https://*/bill/gathering',
    'https://*/bill/receivable',
    'https://*/bill/receivable/summary',
    'https://*/bill/bills',
  ],
  allFrames: true,
  async main() {
    await entrypoint()
  },
})

async function entrypoint() {
  await sleep(400)

  chrome.storage.local.get(['openInNewTab'], async (localConfig) => {
    if (localConfig.openInNewTab === true) {
      setupOpenInNewTab()
    }
  })

  function setupOpenInNewTab() {
    setInterval(insertOpenInNewTabOnListOptimized, 200)
    insertOpenInNewTabOnListOptimized()
  }

  function insertOpenInNewTabOnListOptimized() {
    // const tableBody = document.querySelector("body > div.panel.easyui-fluid > div.easyui-panel.panel-body.panel-noscroll > div > div > div.datagrid-view > div.datagrid-view2 > div.datagrid-body > table > tbody");

    // if (!tableBody) return;

    // // 使用更具体的选择器直接获取所有目标链接
    // const links = tableBody.querySelectorAll('td:first-child > div > a');

    // links.forEach(link => {
    //   insertOpenInNewTab(link as HTMLAnchorElement);
    // });
    const anchors = getAllAnchorElements(3)
    anchors.forEach(anchor => {
      if (anchor.innerHTML.length === 17 && validateFormat(anchor.innerHTML)) {
        insertOpenInNewTab(anchor)
      }
    })
  }


  function insertOpenInNewTab(element: HTMLAnchorElement) {
    element.target = '_blank'
    element.rel = 'noopener noreferrer'
  }

  /**
 * 获取页面中所有a标签，包括iframe中的（递归三层）
 * @param {number} maxDepth - 最大递归深度，默认为3
 * @returns {HTMLAnchorElement[]} 所有a标签的数组
 */
  function getAllAnchorElements(maxDepth: number = 3): HTMLAnchorElement[] {
    const allAnchors: HTMLAnchorElement[] = [];

    /**
     * 递归获取iframe中的a标签
     * @param document - 当前文档对象
     * @param currentDepth - 当前递归深度
     */
    function collectAnchorsFromDocument(document: Document, currentDepth: number): void {
      try {
        // 获取当前文档中的所有a标签
        const anchors = document.querySelectorAll('a');
        allAnchors.push(...Array.from(anchors));

        // 如果达到最大深度，停止递归
        if (currentDepth >= maxDepth) {
          return;
        }

        // 获取当前文档中的所有iframe
        const iframes = document.querySelectorAll('iframe');

        iframes.forEach(iframe => {
          try {
            // 尝试访问iframe的内容文档
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

            if (iframeDoc && iframeDoc.readyState === 'complete') {
              // 递归处理iframe内容
              collectAnchorsFromDocument(iframeDoc, currentDepth + 1);
            } else {
              // 如果iframe未加载完成，添加加载事件监听
              iframe.addEventListener('load', () => {
                try {
                  const loadedIframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                  if (loadedIframeDoc) {
                    collectAnchorsFromDocument(loadedIframeDoc, currentDepth + 1);
                  }
                } catch (error) {
                  console.warn('无法访问已加载的iframe内容:', error);
                }
              });
            }
          } catch (error) {
            console.warn('无法访问iframe内容（同源策略限制）:', error);
          }
        });
      } catch (error) {
        console.error('在收集锚点标签时发生错误:', error);
      }
    }

    // 从主文档开始收集
    collectAnchorsFromDocument(window.document, 0);

    return allAnchors;
  }
}
