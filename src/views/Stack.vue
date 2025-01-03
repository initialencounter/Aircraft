<template>
  <div class="stack-calculator">
    <div class="calculator-container">
      <h2 class="title">堆码载荷计算器</h2>
      
      <div class="input-group">
        <div class="input-item">
          <label>包装件毛重 (kg)</label>
          <div class="input-wrapper">
            <input type="number" v-model="weight" step="0.01" placeholder="请输入重量">
            <span class="unit">kg</span>
          </div>
        </div>
        
        <div class="input-item">
          <label>包装件高度 (mm)</label>
          <div class="input-wrapper">
            <input type="number" v-model="height" step="0.1" placeholder="请输入高度">
            <span class="unit">mm</span>
          </div>
        </div>
      </div>

      <div class="results" v-if="height && weight">
        <div class="result-group">
          <h3>按层数计算</h3>
          <div class="result-item">
            <div class="result-row">
              <span class="label">堆码层数:</span>
              <span class="result-value result-value-layer">{{ layerCount }}</span>
            </div>
            <div class="result-row">
              <span class="label">载荷:</span>
              <span class="result-value result-value-kgf">{{ formatNumber(loadByLayer) }} </span>
              <span class="label">kgf</span>
            </div>
            <div class="result-row">
              <span class="label">载荷:</span>
              <span class="result-value result-value-n">{{ formatNumber(loadByLayerNewton) }} </span>
              <span class="label">N</span>
            </div>
          </div>
        </div>

        <div class="result-group">
          <h3>按高度计算</h3>
          <div class="result-item">
            <div class="result-row">
              <span class="label">堆码层数:</span>
              <span class="result-value result-value-layer">{{ formatNumber(heightBasedLayer) }}</span>
            </div>
            <div class="result-row">
              <span class="label">载荷:</span>
              <span class="result-value result-value-kgf">{{ formatNumber(loadByHeight) }} </span>
              <span class="label">kgf</span>
            </div>
            <div class="result-row">
              <span class="label">载荷:</span>
              <span class="result-value result-value-n">{{ formatNumber(loadByHeightNewton) }} </span>
              <span class="label">N</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Stack',
  data() {
    return {
      weight: null,
      height: null,
    }
  },
  computed: {
    // 按层数计算
    layerCount() {
      if (!this.height) return 0
      return Math.floor(3000 / this.height)
    },
    loadByLayer() {
      return this.layerCount * this.weight
    },
    loadByLayerNewton() {
      return this.loadByLayer * 9.81
    },

    // 按高度计算
    heightBasedLayer() {
      if (!this.height) return 0
      return (3000 / (this.height)) - 1
    },
    loadByHeight() {
      return this.heightBasedLayer * this.weight
    },
    loadByHeightNewton() {
      return this.loadByHeight * 9.81
    }
  },
  methods: {
    formatNumber(num) {
      if (!num) return '0'
      // 先保留2位小数
      const fixed = num.toFixed(2)
      // 如果小数点后都是0，则转为整数
      return fixed.endsWith('.00') ? Math.round(num).toString() : fixed
    }
  }
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
  padding: 12px;
  padding-right: 40px;
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
  color: #4CAF50;
}

.result-value-kgf {
  color: #FFC107;
}

.result-value-n {
  color: #64B5F6;
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
