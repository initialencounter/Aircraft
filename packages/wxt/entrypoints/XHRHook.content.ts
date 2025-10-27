import { sleep } from '../share/utils'

export default defineContentScript({
  runAt: 'document_start',
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
  try {
    const localConfig = await chrome.storage.local.get(['hundredRowsResult'])
    if (localConfig?.hundredRowsResult === false) {
      console.log('[XHR Hook] hundredRowsResult is disabled, skipping injection.');
      return;
    }
    injectInterceptScript();
    modifyHTMLTableRows();
  } catch (error) {
    console.error('[XHR Hook] Error in entrypoint:', error);
  }
}

function injectInterceptScript() {
  // 检查是否已经注入过
  if ((window as any).__xhr_intercepted) {
    return;
  }

  const script = document.createElement('script');
  script.textContent = `
    (function() {
      // 防止重复注入
      if (window.__xhr_intercepted) {
        return;
      }
      window.__xhr_intercepted = true;
      

      // 修改URL查询参数的辅助函数
      function modifyUrlQuery(originalUrl) {
        try {
          const url = new URL(originalUrl, window.location.origin);

          url.searchParams.set('rows', '100');

          return url.toString();
        } catch (error) {
          console.log('[Injected] Failed to modify URL query:', originalUrl, error);
          return originalUrl;
        }
      }

      // 拦截 XMLHttpRequest
      if (window.XMLHttpRequest && !window.XMLHttpRequest.prototype.__intercepted) {
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
          const originalUrl = typeof url === 'string' ? url : url.toString();
          const modifiedUrl = modifyUrlQuery(originalUrl);
          
          this._intercepted_method = method;
          this._intercepted_url = modifiedUrl;
          
          // 使用修改后的URL
          arguments[1] = modifiedUrl;
          return originalXHROpen.apply(this, arguments);
        };
        
        XMLHttpRequest.prototype.send = function(body) {
          const xhr = this;
          console.log('[Injected XHR] Sending:', xhr._intercepted_method, xhr._intercepted_url, body);
          
          // 创建新的事件监听器
          const originalOnReadyStateChange = xhr.onreadystatechange;
          xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
              console.log('[Injected XHR] Completed:', xhr.status, xhr._intercepted_url, {
                status: xhr.status,
                statusText: xhr.statusText,
                response: xhr.response,
                responseText: xhr.responseText
              });
            }
            if (originalOnReadyStateChange) {
              originalOnReadyStateChange.apply(xhr, arguments);
            }
          };
          
          return originalXHRSend.apply(this, arguments);
        };
        
        XMLHttpRequest.prototype.__intercepted = true;
      }
    })();
  `;

  try {
    // 尽早注入脚本
    const target = document.head || document.documentElement || document;
    target.appendChild(script);
    script.remove(); // 注入后移除脚本元素
    (window as any).__xhr_intercepted = true;
  } catch (e) {
    console.error('[XHR Hook] Failed to inject script:', e);
  }
}

async function modifyHTMLTableRows() {
  await sleep(400); // 等待页面加载完成
  const hundredRows = document.querySelector('.pagination-page-list') as HTMLOptionElement;
  if (hundredRows) {
    const span = document.createElement('span');
    span.innerText = '100条/页';
    const td = document.createElement('td');
    td.appendChild(span);
    hundredRows?.parentElement?.parentElement?.children[0].replaceWith(td);
  }
}