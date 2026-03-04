(function () {
  // 防止重复注入
  if (window.__xhr_intercepted) {
    return;
  }
  window.__xhr_intercepted = true;


  // 修改URL查询参数的辅助函数
  function modifyUrlQuery(originalUrl, testReportNo) {
    try {
      const url = new URL(originalUrl, window.location.origin);

      url.searchParams.set('testReportNo', testReportNo);

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
      if (!originalUrl.includes('/rest/inspect/batterytest/query?')) {
        return originalXHROpen.apply(this, arguments);
      }

      const testReportNo = $('#testReportNo').val();
      if (!testReportNo) {
        return originalXHROpen.apply(this, arguments);
      }
      console.log(`[Injected] Intercepted XHR: ${method} ${originalUrl}, testReportNo=${testReportNo}`);
      const modifiedUrl = modifyUrlQuery(originalUrl, testReportNo);

      this._intercepted_method = method;
      this._intercepted_url = modifiedUrl;

      // 使用修改后的URL
      arguments[1] = modifiedUrl;
      return originalXHROpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.__intercepted = true;
  }
})();