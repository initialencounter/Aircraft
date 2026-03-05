import {
  checkDate,
  getLocalConfig,
  parseDate,
  sleep,
} from '../share/utils'

export default defineContentScript({
  runAt: 'document_end',
  matches: ['https://*/inspect/query/main'],
  allFrames: true,
  async main() {
    await entrypoint()
  },
})

async function entrypoint() {
  const localConfig = await getLocalConfig()
  await sleep(400)
  if (localConfig.enableSetQueryProjectNo === false) {
    console.log('未启用设置查询项目编号，退出脚本')
    return
  }
  injectJQueryInterceptor()
  console.log('检验单查询脚本运行中...')

  document.addEventListener('input', function (event: Event) {
    if (!document.hasFocus()) return
    const target = event.target as HTMLInputElement
    const targetId = target.parentElement?.parentElement?.children[0].id
    if (targetId === 'projectNo') {
      debounce(() => { handleQueryBtnClick(target.value) }, 100)()
    }
  }, true) // 使用捕获阶段

  async function handleQueryBtnClick(projectNo: string) {
    jQuerySetComboBox('#category', '');
    await sleep(100)

    const newProjectNo = removeNonAlphanumeric(projectNo)
    if (!projectNo) {
      return
    }

    if (newProjectNo !== projectNo) {
      jQuerySetTextBox('#projectNo', newProjectNo)
      projectNo = newProjectNo
    }

    const date = checkDate(parseDate(projectNo))
    // 检验日期
    if (!date) return
    const startDate = new Date(date[0])
    startDate.setDate(startDate.getDate() - 30)
    const endDate = new Date(date[0])
    endDate.setDate(endDate.getDate() + 30)
    jQuerySetDateBox('#startDate', startDate.toISOString().slice(0, 10))
    jQuerySetDateBox('#endDate', endDate.toISOString().slice(0, 10))

    let systemId = ''
    if (projectNo.indexOf('SEK') !== -1) {
      systemId = 'sek'
    }
    if (projectNo.indexOf('PEK') !== -1) {
      systemId = 'pek'
    }
    if (projectNo.indexOf('AEK') !== -1) {
      systemId = 'aek'
    }
    if (projectNo.indexOf('REK') !== -1) {
      systemId = 'rek'
    }
    jQuerySetComboBox('#systemId', systemId);
  }

  function removeNonAlphanumeric(str: string): string {
    return str.replace(/[^a-zA-Z0-9]/g, '');
  }

  // 防抖函数
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func.apply(null, args), delay)
    }
  }


  function injectJQueryInterceptor() {
    // 检查是否已经注入过
    if ((window as any).__jquery_intercepted) {
      return;
    }

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('jquery-interceptor.js');
    script.onload = () => {
      (window as any).__jquery_intercepted = true;
      script.remove();
    };
    script.onerror = (e) => {
      console.error('[JQuery Hook] Failed to load interceptor script:', e);
    };

    try {
      const target = document.head || document.documentElement || document;
      target.appendChild(script);
    } catch (e) {
      console.error('[JQuery Hook] Failed to inject script:', e);
    }
  }

  function jQuerySetDateBox(selector: string, date: string) {
    window.postMessage({
      type: 'JQUERY_SET_DATEBOX',
      selector,
      payload: date,
    }, '*');
  }

  function jQuerySetComboBox(selector: string, data: string) {
    window.postMessage({
      type: 'JQUERY_SET_COMBOBOX',
      selector,
      payload: data,
    }, '*');
  }

  function jQuerySetTextBox(selector: string, data: string) {
    window.postMessage({
      type: 'JQUERY_SET_TEXTBOX',
      selector,
      payload: data,
    }, '*');
  }
}
