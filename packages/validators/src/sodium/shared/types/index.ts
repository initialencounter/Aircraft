export interface PekSodiumData {
  according: string
  appraiseDate: string
  appraiser: string
  appraiserName: string
  brands: string
  btyCount: string
  checkDate: number
  checked: boolean
  checker: string
  checkerName: string
  checkLocation: string
  checkLocationName: string
  classOrDiv: string
  color: string
  conclusions: number
  createdBy: string
  createdDate: string
  editStatus: number
  grossWeight: string
  id: string
  inspectionItem1: number
  inspectionItem1Text1: string
  inspectionItem1Text2: string
  inspectionItem1Text3: string
  inspectionItem1Text4: string
  inspectionItem2: number
  inspectionItem2Text1: string
  inspectionItem2Text2: string
  inspectionItem3: number
  inspectionItem3Text1: string
  inspectionItem4: number
  inspectionItem4Text1: string
  inspectionItem5: number
  inspectionItem5Text1: PekSodiumPkgInfo
  inspectionItem6: number
  itemCName: string
  itemEName: string
  market: string
  model: string
  modifiedBy: string
  modifiedDate: string
  netWeight: string
  otherDescribe: string
  otherDescribeCAddition: string
  otherDescribeChecked: string
  otherDescribeEAddition: string
  packCargo: string
  packPassengerCargo: string
  packSpecial: string
  packSubDanger: string
  pg: string
  principalName: null
  projectId: string
  projectNo: string
  psn: string
  remarks: string
  result1: string
  shape: string
  size: string
  type1: number
  type2: number
  unno: string
}

export interface SekSodiumData {
  according: string
  appraiseDate: string
  appraiser: string
  appraiserName: string
  brands: string
  btyBrand: string
  btyColor: string
  btyCount: string
  btyCountChecked: string
  btyGrossWeight: string
  btyGrossWeightChecked: string
  btyKind: string
  btyNetWeight: string
  btyNetWeightChecked: string
  btyShape: string
  btySize: string
  btyType: string
  checkDate: number
  checked: boolean
  checker: string
  checkerName: string
  checkLocation: string
  checkLocationName: string
  classOrDiv: string
  color: string
  comment: string
  commentExtra: null | string
  conclusions: number
  createdBy: string
  createdDate: string
  editStatus: number
  grossWeight: string
  id: string
  inspectionItem1: string
  inspectionItem1Text1: string
  inspectionItem1Text2: string
  inspectionItem1Text3: string
  inspectionItem1Text4: string
  inspectionItem2: string
  inspectionItem2Text1: string
  inspectionItem2Text2: string
  inspectionItem3: string
  inspectionItem3Text1: string
  inspectionItem4: string
  inspectionItem4Text1: string
  inspectionItem5: string
  inspectionItem5Text1: string
  inspectionItem6: string
  inspectionItem7: string
  inspectionItem8Cn: string
  inspectionItem8En: string
  inspectionItem9Cn: string
  inspectionItem9En: string
  inspectionResult1: string
  inspectionResult2: string
  inspectionResult3: string
  inspectionResult4: string
  inspectionResult5: string
  inspectionResult6: string
  inspectionResult7: string
  inspectionResult8: string
  inspectionResult9: string
  itemCName: string
  itemEName: string
  market: string
  model: string
  modifiedBy: string
  modifiedDate: string
  netWeight: string
  otherDescribe: string
  otherDescribeCAddition: string
  otherDescribeChecked: string
  otherDescribeEAddition: string
  packCargo: string
  packPassengerCargo: string
  packSpecial: string
  packSubDanger: string
  pg: string
  principalName: null
  projectId: string
  projectNo: string
  psn: string
  remarks: string
  result1: string
  shape: string
  size: string
  type1: number
  type2: number
  unno: string
}

/**
 * 600 钠离子电池 
 * 601 钠离子电芯 
 * 602 单电芯钠离子电池
 */
export type SekSodiumBtyType = '600' | '601' | '602'

export type PekSodiumPkgInfo =
  | ''
  | '952'
  | '976'
  | '977'
  | '978'

export type SodiumPkgInfoSubType =
  | ''
  | '952'
  | '976'
  | '977, I'
  | '977, II'
  | '978, I'
  | '978, II'
