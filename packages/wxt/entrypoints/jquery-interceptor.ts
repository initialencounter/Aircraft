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
  }
}

export default defineUnlistedScript(() => {
  if (window.__jquery_intercepted) {
    return;
  }
  window.__jquery_intercepted = true;



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
  });
})

