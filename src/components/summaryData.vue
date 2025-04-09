<template>
  <SummaryItem 
        label="制造商或生产工厂中文名称" 
        :value="data.manufacturerCName" 
        :customClass="getCustomClass('manufacturerCName')" 
      />
      <SummaryItem 
        label="制造商或生产工厂英文名称" 
        :value="data.manufacturerEName" 
        :customClass="getCustomClass('manufacturerEName')" 
      />
      <SummaryItem 
        label="测试单位" 
        :value="data.testLab" 
        :customClass="getCustomClass('testLab')" 
      />
      
      <!-- 电池基本信息区域 -->
      <SummaryItem 
        label="电池中文名称" 
        :value="data.cnName" 
        :customClass="getCustomClass('cnName')" 
      />
      <SummaryItem 
        label="电池英文名称" 
        :value="data.enName" 
        :customClass="getCustomClass('enName')" 
      />
      <SummaryItem 
        label="电池类型" 
        :value="data.classification" 
        :customClass="getCustomClass('classification')" 
      />
      <SummaryItem 
        label="电池型号" 
        :value="data.type" 
        :customClass="getCustomClass('type')" 
      />
      <SummaryItem 
        label="电池商标" 
        :value="data.trademark" 
        :customClass="getCustomClass('trademark')" 
      />
      
      <!-- 电池技术参数区域 -->
      <SummaryItem 
        label="电池电压，单位：V" 
        :value="data.voltage" 
        :customClass="getCustomClass('voltage')" 
      />
      <SummaryItem 
        label="电池容量，单位：mAh" 
        :value="data.capacity" 
        :customClass="getCustomClass('capacity')" 
      />
      <SummaryItem 
        label="电池瓦时，单位：Wh" 
        :value="data.watt" 
        :customClass="getCustomClass('watt')" 
      />
      <SummaryItem 
        label="电池颜色" 
        :value="data.color" 
        :customClass="getCustomClass('color')" 
      />
      <SummaryItem 
        label="电池形状" 
        :value="data.shape" 
        :customClass="getCustomClass('shape')" 
      />
      <SummaryItem 
        label="单块电池质量，单位：g" 
        :value="data.mass" 
        :customClass="getCustomClass('mass')" 
      />
      <SummaryItem 
        label="锂含量，单位：g" 
        :value="data.licontent" 
        :customClass="getCustomClass('licontent')" 
      />
      
      <!-- 测试信息区域 -->
      <SummaryItem 
        label="UN38.3测试报告编号" 
        :value="data.testReportNo" 
        :customClass="getCustomClass('testReportNo')" 
      />
      <SummaryItem 
        label="UN38.3测试报告签发日期签发日期" 
        :value="data.testDate" 
        :customClass="getCustomClass('testDate')" 
      />
      <SummaryItem 
        label="UN38.3测试报告测试标准或试验依据Test Method" 
        :value="data.testManual" 
        :customClass="getCustomClass('testManual')" 
      />
      
      <!-- 测试结果区域 -->
      <SummaryItem 
        label="T.1：高度模拟 Altitude Simulation" 
        :value="data.test1" 
        :customClass="getCustomClass('test1')" 
      />
      <SummaryItem 
        label="T.2：温度试验 Thermal Test" 
        :value="data.test2" 
        :customClass="getCustomClass('test2')" 
      />
      <SummaryItem 
        label="T.3：振动 Vibration" 
        :value="data.test3" 
        :customClass="getCustomClass('test3')" 
      />
      <SummaryItem 
        label="T.4：冲击 Shock" 
        :value="data.test4" 
        :customClass="getCustomClass('test4')" 
      />
      <SummaryItem 
        label="T.5：外部短路 External Short Circuit" 
        :value="data.test5" 
        :customClass="getCustomClass('test5')" 
      />
      <SummaryItem 
        label="T.6：撞击/挤压 Impact/Crush" 
        :value="data.test6" 
        :customClass="getCustomClass('test6')" 
      />
      <SummaryItem 
        label="T.7：过度充电 Overcharge" 
        :value="data.test7" 
        :customClass="getCustomClass('test7')" 
      />
      <SummaryItem 
        label="T.8：强制放电 Forced Discharge" 
        :value="data.test8" 
        :customClass="getCustomClass('test8')" 
      />
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { ElDescriptions, ElMessage, ElCard, ElIcon } from 'element-plus';
import SummaryItem from './SummaryItem.vue';
import type { SummaryData } from '../types';

const props = defineProps<{
  data: SummaryData;
  layout?: 'auto' | 'custom' | 'grid'; // 布局模式：自动、自定义、网格
  columnCount?: number; // 列数
  size?: 'small' | 'default' | 'large'; // 组件大小
  fields?: Array<keyof SummaryData>; // 要显示的字段
  fieldStyles?: Record<string, any>; // 各字段样式
}>();
const labelMap: Record<keyof SummaryData, string> = {
  manufacturerCName: '制造商或生产工厂中文名称',
  manufacturerEName: '制造商或生产工厂英文名称',
  testLab: '测试单位',
  cnName: '电池中文名称',
  enName: '电池英文名称',
  classification: '电池类型',
  type: '电池型号',
  trademark: '电池商标',
  voltage: '电池电压，单位：V',
  capacity: '电池容量，单位：mAh',
  watt: '电池瓦时，单位：Wh',
  color: '电池颜色',
  shape: '电池形状',
  mass: '单块电池质量，单位：g',
  licontent: '锂含量，单位：g',
  testReportNo: 'UN38.3测试报告编号',
  testDate: 'UN38.3测试报告签发日期签发日期',
  testManual: 'UN38.3测试报告测试标准或试验依据Test Method',
  test1: 'T.1：高度模拟 Altitude Simulation',
  test2: 'T.2：温度试验 Thermal Test',
  test3: 'T.3：振动 Vibration',
  test4: 'T.4：冲击 Shock',
  test5: 'T.5：外部短路 External Short Circuit',
  test6: 'T.6：撞击/挤压 Impact/Crush',
  test7: 'T.7：过度充电 Overcharge',
  test8: 'T.8：强制放电 Forced Discharge',
};

const defaultOrder: (keyof SummaryData)[] = [
  'manufacturerCName',
  'manufacturerEName',
  'testLab',
  'cnName',
  'enName',
  'classification',
  'type',
  'trademark',
  'voltage',
  'capacity',
  'watt',
  'color',
  'shape',
  'mass',
  'licontent',
  'testReportNo',
  'testDate',
  'testManual',
  'test1',
  'test2',
  'test3',
  'test4',
  'test5',
  'test6',
  'test7',
  'test8',
];

// 默认不使用的字段（如锂离子电池不需要显示锂含量）
const defaultHiddenFields = ref<(keyof SummaryData)[]>([]);

// 要显示的字段列表
const visibleFields = computed(() => {
  if (props.fields && props.fields.length) {
    return props.fields;
  }
  return defaultOrder.filter(field => !defaultHiddenFields.value.includes(field));
});

// 获取字段的自定义样式类
const getCustomClass = (field: keyof SummaryData) => {
  return `field-${field}`;
};

// 获取字段的自定义样式
const getFieldStyle = (field: keyof SummaryData) => {
  if (props.fieldStyles && props.fieldStyles[field]) {
    return props.fieldStyles[field];
  }
  return {};
};

// 获取网格布局的类名
const getGridClass = (field: keyof SummaryData) => {
  return [`grid-item`, `grid-item-${field}`];
};

// 获取网格布局的样式
const getGridStyle = (field: keyof SummaryData) => {
  const baseStyle = {
    gridArea: field
  };
  
  if (props.fieldStyles && props.fieldStyles[field]) {
    return { ...baseStyle, ...props.fieldStyles[field] };
  }
  
  return baseStyle;
};

// 复制内容到剪贴板
const handleCopy = async (text: any) => {
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text.toString());
    ElMessage.success({
      message: '已复制到剪贴板',
      type: 'success',
    });
  } catch (err) {
    console.error('复制失败:', err);
    ElMessage.error({
      message: '复制失败',
      type: 'error',
    });
  }
};
</script>

<style scoped>
:deep(.my-label) {
  background: #333 !important;
}
:deep(.my-content) {
  background: #000;
}
:deep(.my-content:hover) {
  background: #2d4531;
}

/* 网格布局相关样式 */
.grid-layout {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 10px;
  grid-auto-rows: minmax(80px, auto);
}

.field-card {
  height: 100%;
}

.field-value {
  text-align: center;
  font-size: 16px;
  cursor: pointer;
}

/* 可以为特定字段添加自定义样式 */
:deep(.field-voltage) {
  background: rgba(25, 113, 194, 0.2);
}

:deep(.field-capacity) {
  background: rgba(25, 113, 194, 0.2);
}

/* 为测试结果添加特殊样式 */
:deep([class*="field-test"]) {
  background: rgba(38, 166, 154, 0.1);
}

/* 字段高亮 */
.summary-container :deep(.highlight) {
  background: rgba(255, 193, 7, 0.2) !important;
}
</style>
