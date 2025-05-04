import type { SummaryInfo } from 'aircraft-rs'
import type { SummaryFromLLM } from '../types'
import { removeNonChineseCharacters } from './llm/checkClassification.ts'
import {
  matchBatteryWeight,
  matchCapacity,
  matchVoltage,
  matchWattHour,
} from './shared/utils'
import { matchTestManual } from './shared/utils/matchDevice'

export const convertSummaryInfo2SummaryFromLLM = (
  data: SummaryInfo
): SummaryFromLLM => {
  data = JSON.parse(JSON.stringify(data))
  return {
    manufacturerCName: data.manufacturer,
    manufacturerEName: '',
    testLab: data.testlab,
    cnName: data.cnName,
    enName: '',
    // @ts-ignore
    classification: removeNonChineseCharacters(
      data.classification.trim()
    ).trim(),
    type: data.type,
    trademark: data.trademark,
    voltage: (() => {
      if (data.voltage.includes('不适用')) {
        return null
      }
      if (!data.voltage.replace('/', '').length) {
        return null
      }
      return matchVoltage(data.voltage)
    })(),
    capacity: (() => {
      if (data.capacity.includes('不适用')) {
        return null
      }
      if (!data.capacity.replace('/', '').length) {
        return null
      }
      return matchCapacity(data.capacity)
    })(),
    watt: (() => {
      if (data.watt.includes('不适用')) {
        return null
      }
      if (!data.watt.replace('/', '').length) {
        return null
      }
      return matchWattHour(' ' + data.watt)
    })(),
    color: data.color,
    shape: data.shape,
    mass: (() => {
      if (data.mass.includes('不适用')) {
        return null
      }
      if (!data.mass.replace('/', '').length) {
        return null
      }
      return matchBatteryWeight('为' + data.mass)
    })(),
    licontent: (() => {
      if (data.licontent.includes('不适用')) {
        return null
      }
      if (!data.licontent.replace('/', '').length) {
        return null
      }
      return matchBatteryWeight('为' + data.licontent)
    })(),
    testReportNo: data.testReportNo,
    testDate: data.testDate,
    // @ts-ignore
    testManual: matchTestManual(data.testManual),
    test1: data.test1.includes('通过'),
    test2: data.test2.includes('通过'),
    test3: data.test3.includes('通过'),
    test4: data.test4.includes('通过'),
    test5: data.test5.includes('通过'),
    test6: data.test6.includes('通过'),
    test7: data.test7.includes('通过'),
    test8: data.test8.includes('通过'),
  }
}
