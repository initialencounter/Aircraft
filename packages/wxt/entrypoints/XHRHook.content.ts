import { sleep } from '../share/utils'

export default defineContentScript({
  runAt: 'document_start',
  matches: [
    'https://*/inspect/batterytest/query/main',
    'https://*/flow/inspect/assignexperiment/main',
    'https://*/flow/inspect/inspect/main',
    'https://*/flow/inspect/audit/main',
    'https://*/inspect/experiment/query/main',
    'https://*/report/adjust/edit/main',
    'https://*/report/adjust/reset/main',
    'https://*/customer/management',
    'https://*/reckoner/management',
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
  script.src = chrome.runtime.getURL('xhr-interceptor.js');
  script.onload = () => {
    (window as any).__xhr_intercepted = true;
    script.remove(); // 加载后移除脚本元素
  };
  script.onerror = (e) => {
    console.error('[XHR Hook] Failed to load interceptor script:', e);
  };

  try {
    // 尽早注入脚本
    const target = document.head || document.documentElement || document;
    target.appendChild(script);
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