declare global {
  interface Window {
    __jquery_intercepted?: boolean;
    showInfoBox(content: string): void;
  }
  interface XMLHttpRequest {
    __intercepted?: boolean;
    _should_intercept_response?: boolean;
    _intercepted_method?: string;
    _intercepted_url?: string;
    _response_intercepted?: boolean;
  }
  interface JQuery {
    form: (action: string, data: any) => void;
    datebox: (action: string, data: any) => void;
    combobox: (action: string, data: any) => void;
    combogrid: (action: string, data: any) => void;
    combo: (action: string, data: any) => void;
    textbox: (action: string, data: any) => void;
  }
}

export default defineUnlistedScript(() => {
  if (window.__jquery_intercepted) {
    return;
  }
  window.__jquery_intercepted = true;

  // ============================================================
  // 1. 消息监听：接收来自 content script 的 jQuery 操作指令
  //    (参考 fillSummary.content.ts 的 jQuerySetDateBox 模式)
  // ============================================================

  window.addEventListener('message', function (event) {
    if (event.source != window) return;

    if (event.data.type === 'JQUERY_FOCUS') {
      const selector = event.data.selector;
      $(selector).focus();
    };

    if (event.data.type === 'SHOW_INFO_BOX') {
      const content = event.data.payload;
      window.showInfoBox(content);
    }

    if (event.data.type === 'JQUERY_SET_DATEBOX') {
      const selector = event.data.selector;
      const date = event.data.payload;
      $(selector).datebox('setValue', date);
    }

    if (event.data.type === 'JQUERY_SET_COMBOBOX') {
      const selector = event.data.selector;
      const data = event.data.payload;
      console.log(`[JQuery Hook] Setting combobox ${selector} value to:`, data);
      $(selector).combobox('setValue', data);
    }

    if (event.data.type === 'JQUERY_SET_TEXTBOX') {
      const selector = event.data.selector;
      const data = event.data.payload;
      $(selector).textbox('setValue', data);
    }
  });

  // ============================================================
  // 2. EasyUI combo 事件拦截：主动派发原生 input 事件
  //    使 content script 的 watchInput 能监听到 EasyUI 组件的变化
  // ============================================================

  /**
   * 等待 EasyUI 加载完成
   */
  function waitForEasyUI(callback: () => void, maxAttempts = 500) {
    let attempts = 0;
    const check = setInterval(() => {
      attempts++;
      if (window.$ && window.$.fn && window.$.fn.combo) {
        clearInterval(check);
        callback();
      } else if (attempts >= maxAttempts) {
        clearInterval(check);
      }
    }, 10);
  }

  /**
   * 防重入集合：防止派发事件后，页面原有 input 处理器回调 EasyUI 方法
   * 导致 setValue → dispatch → input handler → setValue → ... 无限循环。
   */
  const _dispatching = new WeakSet<HTMLElement>();

  /**
   * 向 combo 组件关联的 textbox 派发原生 input 事件。
   *
   * 安全说明：
   * 1. 派发的是标准 input 事件（bubbles: true），与用户键盘输入产生的事件同类型
   * 2. 事件对象的 value 已是 EasyUI 设置后的正确值，页面原有 handler 读到的是正确数据
   * 3. 防重入守卫确保不会因页面 handler 回调 EasyUI 方法而产生死循环
   * 4. 不影响 EasyUI 初始化流程——初始化调用 typeof options === 'object' 直接透传
   */
  function dispatchNativeInputEvent(el: HTMLElement) {
    if (_dispatching.has(el)) return;
    _dispatching.add(el);
    try {
      const $el: any = $(el);
      const textbox = $el.combo('textbox');
      if (textbox && textbox.length) {
        const event = new Event('input', { bubbles: true, cancelable: false });
        textbox[0].dispatchEvent(event);
      }
    } catch (_e) {
      // 组件可能尚未初始化，静默忽略
    } finally {
      _dispatching.delete(el);
    }
  }

  /**
   * 拦截 combo / combobox / combogrid 的 setValue / setText 方法，
   * 主动派发原生 input 事件。
   *
   * 原理: EasyUI 通过 jQuery.trigger('change') 不一定会派发原生事件，
   * 这里在每次 setValue/setText 调用后，直接在 textbox 上派发原生 input 事件。
   * content script 通过 document.addEventListener('input', ...) 即可捕获。
   */
  function hookEasyUIComboEvents() {
    const namespaces = ['combo', 'combobox', 'combogrid'];
    // 只拦截 setText：EasyUI 的 setValue 内部会调用 setText，
    // 同时拦截两者会导致一次操作派发 2-3 次重复的 input 事件
    const methodNames = ['setText'];

    namespaces.forEach((ns) => {
      const origFn = (window.$.fn as any)[ns] as Function;
      if (!origFn) return;

      const wrappedFn = function (this: any, options: any) {
        // 方法调用（如 $(el).combo('setValue', value)）
        if (typeof options === 'string') {
          const result = origFn.apply(this, arguments as any);
          if (methodNames.includes(options)) {
            (this as any).each(function (this: HTMLElement) {
              dispatchNativeInputEvent(this);
            });
          }
          return result;
        }
        // 初始化调用（如 $(el).combo({...options})）——直接透传
        return origFn.apply(this, arguments as any);
      };

      // 复制原始函数的静态属性（methods、defaults 等），保证 EasyUI 内部正常工作
      Object.keys(origFn).forEach((key) => {
        (wrappedFn as any)[key] = (origFn as any)[key];
      });

      (window.$.fn as any)[ns] = wrappedFn;
    });

    console.log('[JQuery Hook] EasyUI combo events intercepted (combo/combobox/combogrid)');
  }

  // 等 EasyUI 加载后安装钩子
  waitForEasyUI(hookEasyUIComboEvents);
})
