import type { CheckResult } from './types'
import { btySizeBtyShape } from './btySizeBtyShape'
import { btySizeUnit } from './btySizeUnit'
import { btyWeightCalculate } from './btyWeightCalculate'
import { cellOrBattery } from './cellOrBattery'
import { itemCNameBtyType } from './itemCNameBtyType'
import { itemNameModel } from './itemNameModel'
import { voltageBtyType } from './voltageBtyType'
import { wattHourCalculate } from './wattHourCalculate'
import { checkDevice } from './checkDevice'
import { bytNumsCalculate } from './bytNumsCalculate'
import { checkEnergyDensity } from './energyDensity'
import { checkNicotineContent } from './nicotineContent'
import { containBatteryDesc } from './containBatteryDesc'
import { descriptionFormat } from './descriptionFormat'

export interface BaseCheckSelectors {
  btySize: string
  btyShape: string
  btyCount: string
  netWeight: string
  btyType: string
  itemCName: string
  itemEName: string
  btyKind: string
  voltage: string
  wattHour: string
  otherDescribe: string
}

/**
 * 基础检测
 * @param btySize 电池尺寸
 * @param btyShape 电池形状
 * @param batteryWeight 电池重量
 * @param btyCount 电池数量
 * @param netWeightDisplay 净重
 * @param btyType 电池类型
 * @param otherDescribeCAddition 其他描述补充
 * @param isChargeBoxOrRelated 是否为充电盒或关联报告
 * @param isCell 是否为电芯
 * @param itemCName 项目中文名称
 * @param itemEName 项目英文名称
 * @param btyKind 电池种类
 * @param voltage 电压
 * @param capacity 容量
 * @param wattHour 瓦时数
 * @param wattHourFromName 瓦时数从名称中获取
 * @param selectors 表单元素ID映射
 * @returns
 */
export function baseCheck(
  btySize: string,
  btyShape: string,
  batteryWeight: number,
  btyCount: number,
  netWeightDisplay: number,
  btyType: string,
  otherDescribeCAddition: string,
  isChargeBoxOrRelated: boolean,
  isCell: boolean,
  itemCName: string,
  itemEName: string,
  btyKind: string,
  voltage: number,
  capacity: number,
  wattHour: number,
  wattHourFromName: number,
  inspectionItem1: '0' | '1' | '2',
  activeState: boolean,
  isLithium: boolean,
  selectors: BaseCheckSelectors,
): CheckResult[] {
  const result: CheckResult[] = []
  // 尺寸或形状
  result.push(...btySizeUnit(btySize, selectors.btySize))
  result.push(...btySizeBtyShape(btySize, btyShape, selectors.btySize, selectors.btyShape))
  // 电池净重计算
  result.push(...btyWeightCalculate(batteryWeight, btyCount, netWeightDisplay, selectors.netWeight))
  // 电芯or电池
  result.push(
    ...cellOrBattery(isCell, otherDescribeCAddition, isChargeBoxOrRelated, selectors.otherDescribe)
  )
  // 电芯
  result.push(...itemCNameBtyType(itemCName, btyType, selectors.itemCName))
  // 电池型号不在项目中文名称中
  result.push(...itemNameModel(itemCName, itemEName, btyKind, selectors.itemCName, selectors.itemEName, selectors.btyKind))
  // 电压大于7V，可能为电池组
  result.push(...voltageBtyType(voltage, btyType, selectors.voltage))
  // 容量*电压 与 瓦时数 误差大于5%
  result.push(
    ...wattHourCalculate(capacity, voltage, wattHour, wattHourFromName, selectors.wattHour)
  )
  // 设备名称、型号、商标验证
  result.push(...checkDevice(itemCName, itemEName, otherDescribeCAddition, selectors.itemCName, selectors.itemEName, selectors.otherDescribe))
  // 尼古丁体积分数验证
  if (isLithium) result.push(...checkNicotineContent(otherDescribeCAddition, selectors.otherDescribe))
  // 967 防意外启动描述
  if (isLithium) result.push(...containBatteryDesc(otherDescribeCAddition, inspectionItem1, activeState, selectors.otherDescribe))
  // 描述格式验证
  result.push(...descriptionFormat(otherDescribeCAddition, selectors.otherDescribe))
  // 电池数量验证
  result.push(
    ...bytNumsCalculate(btyCount, otherDescribeCAddition, inspectionItem1, isChargeBoxOrRelated, selectors.btyCount)
  )
  // 电池能量密度验证
  if (isLithium) result.push(...checkEnergyDensity(wattHour, batteryWeight, selectors.otherDescribe))
  return result
}
