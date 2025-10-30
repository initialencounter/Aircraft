(function () {
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

    XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
      const originalUrl = typeof url === 'string' ? url : url.toString();
      const modifiedUrl = modifyUrlQuery(originalUrl);

      this._intercepted_method = method;
      this._intercepted_url = modifiedUrl;

      // 使用修改后的URL
      arguments[1] = modifiedUrl;
      return originalXHROpen.apply(this, arguments);
    };

    // const originalXHRSend = XMLHttpRequest.prototype.send;

    // XMLHttpRequest.prototype.send = function (body) {
    //   const xhr = this;
    //   console.log('[Injected XHR] Sending:', xhr._intercepted_method, xhr._intercepted_url, body);

    //   // 创建新的事件监听器
    //   const originalOnReadyStateChange = xhr.onreadystatechange;
    //   xhr.onreadystatechange = function () {
    //     if (xhr.readyState === 4) {
    //       console.log('[Injected XHR] Completed:', xhr.status, xhr._intercepted_url, {
    //         status: xhr.status,
    //         statusText: xhr.statusText,
    //         response: xhr.response,
    //         responseText: xhr.responseText
    //       });
    //     }
    //     if (originalOnReadyStateChange) {
    //       originalOnReadyStateChange.apply(xhr, arguments);
    //     }
    //   };

    //   return originalXHRSend.apply(this, arguments);
    // };

    XMLHttpRequest.prototype.__intercepted = true;
  }
})();