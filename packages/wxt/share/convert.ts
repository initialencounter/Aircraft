import { SummaryFromLLM, SummaryInfo } from "@aircraft/validators"
import { CLASSIFICATION_ID_MAP, ID_CLASSIFICATION_MAP } from "./classificationMap"
import { COLOR_ID_MAP, ID_COLOR_MAP } from "./colorMap"
import { ID_MANUAL_MAP_SIMPLIFY, MANUAL_ID_MAP_SIMPLIFY } from "./manualMap"
import { ID_SHAPE_MAP, SHAPE_ID_MAP } from "./shapeMap"
import { SummaryFormJSONData } from "./types"
import { matchBatteryWeight, matchCapacity, matchVoltage, matchWattHour } from "../../validators/src/lithium/shared/utils"
import { matchColor, removeNonChineseCharacters } from "../../validators/src/summary/checkColor"
import { matchShape } from "../../validators/src/summary/checkShape"
import { matchTestManual } from "../../validators/src/lithium/shared/utils/matchDevice"



export function SummaryFormJSONData2SummaryFromLLM(data: SummaryFormJSONData) {
  const classification =
    ID_CLASSIFICATION_MAP[
    data.classification as keyof typeof ID_CLASSIFICATION_MAP
    ] ||
    data.classification ||
    ''
  const shape =
    ID_SHAPE_MAP[data.shape as keyof typeof ID_SHAPE_MAP] || data.shape || ''
  const color =
    ID_COLOR_MAP[data.color as keyof typeof ID_COLOR_MAP] || data.color || ''
  const testManual =
    ID_MANUAL_MAP_SIMPLIFY[
    data.testManual as keyof typeof ID_MANUAL_MAP_SIMPLIFY
    ] ||
    data.testManual ||
    ''

  const summaryInfo: SummaryFromLLM = {
    manufacturerCName: data.manufacturer,
    testLab: data.testlab,
    cnName: data.cnName,
    enName: data.enName,
    // @ts-ignore
    classification: classification,
    model: data.type,
    trademark: data.trademark,
    voltage: (() => {
      if (data.voltage.includes('不适用')) {
        return null
      }
      if (!data.voltage.replace('/', '').length) {
        return null
      }
      return parseFloat(data.voltage)
    })(),
    capacity: (() => {
      if (data.capacity.includes('不适用')) {
        return null
      }
      if (!data.capacity.replace('/', '').length) {
        return null
      }
      return parseFloat(data.capacity)
    })(),
    watt: (() => {
      if (data.watt.includes('不适用')) {
        return null
      }
      if (!data.watt.replace('/', '').length) {
        return null
      }
      return parseFloat(' ' + data.watt)
    })(),
    color,
    shape,
    mass: (() => {
      if (data.mass.includes('不适用')) {
        return null
      }
      if (!data.mass.replace('/', '').length) {
        return null
      }
      return parseFloat(data.mass)
    })(),
    licontent: (() => {
      if (data.licontent.includes('不适用')) {
        return null
      }
      if (!data.licontent.replace('/', '').length) {
        return null
      }
      return parseFloat(data.licontent)
    })(),
    testReportNo: data.testReportNo,
    testDate: data.testDate,
    // @ts-ignore
    testManual,
    test1: data.test1 === "true",
    test2: data.test2 === "true",
    test3: data.test3 === "true",
    test4: data.test4 === "true",
    test5: data.test5 === "true",
    test6: data.test6 === "true",
    test7: data.test7 === "true",
    test8: data.test8 === "true",
    un38F: data.un38f === "true",
    un38G: data.un38g === "true",
  }
  return summaryInfo
}

export function summaryInfoToForm(summaryInfo: SummaryInfo): SummaryFormJSONData {
  const classification = removeNonChineseCharacters(summaryInfo.classification).trim()
  const color = matchColor(summaryInfo.shape)
  const shape = matchShape(summaryInfo.shape)
  const testManual = matchTestManual(summaryInfo.testManual)
  const wattHour = String(matchWattHour(' ' + summaryInfo.watt) ?? '')
  const licontent = String(matchBatteryWeight('为' + summaryInfo.licontent) ?? '')
  const voltage = String(matchVoltage(summaryInfo.voltage) ?? '')
  const capacity = String(matchCapacity(summaryInfo.capacity) ?? '')

  const consignor = summaryInfo.consignorInfo ? summaryInfo.consignor.split('\n').join(' ') : summaryInfo.consignor.split('\n')[0]
  const manufacturer = summaryInfo.manufacturerInfo ? summaryInfo.manufacturer.split('\n').join(' ') : summaryInfo.manufacturer.split('\n')[0]
  const testlab = summaryInfo.testlabInfo ? summaryInfo.testlab.split('\n').join(' ') : summaryInfo.testlab.split('\n')[0]

  const resolveInfo = (info: string | undefined, base: string): string =>
    !info && base.includes('\n')
      ? base.split('\n').slice(1).join('\n').trim()
      : (info ?? base ?? '')
  const consignorInfo = resolveInfo(summaryInfo.consignorInfo, summaryInfo.consignor)
  const manufacturerInfo = resolveInfo(summaryInfo.manufacturerInfo, summaryInfo.manufacturer)
  const testlabInfo = resolveInfo(summaryInfo.testlabInfo, summaryInfo.testlab)
  const enName = resolveInfo(summaryInfo.enName, summaryInfo.cnName)

  return {
    id: '',
    projectNo: '',
    projectId: '',
    consignor,
    consignorInfo,
    manufacturer,
    manufacturerInfo,
    testlab,
    testlabInfo,
    cnName: summaryInfo.cnName.split('\n')[0] ?? '',
    enName,
    classification: CLASSIFICATION_ID_MAP[classification as keyof typeof CLASSIFICATION_ID_MAP] ?? '',
    // @ts-ignore
    type: (summaryInfo.type || summaryInfo.model) ?? '',
    trademark: summaryInfo.trademark ?? '/',
    voltage: voltage === '0' ? '/' : voltage,
    capacity: capacity === '0' ? '/' : capacity,
    watt: wattHour === '0' ? '' : wattHour,
    color: COLOR_ID_MAP[color as keyof typeof COLOR_ID_MAP] ?? '',
    shape: SHAPE_ID_MAP[shape as keyof typeof SHAPE_ID_MAP] ?? '',
    mass: String(matchBatteryWeight('为' + summaryInfo.mass)),
    licontent: licontent === '0' ? '' : licontent,
    testReportNo: summaryInfo.testReportNo,
    testDate: summaryInfo.testDate.replace(/\./g, '-'),
    testManual: MANUAL_ID_MAP_SIMPLIFY[testManual as keyof typeof MANUAL_ID_MAP_SIMPLIFY] ?? '',
    test1: String(summaryInfo.test1.includes('通过')),
    test2: String(summaryInfo.test2.includes('通过')),
    test3: String(summaryInfo.test3.includes('通过')),
    test4: String(summaryInfo.test4.includes('通过')),
    test5: String(summaryInfo.test5.includes('通过')),
    test6: String(summaryInfo.test6.includes('通过')),
    test7: String(summaryInfo.test7.includes('通过')),
    test8: String(summaryInfo.test8.includes('通过')),
    un38f: String(summaryInfo.un38F.includes('通过')),
    un38g: String(summaryInfo.un38G.includes('通过')),
    note: !summaryInfo.note ? '/' : summaryInfo.note,
  }
}

export function summaryInfoToSummaryFromLLM(summaryInfo: SummaryInfo): SummaryFromLLM {
  const classification = removeNonChineseCharacters(summaryInfo.classification).trim()
  const color = matchColor(summaryInfo.shape)
  const shape = matchShape(summaryInfo.shape)
  const testManual = matchTestManual(summaryInfo.testManual)
  const wattHour = matchWattHour(' ' + summaryInfo.watt)
  const licontent = matchBatteryWeight('为' + summaryInfo.licontent)
  const voltage = matchVoltage(summaryInfo.voltage)
  const capacity = matchCapacity(summaryInfo.capacity)

  const resolveInfo = (info: string | undefined, base: string): string =>
    !info && base.includes('\n')
      ? base.split('\n').slice(1).join('\n').trim()
      : (info ?? base ?? '')
  const consignorInfo = resolveInfo(summaryInfo.consignorInfo, summaryInfo.consignor)
  const manufacturerInfo = resolveInfo(summaryInfo.manufacturerInfo, summaryInfo.manufacturer)
  const testLabInfo = resolveInfo(summaryInfo.testlabInfo, summaryInfo.testlab)
  const enName = resolveInfo(summaryInfo.enName, summaryInfo.cnName)

  const summaryFromLLM: SummaryFromLLM = {
    id: '',
    projectNo: '',
    projectId: '',
    consignor: summaryInfo.consignor.split('\n')[0] ?? '',
    consignorInfo,
    manufacturerCName: summaryInfo.manufacturer.split('\n')[0] ?? '',
    manufacturerInfo,
    testLab: summaryInfo.testlab.split('\n')[0] ?? '',
    testLabInfo,
    cnName: summaryInfo.cnName.split('\n')[0] ?? '',
    enName,
    // @ts-ignore
    classification: classification ?? '',
    // @ts-ignore
    model: (summaryInfo.type || summaryInfo.model) ?? '',
    trademark: summaryInfo.trademark ?? '/',
    voltage,
    capacity,
    watt: wattHour,
    color: color ?? '',
    shape: shape ?? '',
    mass: matchBatteryWeight('为' + summaryInfo.mass),
    licontent,
    testReportNo: summaryInfo.testReportNo,
    testDate: summaryInfo.testDate.replace(/\./g, '-'),
    // @ts-ignore
    testManual: testManual ?? '',
    test1: summaryInfo.test1.includes('通过'),
    test2: summaryInfo.test2.includes('通过'),
    test3: summaryInfo.test3.includes('通过'),
    test4: summaryInfo.test4.includes('通过'),
    test5: summaryInfo.test5.includes('通过'),
    test6: summaryInfo.test6.includes('通过'),
    test7: summaryInfo.test7.includes('通过'),
    test8: summaryInfo.test8.includes('通过'),
    un38f: summaryInfo.un38F.includes('通过'),
    un38g: summaryInfo.un38G.includes('通过'),
    note: !summaryInfo.note ? '/' : summaryInfo.note,
  }

  return summaryFromLLM
}