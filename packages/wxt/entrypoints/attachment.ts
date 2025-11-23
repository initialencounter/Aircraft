import type * as Aircraft from '../public/aircraft';

export default defineUnlistedScript(() => {
  let wasmModule: typeof Aircraft;
  let wasmInitialized = false;

  (async () => {
    try {
      // 动态导入 WASM 模块
      const aircraftUrl = chrome.runtime.getURL('aircraft.js');
      const wasmUrl = chrome.runtime.getURL('aircraft_bg.wasm');
      
      // 使用动态 import 加载 aircraft.js
      const module = await import(aircraftUrl);
      
      // 初始化 WASM
      await module.default(wasmUrl);
      wasmModule = module;
      wasmInitialized = true;
      
      console.log("WASM loaded successfully");
      chrome.runtime.sendMessage({ action: 'wasmReady', status: 'success' });
    } catch (e) {
      console.error("WASM loading error:", e);
      chrome.runtime.sendMessage({ action: 'wasmReady', status: 'error', error: String(e) });
    }

    chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
      if (!wasmInitialized || !wasmModule) {
        sendResponse({ error: 'WASM not initialized' });
        return;
      }
      if (request.action === "get_goods_info_wasm") {
        console.log("Received parse-pdf request");
        try {
          const buffer = new Uint8Array(request.input);
          const result = wasmModule.get_goods_info(buffer, true,  request.is_965 );
          sendResponse(result);
        } catch (e) {
          sendResponse({ error: String(e) });
        }
        return true;
      } else if (request.action === "get_summary_info_wasm") {
        try {
          const buffer = new Uint8Array(request.input);
          const result = wasmModule.get_summary_info(buffer);
          sendResponse(result);
        } catch (e) {
          sendResponse({ error: String(e) });
        }
        return true;
      }
    });
  })();
});