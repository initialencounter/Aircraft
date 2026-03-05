(function () {
  // 防止重复注入
  if (window.__xhr_intercepted) {
    return;
  }
  window.__xhr_intercepted = true;

  let __last_intercepted_batterytest_query_response = null;

  async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

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
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
      const originalUrl = typeof url === 'string' ? url : url.toString();
      if (!originalUrl.includes('/rest/inspect/batterytest/query?')) {
        return originalXHROpen.apply(this, arguments);
      }

      // URL 匹配则始终 hook 返回值
      this._should_intercept_response = true;

      const testReportNo = $('#qTestReportNo').val();
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

    XMLHttpRequest.prototype.send = function (body) {
      if (this._should_intercept_response) {
        const self = this;

        __last_intercepted_batterytest_query_response = null;
        // 包装 onreadystatechange
        const originalOnReadyStateChange = this.onreadystatechange;
        this.onreadystatechange = function (event) {
          if (self.readyState === 4) {
            interceptResponse(self);
          }
          if (originalOnReadyStateChange) {
            originalOnReadyStateChange.apply(self, arguments);
          }
        };

        // 包装 onload
        const originalOnLoad = this.onload;
        this.addEventListener('load', function () {
          interceptResponse(self);
          if (originalOnLoad) {
            originalOnLoad.apply(self, arguments);
          }
        });
      }
      return originalXHRSend.apply(this, arguments);
    };

    XMLHttpRequest.prototype.__intercepted = true;
  }

  // 拦截并可选修改响应体
  function interceptResponse(xhr) {
    if (xhr._response_intercepted) return;
    xhr._response_intercepted = true;

    try {
      const rawText = xhr.responseText;
      const data = JSON.parse(rawText);
      __last_intercepted_batterytest_query_response = data;
    } catch (e) {
      console.log('[Injected] Failed to read response:', e);
    }
  }

  let listenerAddedInterval = null;
  function importConsignorInfo() {
    const confirmImportButton = document.getElementById("assignSaveBtn")
    if (!confirmImportButton) return
    confirmImportButton.addEventListener('click', async () => {
      await sleep(300)
      const data = __last_intercepted_batterytest_query_response
      if (!data || !data.rows || data.rows.length === 0) {
        return
      }
      const consignorInfo = data.rows[0].consignorInfo || ''
      const consignorInput = document.getElementById("consignorInfo")
      if (consignorInput) {
        consignorInput.value = consignorInfo
      }
    })
    clearInterval(listenerAddedInterval)
  }
  listenerAddedInterval = setInterval(importConsignorInfo, 500)
})();