<template>
  <div class="stack-calculator">
    <div class="calculator-container">
      <h2 class="title">堆码载荷计算器</h2>

      <div class="input-group">
        <div class="input-item">
          <label>包装件毛重 (kg)</label>
          <div class="input-wrapper">
            <input
              v-model="weight"
              placeholder="请输入重量"
              step="0.01"
              type="number"
              @focus="($event.target as HTMLInputElement)?.select()"
            />
            <span class="unit">kg</span>
          </div>
        </div>

        <div class="input-item">
          <label>包装件高度 (mm)</label>
          <div class="input-wrapper">
            <input
              v-model="height"
              placeholder="请输入高度"
              step="0.1"
              type="number"
              @focus="($event.target as HTMLInputElement)?.select()"
            />
            <span class="unit">mm</span>
          </div>
        </div>
      </div>

      <div class="results">
        <div class="result-group">
          <h3>按层数计算</h3>
          <div class="result-item">
            <div class="result-row">
              <span class="label">堆码层数:</span>
              <span class="result-value result-value-layer">{{
                layerCount
              }}</span>
            </div>
            <div class="result-row">
              <span class="label">载荷:</span>
              <span class="result-value result-value-kgf"
                >{{ formatNumber(loadByLayer, 3) }}
              </span>
              <span class="label">kgf</span>
            </div>
            <div class="result-row">
              <span class="label">载荷:</span>
              <span class="result-value result-value-n"
                >{{ formatNumber(loadByLayerNewton, 4) }}
              </span>
              <span class="label">N</span>
            </div>
          </div>
        </div>

        <div class="result-group">
          <h3>按高度计算</h3>
          <div class="result-item">
            <div class="result-row">
              <span class="label">堆码层数:</span>
              <span class="result-value result-value-layer">{{
                formatNumber(heightBasedLayer, 4)
              }}</span>
            </div>
            <div class="result-row">
              <span class="label">载荷:</span>
              <span class="result-value result-value-kgf"
                >{{ formatNumber(loadByHeight, 3) }}
              </span>
              <span class="label">kgf</span>
            </div>
            <div class="result-row">
              <span class="label">载荷:</span>
              <span class="result-value result-value-n"
                >{{ formatNumber(loadByHeightNewton, 4) }}
              </span>
              <span class="label">N</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useStackStore } from '../stores/stack.ts'

const stackStore = useStackStore()
const weight = ref<number | null>(stackStore.weight)
const height = ref<number | null>(stackStore.height)

//@ts-ignore
watch(weight, (newVal: number) => {
  stackStore.setWeight(newVal)
})

//@ts-ignore
watch(height, (newVal: number) => {
  stackStore.setHeight(newVal)
})

// 按层数计算
const layerCount = computed(() => {
  if (!height.value) return 0
  let layers = 3000 / height.value
  if (Number.isInteger(layers)) {
    return layers - 1
  }
  return Math.floor(layers)
})

const loadByLayer = computed(() => {
  return (layerCount.value || 0) * (weight.value || 0)
})

const loadByLayerNewton = computed(() => {
  return loadByLayer.value * 9.8
})

// 按高度计算
const heightBasedLayer = computed(() => {
  if (!height.value) return 0
  return 3000 / height.value - 1
})

const loadByHeight = computed(() => {
  return heightBasedLayer.value * (weight.value || 0)
})

const loadByHeightNewton = computed(() => {
  return loadByHeight.value * 9.8
})

const formatNumber = (num: number, fixed = 3) => {
  if (!num) return '0'
  const result = String(num.toFixed(fixed))
  // 如果小数点后都是0，则转为整数
  if (
    result.endsWith('.0000') ||
    result.endsWith('.000') ||
    result.endsWith('.00') ||
    result.endsWith('.0')
  ) {
    return result
      .replace('.0000', '')
      .replace('.000', '')
      .replace('.00', '')
      .replace('.0', '')
  }
  return result
}
</script>

<style scoped>
.stack-calculator {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.calculator-container {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 25px;
  width: 100%;
  max-width: 800px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.title {
  color: #fff;
  text-align: center;
  margin-bottom: 30px;
  font-size: 24px;
}

.input-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.input-item {
  flex: 1;
}

.input-item label {
  display: block;
  margin-bottom: 10px;
  color: #b4b4b4;
  font-size: 14px;
}

.input-wrapper {
  position: relative;
}

.input-wrapper input {
  width: 100%;
  padding: 12px 40px 12px 12px;
  border: 2px solid #404040;
  border-radius: 8px;
  background-color: #333;
  color: #fff;
  font-size: 16px;
  transition: all 0.3s ease;
}

.input-wrapper input:focus {
  border-color: #666;
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
}

.unit {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #888;
}

.results {
  display: flex;
  gap: 24px;
}

.result-group {
  flex: 1;
  background: #333;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #404040;
}

.result-group h3 {
  color: #fff;
  margin-bottom: 16px;
  font-size: 18px;
  padding-bottom: 8px;
  border-bottom: 1px solid #404040;
}

.result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 12px 0;
}

.label {
  color: #b4b4b4;
}

.result-value {
  font-weight: 500;
  font-size: 16px;
}

.result-value-layer {
  color: #4caf50;
}

.result-value-kgf {
  color: #ffc107;
}

.result-value-n {
  color: #64b5f6;
}

@media (max-width: 600px) {
  .calculator-container {
    padding: 20px;
  }

  .input-group {
    grid-template-columns: 1fr;
  }

  .results {
    flex-direction: column;
  }
}
</style>
