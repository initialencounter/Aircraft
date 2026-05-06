import type { SummaryFromLLM } from '../shared/types'
import type { CheckResult } from '../shared/types'
import { baseCheck } from './baseCheck'
import { checkClassification } from './checkClassification'
import { checkCompany } from './checkCompany'
import { checkContainUnit } from './checkContainUnit'
import { checkName } from './checkName'
import { checkT1_8 } from './checkT1_8'
import { checkTestManual } from './checkTestManual'

export function checkSummaryFromLLM(
  summaryFromLLM: SummaryFromLLM,
  summaryInfo: SummaryFromLLM
): CheckResult[] {
  const results: CheckResult[] = []
  // 生产单位和测试单位验证
  results.push(...checkCompany(
    summaryFromLLM.testLab || '', 
    summaryFromLLM.manufacturerCName || '',
    summaryInfo.testLab || '',
    summaryInfo.manufacturerCName || ''
  ))
  // 电池名称验证
  results.push(
    ...checkName(
      summaryFromLLM.cnName || '',
      summaryFromLLM.enName || '',
      summaryInfo.cnName || '',
      summaryInfo.enName || '',
    )
  )
  // 电池类型验证
  results.push(
    ...checkClassification(
      summaryFromLLM.classification || '',
      summaryInfo.classification || ''
    )
  )
  // 基本信息验证，"model", "testReportNo", "testDate"
  results.push(...baseCheck(summaryFromLLM, summaryInfo))
  // 电池参数验证，"voltage", "capacity", "watt", "mass", "licontent"
  results.push(...checkContainUnit(summaryFromLLM, summaryInfo))
  // 测试标准验证
  results.push(
    ...checkTestManual(
      summaryFromLLM.testManual || '',
      summaryInfo.testManual || ''
    )
  )
  // T1-8验证
  results.push(...checkT1_8(summaryFromLLM, summaryInfo))
  for (const result of results) {
    result.result = 'LLM验证：' + result.result
  }
  return results
}
