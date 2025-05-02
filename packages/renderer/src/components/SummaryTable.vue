<template>
  <div class="container">
    <!-- 单位信息 -->
    <div class="section">
      <h3>单位信息 Company Information</h3>
      <table>
        <tbody>
          <tr>
            <td style="width: 22%" class="label">生产单位<br />Manufacturer</td>
            <td>{{ data.manufacturerCName }}/{{ data.manufacturerEName }}</td>
          </tr>
          <tr>
            <td class="label">测试单位<br />Test Lab</td>
            <td>
              {{ data.testLab }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 电池信息 -->
    <div class="section">
      <h3>电池信息 Battery Information</h3>
      <table>
        <tbody>
          <tr>
            <td style="width: 20%" class="label">名称<br />Name</td>
            <td style="width: 25%">{{ data.cnName }}<br />{{ data.enName }}</td>
            <td style="width: 22%" class="label">
              电池/电芯类别 Battery/Cell Classification
            </td>
            <td style="width: 25%">{{ data.classification }}</td>
          </tr>
          <tr>
            <td class="label">型号 Type</td>
            <td>{{ data.type }}</td>
            <td class="label">商标 Trademark</td>
            <td>{{ data.trademark }}</td>
          </tr>
          <tr>
            <td class="label">额定电压<br />Normal Voltage</td>
            <td>{{ data.voltage }}</td>
            <td class="label">额定容量<br />Rated Capacity</td>
            <td>{{ data.capacity }}</td>
          </tr>
          <tr>
            <td class="label">额定能量<br />Watt-hour rating</td>
            <td>{{ data.watt }}</td>
            <td class="label">外观<br />Appearance</td>
            <td>{{ data.color }}{{ data.shape }}</td>
          </tr>
          <tr>
            <td class="label">质量<br />Mass</td>
            <td>{{ data.mass ?? '不适用 N/A' }}g</td>
            <td class="label">锂含量<br />Li Content</td>
            <td>{{ data.licontent ?? '不适用 N/A' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 测试信息 -->
    <div class="section">
      <h3>测试信息 Test Information</h3>
      <table>
        <tbody>
          <tr>
            <td style="width: 20%" class="label">
              测试报告编号 Test Report Number
            </td>
            <td style="width: 25%">{{ data.testReportNo }}</td>
            <td style="width: 20%" class="label">
              测试报告签发日期 Date of Test Report
            </td>
            <td style="width: 25%">{{ data.testDate }}</td>
          </tr>
          <tr>
            <td class="label">测试标准<br />或试验依据</td>
            <td colspan="4">
              {{ data.testManual }}
            </td>
          </tr>
        </tbody>
      </table>
      <table>
        <tbody>
          <tr v-for="(row, index) in testRows" :key="index">
            <td v-for="(test, i) in row" :key="i">
              <div
                :style="{ backgroundColor: `${test.result ? '' : 'orange'}` }"
              >
                {{ test.name }}<br />{{ test.result ? '通过' : '不适用' }}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { SummaryData } from '../types'

const props = defineProps<{
  data: SummaryData
}>()

interface TestItem {
  name: string
  result: boolean
}

const tests = ref<TestItem[]>([
  { name: 'T.1: 高度模拟', result: props.data.test1 },
  { name: 'T.2: 温度试验', result: props.data.test2 },
  { name: 'T.3: 振动', result: props.data.test3 },
  { name: 'T.4: 冲击', result: props.data.test4 },
  { name: 'T.5: 外部短路', result: props.data.test5 },
  { name: 'T.6: 撞击/挤压', result: props.data.test6 },
  { name: 'T.7: 过度充电', result: props.data.test7 },
  { name: 'T.8: 强制放电', result: props.data.test8 },
])

const testRows = computed(() => {
  const rows: TestItem[][] = []
  for (let i = 0; i < tests.value.length; i += 3) {
    rows.push(tests.value.slice(i, i + 3))
  }
  return rows
})
</script>

<style scoped>
.container {
  font-family: 'Calibri';
}

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
  text-align: center;
}

.label {
  font-weight: bold;
  color: #000000;
}
</style>
