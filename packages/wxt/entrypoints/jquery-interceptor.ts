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
   * 拦截 combo / combobox / combogrid 的 setValue / setText / clear 方法，
   * 主动派发原生 input 事件。
   *
   * 为什么三者都需要拦截：
   * 1. setValue: 应用代码最常用的设值方法。EasyUI 内部 setValue → setText 的调用链
   *    走的是 methods 对象直接调用，不会再次经过 $.fn.combo，因此不会产生重复事件
   * 2. setText: 直接设置显示文本的方法（某些场景单独调用）
   * 3. clear: 清除按钮可能调用 $(el).combo('clear')，该方法可能绕过 setValue/setText
   *    直接操作内部状态或调用 textbox('clear')
   * 4. textbox 命名空间: clear 按钮可能直接操作 $(textbox).textbox('clear') 或
   *    $(textbox).textbox('setValue')，绕过 combo 层。仅当 textbox 属于 combo 组件生效
   *
   * 防重入: _dispatching WeakSet 确保同一元素在同步调用栈内只派发一次事件
   */
  function hookEasyUIComboEvents() {
    const comboNS = ['combo', 'combobox', 'combogrid'];
    const comboMethodNames = ['setValue', 'setText', 'clear'];

    comboNS.forEach((ns) => {
      const origFn = (window.$.fn as any)[ns] as Function;
      if (!origFn) return;

      const wrappedFn = function (this: any, options: any) {
        if (typeof options === 'string') {
          const result = origFn.apply(this, arguments as any);
          if (comboMethodNames.includes(options)) {
            (this as any).each(function (this: HTMLElement) {
              dispatchNativeInputEvent(this);
            });
          }
          return result;
        }
        // 初始化调用——直接透传
        return origFn.apply(this, arguments as any);
      };

      // 复制静态属性（methods、defaults 等）
      Object.keys(origFn).forEach((key) => {
        (wrappedFn as any)[key] = (origFn as any)[key];
      });

      (window.$.fn as any)[ns] = wrappedFn;
    });

    // 同时拦截 textbox 的 clear / setValue（清除按钮可能绕过 combo 直接操作 textbox）
    const textboxOrig = (window.$.fn as any)['textbox'] as Function;
    if (textboxOrig) {
      const textboxMethodNames = ['clear', 'setValue'];

      const wrappedTextbox = function (this: any, options: any) {
        if (typeof options === 'string') {
          const result = textboxOrig.apply(this, arguments as any);
          if (textboxMethodNames.includes(options)) {
            (this as any).each(function (this: HTMLElement) {
              // 仅当该 textbox 属于 combo 组件时才派发事件
              if ($(this).closest('.combo, .combo-f, .combobox-f, .combogrid-f').length) {
                // 直接在此 textbox 上派发 input 事件
                try {
                  this.dispatchEvent(new Event('input', { bubbles: true, cancelable: false }));
                } catch (_e) { /* ignore */ }
              }
            });
          }
          return result;
        }
        return textboxOrig.apply(this, arguments as any);
      };

      Object.keys(textboxOrig).forEach((key) => {
        (wrappedTextbox as any)[key] = (textboxOrig as any)[key];
      });

      (window.$.fn as any)['textbox'] = wrappedTextbox;
    }

    console.log('[JQuery Hook] EasyUI combo events intercepted (combo/combobox/combogrid/textbox)');
  }

  // 等 EasyUI 加载后安装钩子
  waitForEasyUI(hookEasyUIComboEvents);
})
