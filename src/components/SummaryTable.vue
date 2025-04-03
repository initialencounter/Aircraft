<template>
  <div class="container">
    <!-- 单位信息 -->
    <div class="section">
      <h4>单位信息 Company Information</h4>
      <table>
        <tbody>
          <tr>
            <td>生产单位</td>
            <td>{{ data.manufacturerCName }}/{{ data.manufacturerEName }}</td>
          </tr>
          <tr>
            <td>测试单位</td>
            <td>
              {{ data.testLab }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 电池信息 -->
    <div class="section">
      <h4>电池信息 Battery Information</h4>
      <table>
        <tbody>
          <tr>
            <td>名称 Name</td>
            <td>锰酸锂电池 LiMn2O4 Battery</td>
            <td>电池/电芯类别 Battery/Cell Classification</td>
            <td>{{ data.classification }}</td>
          </tr>
          <tr>
            <td>型号 Type</td>
            <td>{{ data.type }}</td>
            <td>商标 Trademark</td>
            <td>{{ data.trademark }}</td>
          </tr>
          <tr>
            <td>额定电压 Normal Voltage</td>
            <td>{{ data.voltage }}</td>
            <td>额定容量 Rated Capacity</td>
            <td>{{ data.capacity }}</td>
          </tr>
          <tr>
            <td>额定能量 Watt-hour rating</td>
            <td>{{ data.watt }}</td>
            <td>外观/Appearance</td>
            <td>{{ data.color }}{{ data.shape }}</td>
          </tr>
          <tr>
            <td>质量/Mass</td>
            <td>{{ data.mass ?? "不适用 N/A" }}g</td>
            <td>锂含量/Li Content</td>
            <td>{{ data.licontent ?? "不适用 N/A" }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 测试信息 -->
    <div class="section">
      <h4>测试信息 Test Information</h4>
      <table>
        <tbody>
          <tr>
            <td>测试报告编号 Test Report Number</td>
            <td>{{ data.testReportNo }}</td>
            <td>测试报告签发日期 Date of Test Report</td>
            <td>{{ data.testDate }}</td>
          </tr>
          <tr>
            <td>测试报告测试标准或试验依据Test</td>
            <td colspan="4">
              {{ data.testManual }}
            </td>
          </tr>
          <tr v-for="(row, index) in testRows" :key="index">
            <td v-for="(test, i) in row" :key="i">
              {{ test.name }}<br />{{
                test.result ? "通过 Pass" : "不通过 Fail"
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { SummaryData } from "../types";

const props = defineProps<{
  data: SummaryData;
}>();

interface TestItem {
  name: string;
  result: boolean;
}

const tests = ref<TestItem[]>([
  { name: "T.1: 高度模拟 Altitude Simulation", result: props.data.test1 },
  { name: "T.2: 温度试验 Thermal Test", result: props.data.test2 },
  { name: "T.3: 振动 Vibration", result: props.data.test3 },
  { name: "T.4: 冲击 Shock", result: props.data.test4 },
  { name: "T.5: 外部短路 External Short Circuit", result: props.data.test5 },
  { name: "T.6: 撞击/挤压 Impact/Crush", result: props.data.test6 },
  { name: "T.7: 过度充电 Overcharge", result: props.data.test7 },
  { name: "T.8: 强制放电 Forced Discharge", result: props.data.test8 },
]);

const testRows = computed(() => {
  const rows: TestItem[][] = [];
  for (let i = 0; i < tests.value.length; i += 4) {
    rows.push(tests.value.slice(i, i + 4));
  }
  return rows;
});
</script>

<style scoped>
.container {
  max-width: 1000px;
  font-family: "SimSun", serif;
}

h1,
h2,
h3 {
  text-align: center;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 5px 0;
  border: 1px solid #000;
}

td {
  border: 2px solid #505050;
  vertical-align: middle;
}

td:nth-child(odd) {
  width: 20%;
}

td:nth-child(even) {
  width: 30%;
}
</style>
