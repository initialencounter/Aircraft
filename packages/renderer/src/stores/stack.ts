import { defineStore } from 'pinia'

interface StackState {
  weight: number | null
  height: number | null
}

export const useStackStore = defineStore('stack', {
  state: (): StackState => ({
    weight: null,
    height: null,
  }),
  actions: {
    setWeight(value: number) {
      this.weight = value
    },
    setHeight(value: number) {
      this.height = value
    },
  },
})
