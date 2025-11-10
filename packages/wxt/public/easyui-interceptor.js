(function () {
  // 防止重复注入
  if (window.__easyui_intercepted) {
    return;
  }
  window.__easyui_intercepted = true;

  console.log('[EasyUI Hook] Initializing...');

  // 等待jQuery和EasyUI加载
  function waitForEasyUI(callback, maxAttempts = 20000) {
    let attempts = 0;
    const check = setInterval(() => {
      attempts++;
      if (window.$ && window.$.fn && window.$.fn.datagrid) {
        clearInterval(check);
        callback();
      } else if (attempts >= maxAttempts) {
        clearInterval(check);
        console.warn('[EasyUI Hook] EasyUI not found after', maxAttempts, 'attempts');
      }
    }, 10);
  }

  waitForEasyUI(() => {
    console.log('[EasyUI Hook] EasyUI detected, installing hooks...');

    // 拦截所有datagrid初始化
    const originalDatagrid = window.$.fn.datagrid;
    window.$.fn.datagrid = function (options) {
      if (typeof options === 'object') {
        // 强制设置 pageSize 为 100
        options.pageSize = 100;
        // 拓展 pageList 选项
        options.pageList = [10, 20, 30, 40, 50, 100, 200, 300];

        console.log('[EasyUI Hook] datagrid init - modified options:', options);
      }
      return originalDatagrid.apply(this, arguments);
    };

    // 复制所有原始方法和属性
    Object.assign(window.$.fn.datagrid, originalDatagrid);
  });

})();
