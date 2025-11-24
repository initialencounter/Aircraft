import type {
  PekData,
  PekPkgInfo,
  PekUNNO,
  PkgInfoSubType,
  SekBtyType,
  SummaryFromLLM,
  SummaryInfo,
} from '../types'
import { removeNonChineseCharacters } from '../../../summary/checkColor'
import {
  matchDeviceModel,
  matchDeviceName,
  matchDeviceTrademark,
  matchTestManual,
} from './matchDevice'
import { PekSodiumData, PekSodiumPkgInfo, SekSodiumBtyType, SodiumPkgInfoSubType } from '../../../sodium/shared/types'

/**
 * 修复浮点数精度问题
 * @param value 原始值
 * @param precision 保留的小数位数，默认为2
 * @returns 修正后的值
 * @example fixFloatPrecision(16.08 * 1000) // 返回 16080 而不是 16079.999999999998
 */
function fixFloatPrecision(value: number, precision: number = 2): number {
  const multiplier = Math.pow(10, precision)
  return Math.round(value * multiplier) / multiplier
}

function matchWattHour(projectName: string) {
  const matches = [...projectName.matchAll(/\s(\d+\.?\d*)\s*([mMkK]?)[Ww][Hh]/g)]
  const results = matches.map((match) => match[1])
  const prefixes = matches.map((match) => match[2])
  let wattHour = parseFloat(results[results.length - 1])
  console.log('matchWattHour0:', wattHour)
  if (!results.length) return 0
  if (isNaN(wattHour)) return 0
  
  // 根据前缀进行单位换算（统一转换为瓦时Wh）
  const prefix = prefixes[prefixes.length - 1]
  if (prefix === 'M') {                      // 兆瓦时 → 瓦时: × 1,000,000
    wattHour = fixFloatPrecision(wattHour * 1000000)
  } else if (prefix === 'k' || prefix === 'K') { // 千瓦时 → 瓦时: × 1000
    wattHour = fixFloatPrecision(wattHour * 1000)
  } else if (prefix === 'm') {               // 毫瓦时 → 瓦时: ÷ 1000
    wattHour = fixFloatPrecision(wattHour / 1000)
  }
  // 无前缀就是瓦时，保持不变
  console.log('matchWattHour1:', wattHour)
  return wattHour
}

function matchVoltage(projectName: string) {
  const matches = [...projectName.matchAll(/(\d+\.?\d*)\s*([mMkK]?)[Vv]/g)]
  const results = matches.map((match) => match[1])
  const prefixes = matches.map((match) => match[2])
  let voltage = parseFloat(results[results.length - 1])
  if (!results.length) return 0
  if (isNaN(voltage)) return 0
  
  // 根据前缀进行单位换算（统一转换为伏V）
  const prefix = prefixes[prefixes.length - 1]
  if (prefix === 'M') {                      // 兆伏 → 伏: × 1,000,000
    voltage = fixFloatPrecision(voltage * 1000000)
  } else if (prefix === 'k' || prefix === 'K') { // 千伏 → 伏: × 1000
    voltage = fixFloatPrecision(voltage * 1000)
  } else if (prefix === 'm') {               // 毫伏 → 伏: ÷ 1000
    voltage = fixFloatPrecision(voltage / 1000)
  }
  // 无前缀就是伏，保持不变
  
  return voltage
}

function matchCapacity(projectName: string) {
  const matches = [...projectName.matchAll(/(\d+\.?\d*)\s*([mMkK]?)[Aa][Hh]/g)]
  const results = matches.map((match) => match[1])
  const prefixes = matches.map((match) => match[2])
  let result = parseFloat(results[results.length - 1])
  if (!results.length) return 0
  if (isNaN(result)) return 0
  
  // 根据前缀进行单位换算（统一转换为毫安时mAh）
  const prefix = prefixes[prefixes.length - 1]
  if (prefix === 'M') {                      // 兆安时 → 毫安时: × 1,000,000,000
    result = fixFloatPrecision(result * 1000000000)
  } else if (prefix === 'k' || prefix === 'K') { // 千安时 → 毫安时: × 1,000,000
    result = fixFloatPrecision(result * 1000000)
  } else if (prefix === 'm') {               // 毫安时，保持不变
    // 已经是目标单位
  } else {                                   // 安时 → 毫安时: × 1000
    result = fixFloatPrecision(result * 1000)
  }
  
  return result
}

function matchBatteryWeight(describe: string) {
  const weightRegex = /为(\d+\.?\d*)\s*(kg|g|千克|克)?/i;

  const match = describe.match(weightRegex);

  if (!match) {
    return 0;
  }

  const numericValue = parseFloat(match[1]);

  const unit = match[2]?.toLowerCase();
  if (!unit || unit === 'kg' || unit === '千克') {
    return fixFloatPrecision(numericValue * 1000);
  } else if (unit === 'g' || unit === '克') {
    return numericValue;
  }

  return numericValue; // 默认情况
}


export function matchTotalNetweight(sourceText: string): number {
  // 增强正则表达式，支持更多可能的格式
  const weightRegex = /总净重\s*[：:为]?\s*(\d+(?:\.\d+)?)\s*(kg|g|千克|克)?/i;

  const match = sourceText.match(weightRegex);

  if (!match) {
    return 0;
  }

  const numericValue = parseFloat(match[1]);

  const unit = match[2]?.toLowerCase();
  if (!unit || unit === 'kg' || unit === '千克') {
    return numericValue;
  } else if (unit === 'g' || unit === '克') {
    return fixFloatPrecision(numericValue / 1000);
  }

  return numericValue; // 默认情况
}

function getBtyTypeCode(currentData: PekData | PekSodiumData, isSodium: boolean = false): SekBtyType {
  const isIon: boolean = String(currentData['type1']) === '1'
  const isCell: boolean = String(currentData['type2']) === '1'
  const isSingleCell: boolean = currentData['otherDescribe'].includes('1790')
  if (isSodium) {
    if (isSingleCell) {
      return '602'
    }
    if (isCell) {
      return '601'
    } else {
      return '600'
    }
  } else {
    if (isIon) {
      if (isCell) return '501'
      else return isSingleCell ? '504' : '500'
    } else {
      if (isCell) return '503'
      else return isSingleCell ? '505' : '502'
    }
  }
}

function getIsIon(btyType: SekBtyType) {
  return btyType === '500' || btyType === '501' || btyType === '504'
}

function getIsCell(btyType: SekBtyType | SekSodiumBtyType) {
  return btyType === '501' || btyType === '503' || btyType === '601'
}

function getIsSingleCell(
  // 锂离子电池 锂离子电芯 锂金属电池 锂金属电芯 单芯锂离子电池 单芯锂金属电池
  // '500'     | '501'   | '502'   | '503'   | '504'       | '505'
  btyType: SekBtyType
) {
  return !['500', '502'].includes(btyType)
}

function pekIsDangerous(
  wattHour: number,
  pkgInfo: PekPkgInfo,
  liContent: number,
  netWeight: number,
  isSingleCell: boolean
): boolean {
  if (wattHour > 100) return true
  if (wattHour > 20 && isSingleCell) return true
  if (liContent > 2) return true
  if (liContent > 1 && isSingleCell) return true
  switch (pkgInfo) {
    case '965':
    case '968':
    case '952':
      return true
    case '966':
    case '967':
    case '969':
    case '970':
      return netWeight > 5
  }
  return false
}

function getPkgInfo(
  unNo: PekUNNO,
  isIon: boolean,
  otherDescribe: '0' | '1' | '2'
): PekPkgInfo {
  switch (otherDescribe) {
    case '0':
      return isIon ? '965' : '968'
    case '1':
      return isIon ? '966' : '969'
    case '2':
      if (unNo === 'UN3171' || unNo === 'UN3556' || unNo === 'UN3557') {
        return '952'
      }
      return isIon ? '967' : '970'
  }
}

function isBatteryLabel(
  pkgInfoSubType: PkgInfoSubType | SodiumPkgInfoSubType,
  shape: string
): boolean {
  switch (pkgInfoSubType) {
    case '952':
    case '965, IA':
    case '966, I':
    case '967, I':
    case '968, IA':
    case '969, I':
    case '970, I':
    case '976':
    case '977, I':
    case '978, I':
      return false
    case '970, II':
    case '978, II':
      return shape !== '8aad92b65aae82c3015ab094788a0026'
    case '965, IB':
    case '966, II':
    case '967, II':
    case '968, IB':
    case '969, II':
    case '977, II':
      return true
  }
  return false
}

function getPkgInfoByPackCargo(
  inspectionItem5Text1: PekPkgInfo,
  packCargo: string
): PekPkgInfo {
  const pkgInfo = getPkgInfoSubType(inspectionItem5Text1, packCargo)
  return pkgInfo === '' ? '' : (pkgInfo.slice(0, 3) as PekPkgInfo)
}

function getPkgInfoSubType(
  inspectionItem5Text1: PekPkgInfo,
  packCargo: string
): PkgInfoSubType {
  if (!inspectionItem5Text1 && !packCargo) return ''
  const clearPackCargo = packCargo.replace(/[^a-zA-Z0-9]/g, '')
  if (!clearPackCargo.length)
    return (inspectionItem5Text1 + ', II') as PkgInfoSubType
  if (clearPackCargo.length < 3) return '' as PkgInfoSubType
  if (clearPackCargo === '952') return '952'
  if (clearPackCargo === '976') return '976'
  const subType = clearPackCargo.replace(/[^A-Z]/g, '')
  return `${clearPackCargo.slice(0, 3)}, ${subType}` as PkgInfoSubType
}

function getUNNO(pkgInfo: PekPkgInfo | PekSodiumPkgInfo, isIon: boolean, isSodium: boolean = false): PekUNNO {
  switch (pkgInfo) {
    case '965':
      return 'UN3480'
    case '966':
    case '967':
      return 'UN3481'
    case '968':
      return 'UN3090'
    case '969':
    case '970':
      return 'UN3091'
    case '952':
      return isSodium ? 'UN3558' : (isIon ? 'UN3556' : 'UN3557')
    case '976':
      return 'UN3551'
    case '977':
    case '978':
      return 'UN3552'
  }
  return ''
}

function getIsCargoOnly(pkgInfo: PekPkgInfo | PekSodiumPkgInfo, netWeight: number) {
  switch (pkgInfo) {
    case '965':
    case '968':
    case '976':
      return true
    case '966':
    case '967':
    case '969':
    case '970':
    case '977':
    case '978':
      if (netWeight > 5) return true
      return false
    default:
      return false
  }
}

function pkgInfoIsIA(
  wattHour: number,
  pkgInfo: PekPkgInfo,
  liContent: number,
  netWeight: number,
  isSingleCell: boolean
): boolean {
  if (pkgInfo === '965') {
    if (wattHour > 100) {
      return true
    }
    if (isSingleCell && wattHour > 20) {
      return true
    }
    if (netWeight > 10) {
      return true
    }
    return false
  }
  if (pkgInfo === '968') {
    if (liContent > 2) {
      return true
    }
    if (isSingleCell && liContent > 1) {
      return true
    }
    return netWeight > 2.5
  }
  return false
}

function matchNumber(num: string) {
  num = num.replace(/ /g, '')
  const matches = [...num.matchAll(/[0-9]+(\.\d*)?/g)]
  const results = matches.map((match) => match[0])
  const result = parseFloat(results[0])
  if (isNaN(result)) return 0
  return result
}

export function convertSummaryInfo2SummaryFromLLM(
  data: SummaryInfo
): SummaryFromLLM {
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
    model: data.model,
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
    //@ts-ignore
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

export {
  fixFloatPrecision,
  matchWattHour,
  getBtyTypeCode,
  getIsSingleCell,
  pekIsDangerous,
  getPkgInfo,
  isBatteryLabel,
  getPkgInfoByPackCargo,
  getPkgInfoSubType,
  getUNNO,
  getIsCargoOnly,
  pkgInfoIsIA,
  matchNumber,
  matchVoltage,
  matchCapacity,
  matchBatteryWeight,
  getIsCell,
  getIsIon,
  matchDeviceName,
  matchDeviceModel,
  matchDeviceTrademark,
}
