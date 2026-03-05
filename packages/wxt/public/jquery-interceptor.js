(function () {
  // 防止重复注入
  if (window.__jquery_intercepted) {
    return;
  }
  window.__jquery_intercepted = true;

  function validateForm(data) {
    var errors = [];

    if (!data.consignor) {
      errors.push("委托单位不可以为空");
      $("#consignor").focus();
    }
    if (!data.manufacturer) {
      errors.push("生产单位不可以为空");
      $("#manufacturer").focus();
    }
    if (!data.testlab) {
      errors.push("测试单位不可以为空");
      $("#testlab").focus();
    }
    if (!data.cnName) {
      errors.push("中文名称不可以为空");
      $("#cnName").focus();
    }
    if (!data.classification) {
      errors.push("类别不可以为空");
      $("#classification").focus();
    }
    if (!data.type) {
      errors.push("型号不可以为空");
      $("#type").focus();
    }
    if (!data.color) {
      errors.push("外观颜色不可以为空");
      $("#color").focus();
    }
    if (!data.shape) {
      errors.push("外观形状不可以为空");
      $("#shape").focus();
    }
    if (!data.voltage) {
      errors.push("额定电压不可以为空");
      $("#voltage").focus();
    }
    if (!data.mass) {
      errors.push("质量不可以为空");
      $("#mass").focus();
    }
    if (!data.testReportNo) {
      errors.push("测试报告编号不可以为空");
      $("#testReportNo").focus();
    }
    if (!data.testDate) {
      errors.push("测试报告签发日期不可以为空");
      $("#testDate").focus();
    }
    if (!data.testManual) {
      errors.push("测试标准不可以为空");
      $("#testManual").focus();
    }
    if (errors.length > 0) {
      showInfoBox("<div style='float:left;'>"
        + errors.join("<br/>") + "</div>");
      return false;
    }

    return true;
  }

  window.addEventListener('message', function (event) {
    if (event.source != window) return;

    if (event.data.type && event.data.type === 'FROM_FILL_SUMMARY') {
      const data = event.data.payload;
      const originalData = getFormJSON("#batteryInspectForm")
      data.id = originalData.id
      data.projectId = originalData.projectId
      if (!data.projectId) {
        return;
      }
      if (!validateForm(data)) {
        return;
      }
      $("#batteryInspectForm").form("load", data)
    }
  });
})();