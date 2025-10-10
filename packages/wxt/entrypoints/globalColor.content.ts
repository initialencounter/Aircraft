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
  // 获取页面所有元素
  setInterval(() => {
    const projectNoElements = document.querySelector('#projectNo') as HTMLInputElement
    if (projectNoElements) {
      const color = getProjectNoColor(projectNoElements.value) ?? '';
      projectNoElements.style.color = color
    }
    const allElements = getAllElementsIncludingIframes();
    // 遍历所有元素
    for (const element of allElements) {
      if (element.innerHTML.length !== 17) continue;
      if (!element.innerHTML.includes('EKGZ')) continue;
      console.log('找到项目编号元素:', element.innerHTML);
      const color = getProjectNoColor(element.innerHTML) ?? '';
      (element as HTMLAnchorElement).style.color = color
    }

  }, 200);

  function getAllElementsIncludingIframes() {
    const allElements = [];

    // 获取主文档中的所有元素
    const mainDocElements = document.querySelectorAll('*');
    allElements.push(...mainDocElements);

    // 获取所有iframe
    const iframes = document.querySelectorAll('iframe');

    iframes.forEach(iframe => {
      try {
        // 确保iframe已加载且同源
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        const iframeElements = iframeDoc?.querySelectorAll('*');
        allElements.push(...iframeElements ?? []);

        // 递归获取iframe中的iframe
        const nestedElements = getElementsFromIframeDoc(iframeDoc);
        allElements.push(...nestedElements);
      } catch (error) {
        console.warn('无法访问iframe内容:', iframe.src, error);
      }
    });

    return allElements;
  }
  function getElementsFromIframeDoc(iframeDoc: any) {
    const elements: any = [];
    const nestedIframes = iframeDoc.querySelectorAll('iframe');

    nestedIframes.forEach((nestedIframe: any) => {
      try {
        const nestedDoc = nestedIframe.contentDocument || nestedIframe?.contentWindow?.document;
        const nestedElements = nestedDoc?.querySelectorAll('*');
        elements.push(...nestedElements ?? []);

        // 继续递归
        const deeperElements = getElementsFromIframeDoc(nestedDoc);
        elements.push(...deeperElements);
      } catch (error) {
        console.warn('无法访问嵌套iframe内容:', error);
      }
    });

    return elements;
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
