declare module 'schemastery-vue' {
  import { Component } from 'vue'
  
  export interface Schema {
    type: string
    meta: {
      description?: string
      required?: boolean
      default?: any
      role?: string
      collapse?: boolean
      max?: number
      min?: number
      step?: number
      extra?: any
    }
    inner?: Schema
    list?: Schema[]
    dict?: Record<string, Schema>
    sKey?: Schema
    value?: any
  }

  export interface SchemaProps {
    schema?: Schema
    modelValue?: any
    initial?: any
    disabled?: boolean
  }

  export const KForm: Component
  export default Component
}

// 添加 YAML 模块声明
declare module '*.yml' {
  const content: any
  export default content
}