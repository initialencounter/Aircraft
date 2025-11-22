export default defineUnlistedScript(() => {
  let wasmModule: any;
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

      if (request.action === "parse-pdf") {
        console.log("Received parse-pdf request");
        try {
          console.log("Input array length:", request.input?.length);
          // 将数组转换回 Uint8Array
          const buffer = new Uint8Array(request.input);
          const result = wasmModule.add(buffer);
          console.log("PDF parse result:", result);
          sendResponse({ result });
        } catch (e) {
          sendResponse({ error: String(e) });
        }
      } else if (request.action === "get-pdf-title") {
        console.log("Received get-pdf-title request");
        try {
          const buffer = new Uint8Array(request.input);
          const title = wasmModule.get_pdf_title(buffer);
          console.log("PDF title:", title);
          sendResponse({ title });
        } catch (e) {
          sendResponse({ error: String(e) });
        }
      }
    });
  })();
});