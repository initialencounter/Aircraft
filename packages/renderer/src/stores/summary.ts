import { defineStore } from 'pinia'
import type { SummaryFromLLM } from '@aircraft/validators/src/shared/types'

interface SummaryState {
  result: string[]
  docx: SummaryFromLLM
  pdf: SummaryFromLLM
}

export const useSummaryStore = defineStore('summary', {
  state: (): SummaryState => ({
    result: [],
    docx: {
      manufacturerCName: '',
      manufacturerEName: '',
      testLab: '',
      cnName: '',
      enName: '',
      // @ts-ignore
      classification: '',
      type: '',
      trademark: '',
      voltage: 0,
      capacity: 0,
      watt: 0,
      color: '',
      shape: '',
      mass: 0,
      licontent: 0,
      testReportNo: '',
      testDate: '',
      // @ts-ignore
      testManual: '',
      test1: false,
      test2: false,
      test3: false,
      test4: false,
      test5: false,
      test6: false,
      test7: false,
      test8: false,
    },
    pdf: {
      manufacturerCName: '',
      manufacturerEName: '',
      testLab: '',
      cnName: '',
      enName: '',
      // @ts-ignore
      classification: '',
      type: '',
      trademark: '',
      voltage: 0,
      capacity: 0,
      watt: 0,
      color: '',
      shape: '',
      mass: 0,
      licontent: 0,
      testReportNo: '',
      testDate: '',
      // @ts-ignore
      testManual: '',
      test1: false,
      test2: false,
      test3: false,
      test4: false,
      test5: false,
      test6: false,
      test7: false,
      test8: false,
    },
  }),
  actions: {
    setResult(result: string[]) {
      this.result = result
    },
    setDocx(docx: SummaryFromLLM) {
      this.docx = docx
    },
    setPdf(pdf: SummaryFromLLM) {
      this.pdf = pdf
    },
  },
})
