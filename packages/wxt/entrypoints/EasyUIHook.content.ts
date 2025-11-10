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
    chrome.storage.local.get(['hundredRowsResult'], (localConfig) => {
      if (localConfig?.hundredRowsResult === false) {
        console.log('[EasyUI] hundredRowsResult is disabled, skipping injection.');
        return;
      }
      injectEasyUIInterceptor(); // 注入EasyUI拦截器
    })
  } catch (error) {
    console.error('[EasyUI] Error in entrypoint:', error);
  }
}

function injectEasyUIInterceptor() {
  // 检查是否已经注入过
  if ((window as any).__easyui_intercepted) {
    return;
  }

  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('easyui-interceptor.js');
  script.onload = () => {
    (window as any).__easyui_intercepted = true;
    script.remove();
  };
  script.onerror = (e) => {
    console.error('[EasyUI Hook] Failed to load interceptor script:', e);
  };

  try {
    const target = document.head || document.documentElement || document;
    target.appendChild(script);
  } catch (e) {
    console.error('[EasyUI Hook] Failed to inject script:', e);
  }
}
