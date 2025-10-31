import { PekPkgInfo, PekUNNO } from "../../../lithium/shared/types"
import { PekSodiumData, PekSodiumPkgInfo, SekSodiumBtyType, SodiumPkgInfoSubType } from "../types"

export function getSodiumBtyTypeCode(currentData: PekSodiumData): SekSodiumBtyType {
  const isCell: boolean = String(currentData['type2']) === '1'
  const isSingleCell: boolean = currentData['otherDescribe'].includes('1790')
  if (isCell) return '601'
    else return isSingleCell ? '602' : '600'
}

export function getIsSodiumSingleCell(btyType: SekSodiumBtyType) {
  return btyType === '602'
}

export function getSodiumPkgInfo(
  unNo: PekUNNO,
  otherDescribe: '0' | '1' | '2'
): PekSodiumPkgInfo {
  switch (otherDescribe) {
    case '0':
      return '976'
    case '1':
      return '977'
    case '2':
      if (unNo === 'UN3558') {
        return '952'
      }
      return '978'
  }
}

export function getSodiumInfoSubType(
  inspectionItem5Text1: PekSodiumPkgInfo,
  packCargo: string
): SodiumPkgInfoSubType {
  if (inspectionItem5Text1 === '' && packCargo === '') return ''
  const clearPackCargo = packCargo.replace(/[^a-zA-Z0-9]/g, '')
  if (!clearPackCargo.length)
    return (inspectionItem5Text1 + ', II') as SodiumPkgInfoSubType
  if (clearPackCargo.length < 3) return '' as SodiumPkgInfoSubType
  if (clearPackCargo === '952') return '952'
  const subType = clearPackCargo.replace(/[^A-Z]/g, '')
  return `${clearPackCargo.slice(0, 3)}, ${subType}` as SodiumPkgInfoSubType
}

export function getSodiumPkgInfoByPackCargo(
  inspectionItem5Text1: PekSodiumPkgInfo,
  packCargo: string
): PekSodiumPkgInfo {
  const pkgInfo = getSodiumInfoSubType(inspectionItem5Text1, packCargo)
  return pkgInfo === '' ? '' : (pkgInfo.slice(0, 3) as PekSodiumPkgInfo)
}

export function pekSodiumIsDangerous(
  wattHour: number,
  pkgInfo: PekSodiumPkgInfo,
  netWeight: number,
  isSingleCell: boolean
): boolean {
  if (wattHour > 100) return true
  if (wattHour > 20 && isSingleCell) return true
  switch (pkgInfo) {
    case '976':
    case '952':
      return true
    case '977':
    case '978':
      return netWeight > 5
  }
  return false
}
