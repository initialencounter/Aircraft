
declare global {
  interface Window {
    __xhr_intercepted?: boolean;
    __last_intercepted_batterytest_query_response?: any;
  }
  interface XMLHttpRequest {
    __intercepted?: boolean;
    _should_intercept_response?: boolean;
    _intercepted_method?: string;
    _intercepted_url?: string;
    _response_intercepted?: boolean;
  }
}

export interface QuerySummaryInfoResponse {
  rows: SummaryInfo[];
  total: number;
}

interface SummaryInfo {
  capacity?: string;
  classification?: string;
  cnName?: string;
  color?: string;
  consignor?: string;
  consignorInfo?: string;
  createdBy?: string;
  createdByName?: string;
  createdDate?: string;
  enName?: string;
  id?: string;
  issuedDate?: null;
  issuedStatus?: boolean;
  licontent?: string;
  manufacturer?: string;
  manufacturerInfo?: string;
  mass?: string;
  modifiedBy?: string;
  modifiedByName?: string;
  modifiedDate?: string;
  note?: string;
  projectId?: string;
  projectNo?: string;
  shape?: string;
  sn?: number;
  test1?: boolean;
  test2?: boolean;
  test3?: boolean;
  test4?: boolean;
  test5?: boolean;
  test6?: boolean;
  test7?: boolean;
  test8?: boolean;
  testDate?: string;
  testlab?: string;
  testlabInfo?: string;
  testManual?: string;
  testReportNo?: string;
  trademark?: string;
  type?: string;
  un38f?: boolean;
  un38g?: boolean;
  voltage?: string;
  watt?: string;
}


export default defineUnlistedScript(() => {
  // 防止重复注入
  if (window.__xhr_intercepted) {
    return;
  }
  window.__xhr_intercepted = true;

  let __last_intercepted_batterytest_query_response: QuerySummaryInfoResponse | null = null;

  async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // 修改URL查询参数的辅助函数
  function modifyUrlQuery(originalUrl: string, testReportNo: string): string {
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

    // @ts-ignore
    XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
      const originalUrl = typeof url === 'string' ? url : url.toString();
      if (!originalUrl.includes('/rest/inspect/batterytest/query?')) {
        // @ts-ignore
        return originalXHROpen.apply(this, arguments);
      }

      // URL 匹配则始终 hook 返回值
      this._should_intercept_response = true;

      const testReportNo = $('#qTestReportNo').val() as string;
      if (!testReportNo) {
        // @ts-ignore
        return originalXHROpen.apply(this, arguments);
      }
      console.log(`[Injected] Intercepted XHR: ${method} ${originalUrl}, testReportNo=${testReportNo}`);

      const modifiedUrl = modifyUrlQuery(originalUrl, testReportNo);

      this._intercepted_method = method;
      this._intercepted_url = modifiedUrl;

      // 使用修改后的URL
      arguments[1] = modifiedUrl;
      // @ts-ignore
      return originalXHROpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (_body) {
      if (this._should_intercept_response) {
        const self = this;

        __last_intercepted_batterytest_query_response = null;
        // 包装 onreadystatechange
        const originalOnReadyStateChange = this.onreadystatechange;
        this.onreadystatechange = function (_event) {
          if (self.readyState === 4) {
            interceptResponse(self);
          }
          if (originalOnReadyStateChange) {
            // @ts-ignore
            originalOnReadyStateChange.apply(self, arguments);
          }
        };

        // 包装 onload
        const originalOnLoad = this.onload;
        this.addEventListener('load', function () {
          interceptResponse(self);
          if (originalOnLoad) {
            // @ts-ignore
            originalOnLoad.apply(self, arguments);
          }
        });
      }
      // @ts-ignore
      return originalXHRSend.apply(this, arguments);
    };

    XMLHttpRequest.prototype.__intercepted = true;
  }

  // 拦截并可选修改响应体
  function interceptResponse(xhr: XMLHttpRequest) {
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

  let listenerAddedInterval: number = 0;
  function importConsignorInfo() {
    const confirmImportButton = document.getElementById("assignSaveBtn")
    if (!confirmImportButton) return
    confirmImportButton.addEventListener('click', async () => {
      await sleep(300)
      const datagrid = $("#inspectDatagrid")
      // @ts-ignore
      const selectedId = datagrid.datagrid('getSelected').id
      const data = __last_intercepted_batterytest_query_response
      if (!data || !data.rows || data.rows.length === 0) {
        return
      }
      const selectedData = data.rows.find(row => row.id === selectedId)
      if (!selectedData) {
        return
      }
      const consignorInfo = selectedData.consignorInfo || ''
      const consignor = selectedData.consignor || ''
      $('#consignorInfo').val(consignorInfo)
      $('#consignor').val(consignor)
    })
    clearInterval(listenerAddedInterval)
  }
  // @ts-ignore
  listenerAddedInterval = setInterval(importConsignorInfo, 500)
})