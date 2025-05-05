import { CheckResult } from '../shared/types/index'
import {matchTestManual} from '../shared/utils/matchDevice'

type TestManual ="联合国《试验和标准手册》第八修订版第38.3节" |
"联合国《试验和标准手册》（第7版修订1）38.3节" |
"联合国《试验和标准手册》（第7版）38.3节" |
"联合国《关于危险货物运输的建议书-试验和标准手册》（第6版修订1）38.3节" |
"联合国《关于危险货物运输的建议书-试验和标准手册》（第6版）38.3节" |
"联合国《关于危险货物运输的建议书-试验和标准手册》（第5版修订1和修订2）38.3节" |
"联合国《关于危险货物运输的建议书-试验和标准手册》（第5版修订1）38.3节" |
"联合国《关于危险货物运输的建议书-试验和标准手册》（第5版）38.3节" |
"联合国《关于危险货物运输的建议书-试验和标准手册》（第4版）38.3节"

export function checkTestManual(rawTestManualLLM: string, rawTestManual: string): CheckResult[] {
  let testManual = rawTestManual.trim()
  testManual = matchTestManual(testManual)
  if (!rawTestManualLLM && !testManual){
    return [{
      ok: false,
      result: '未匹配到UN38.3测试标准，请反馈问题给开发人员'
    }]
  }
  console.log('raw input', rawTestManualLLM, rawTestManual)
  console.log('match from docx', testManual)
  if (rawTestManualLLM !== testManual) {
    return [{
      ok: false,
      result: `UN报告上的测试标准为:${rawTestManualLLM}，概要上的为:${rawTestManual}`
    }]
  }
  return []
}