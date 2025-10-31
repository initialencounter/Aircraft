import type {
  PekData,
  PekPkgInfo,
  PekUNNO,
  PkgInfoSubType,
  SekBtyType,
  SummaryFromLLM,
  SummaryInfo,
} from '../types'
import { removeNonChineseCharacters } from '@aircraft/validators/summary/checkColor'
import {
  matchDeviceModel,
  matchDeviceName,
  matchDeviceTrademark,
  matchTestManual,
} from './matchDevice'
import { PekSodiumPkgInfo, SekSodiumBtyType, SodiumPkgInfoSubType } from '../../../sodium/shared/types'

function matchWattHour(projectName: string) {
  const matches = [...projectName.matchAll(/\s(\d+\.?\d*)\s*[MmKk]?[Ww][Hh]/g)]
  const results = matches.map((match) => match[1])
  const rowText = matches.map((match) => match[0])[results.length - 1]
  let wattHour = Number(results[results.length - 1])
  if (!results.length) return 0
  if (isNaN(wattHour)) return 0
  if (rowText.toLowerCase().includes('kwh')) wattHour *= 1000
  if (rowText.toLowerCase().includes('mwh')) wattHour /= 1000
  return wattHour
}

function matchVoltage(projectName: string) {
  const matches = [...projectName.matchAll(/(\d+\.?\d*)\s*[MmKk]?[Vv]/g)]
  const results = matches.map((match) => match[1])
  const rowText = matches.map((match) => match[0])[results.length - 1]
  let voltage = Number(results[results.length - 1])
  if (!results.length) return 0
  if (isNaN(voltage)) return 0
  if (rowText.toLowerCase().includes('mv')) voltage /= 1000
  if (rowText.toLowerCase().includes('kv')) voltage *= 1000
  return voltage
}

function matchCapacity(projectName: string) {
  const matches = [...projectName.matchAll(/(\d+\.?\d*)\s*[MmKk]?[Aa][Hh]/g)]
  const results = matches.map((match) => match[1])
  const rowText = matches.map((match) => match[0])[results.length - 1]
  let result = Number(results[results.length - 1])
  if (!results.length) return 0
  if (isNaN(result)) return 0
  if (rowText.toLowerCase().includes('kah')) {// kAh
    result *= 1000 * 1000
  } else if (!rowText.toLowerCase().includes('mah')) result *= 1000
  return result
}

function matchBatteryWeight(describe: string) {
  const matches = [...describe.matchAll(/为(\d+\.?\d*)\s*[Kk]?g?/g)]
  const results = matches.map((match) => match[1])
  const rowText = matches.map((match) => match[0])[0]
  let weight = Number(results[0])
  if (!results.length) return 0
  if (isNaN(weight)) return 0
  if (rowText.toLowerCase().includes('kg')) weight = weight * 1000
  return weight
}

function getBtyTypeCode(currentData: PekData): SekBtyType {
  const isIon: boolean = String(currentData['type1']) === '1'
  const isCell: boolean = String(currentData['type2']) === '1'
  const isSingleCell: boolean = currentData['otherDescribe'].includes('1790')
  if (isIon) {
    if (isCell) return '501'
    else return isSingleCell ? '504' : '500'
  } else {
    if (isCell) return '503'
    else return isSingleCell ? '505' : '502'
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
  if (inspectionItem5Text1 === '' && packCargo === '') return ''
  const clearPackCargo = packCargo.replace(/[^a-zA-Z0-9]/g, '')
  if (!clearPackCargo.length)
    return (inspectionItem5Text1 + ', II') as PkgInfoSubType
  if (clearPackCargo.length < 3) return '' as PkgInfoSubType
  if (clearPackCargo === '952') return '952'
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

function parseNetWeight(net_weight: string) {
  net_weight = net_weight.replace(/ /g, '')
  if (net_weight.length === 0) {
    return NaN
  }
  switch (net_weight) {
    case '<5':
      return 4.9
    case '＜5':
      return 4.9
    case '<35':
      return 34.9
    case '＜35':
      return 34.9
    default:
      return Number(net_weight)
  }
}

function matchNumber(num: string) {
  num = num.replace(/ /g, '')
  const matches = [...num.matchAll(/[0-9]+(\.\d*)?/g)]
  const results = matches.map((match) => match[0])
  const result = Number(results[0])
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
  parseNetWeight,
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
