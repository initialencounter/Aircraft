import { sleep } from '../share/utils'

interface CustomXMLHttpRequest extends XMLHttpRequest {
  _requestMethod?: string;
  _requestUrl?: string;
}

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
  const localConfig = await chrome.storage.local.get(['openInNewTab'])
  await sleep(400)
  if (localConfig.openInNewTab === true) {
    // 扩展 XMLHttpRequest 接口以添加自定义属性


    // 保存原始方法
    const originalXHROpen: typeof XMLHttpRequest.prototype.open = XMLHttpRequest.prototype.open;
    const originalXRHSend: typeof XMLHttpRequest.prototype.send = XMLHttpRequest.prototype.send;

    // 覆写 open 方法，记录请求信息
    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async: boolean = true,
      user?: string,
      password?: string
    ): void {
      const customThis = this as CustomXMLHttpRequest;
      customThis._requestMethod = method;
      customThis._requestUrl = typeof url === 'string' ? url : url.toString();

      console.log(`拦截到XHR开放: ${method} ${customThis._requestUrl}`);
      return originalXHROpen.apply(customThis, arguments as any);
    };

    // 覆写 send 方法，添加事件监听
    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null): void {
      const customThis = this as CustomXMLHttpRequest;

      console.log(`拦截到XHR发送: ${customThis._requestMethod} ${customThis._requestUrl}`, body);

      // 监听请求完成事件
      customThis.addEventListener('readystatechange', function () {
        if (this.readyState === 4) {
          console.log(`XHR请求完成，状态: ${this.status}`, this.response);
        }
      });

      return originalXRHSend.apply(customThis, arguments as any);
    };
  }


}
