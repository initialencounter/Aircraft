<script lang="ts" setup>
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import { ref } from "vue";
import { Event } from "@tauri-apps/api/event";
import { ipcManager } from "../utils/ipcManager";
import summaryTable from "../components/SummaryTable.vue";
import type { SummaryData } from "../types";

const parseResult = ref<SummaryData>({
  /**制造商或生产工厂中文名称*/
  manufacturerCName: "",

  /**制造商或生产工厂英文名称*/
  manufacturerEName: "",

  /**测试单位 Test Lab*/
  testLab: "",

  /**电池中文名称*/
  cnName: "",

  /**电池英文名称*/
  enName: "",

  /**电池类型
   * 锂离子电芯：不含电路保护板的单电芯电池，判断方法：T1的测试数量为10个，T7为不适用
   * 单电芯锂离子电池：含电路保护板单电芯电池，判断方法：T1的测试数量为10个,电芯的组合方式为1S1P
   * 锂离子电池：多个电芯组成的电池，判断方法：T1的测试数量为8个或4个
   * 锂金属电芯：单电芯锂金属电池，判断方法：T1的测试数量为10个，T7为不适用
   * 锂金属电池：多个电芯组成的锂金属电池，判断方法：T7为不适用，T1的测试数量为8个或4个
   */
  classification: "锂离子电池",

  /**电池型号*/
  type: "",

  /**电池商标*/
  trademark: "",

  /**电池电压，单位：V*/
  voltage: 0,

  /**电池容量，单位：mAh*/
  capacity: 0,

  /**电池瓦时，单位：Wh
   * 如果是锂金属电池则无需填写
   */
  watt: 0,

  /**电池颜色*/
  color: "",

  /**电池形状*/
  shape: "",

  /**单块电池质量，单位：g
   * 如果报告中没有写明，则需要从T1原始数据中取一个平均值或最大值
   */
  mass: 0,

  /**锂含量，单位：g
   * 如果是锂离子电池则无需填写
   */
  licontent: 0,

  /**UN38.3测试报告编号*/
  testReportNo: "",

  /** UN38.3测试报告签发日期签发日期
   * 格式为：yyyy-MM-dd，如果日期为2021.01.01，则填需要转为2021-01-01
   */
  testDate: "",

  /** UN38.3测试报告测试标准或试验依据Test Method
   * 版本号和修订号有区别的，不要弄错了
   * 没有修订号的，不要写修订号，这个经常容易弄错，请仔细核对
   */
  testManual: "第8版",

  /**
   * T.1：高度模拟 Altitude Simulation(通过true, 不适用/未通过false)
   */
  test1: false,

  /**T.2：温度试验 Thermal Test*/
  test2: false,

  /**T.3：振动 Vibration*/
  test3: false,

  /**T.4：冲击 Shock*/
  test4: false,

  /**T.5：外部短路 External Short Circuit*/
  test5: false,

  /**T.6：撞击/挤压 Impact/Crush */
  test6: false,

  /**T.7：过度充电 vercharge*/
  test7: false,

  /**T.8：T.8：强制放电 Forced Discharge*/
  test8: false,
});

const rawText = ref("");
ipcManager.invoke("switch_drag_to_blake2", { value: false });
ipcManager.on("pdf_reader_result", (data: Event<string>): void => {
  try {
    parseResult.value = JSON.parse(data.payload) as SummaryData;
  } catch (e) {
    rawText.value = data.payload;
  }
});

document.oncontextmenu = function () {
  return false;
};
</script>

<template>
  <!-- 头部 -->
  <h1 class="noSelectTitle" data-tauri-drag-region style="font-size: 24px"></h1>
  <!-- 内容区 -->
  <br />
  请拖拽UN报告到此次区域
  <!-- <summaryData :data="parseResult" layout="custom" /> -->
  <summaryTable :data="parseResult"></summaryTable>
</template>

<style scoped></style>
