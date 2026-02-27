import { SummaryInfo } from 'aircraft-rs'
import { getQmsg } from '../../../share/qmsg'
import { BatteryTestSummary } from '../../../share/types'

/**
 * 创建一个延时函数，用于异步操作的等待
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 获取当前的系统ID (pek或sek)
 */
export function getSystemId(): 'pek' | 'sek' {
  return window.location.pathname.startsWith('/pek') ? 'pek' : 'sek'
}

/**
 * 获取当前的主机地址
 */
export function getHost(): string {
  return window.location.host
}

/**
 * 获取当前项目编号
 */
export function getCurrentProjectNo(): string | null {
  const projectNoElement = document.getElementById(
    'projectNo'
  ) as HTMLInputElement
  if (!projectNoElement) return null
  const projectNo = projectNoElement.innerHTML
  if (!projectNo) return null
  return projectNo
}

/**
 * 获取当前项目ID
 */
export function getCurrentProjectId(): string | null {
  const queryString = window.location.search
  const urlParams = new URLSearchParams(queryString)
  return urlParams.get('projectId')
}

/**
 * 阻止默认事件
 */
export function preventDefault(event: DragEvent): void {
  event.stopPropagation()
  event.preventDefault()
}

/**
 * 获取通知消息实例
 */
export function getNotification() {
  return getQmsg()
}

/**
 * 判断是否为检验页面
 */
export function isInspectPage(): boolean {
  return new URLSearchParams(window.location.search).get('from') === null
}

/**
 * 系统电池试验概要转为本地概要信息
 */

export function batteryTestSummaryToSummaryInfo(
  data: BatteryTestSummary
): SummaryInfo {
  const formatTestResult = (testValue: boolean | undefined): string =>
    testValue ? "通过     Pass" : "不适用     N/A";
  const summaryInfo: SummaryInfo = {
    id: data.id,
    projectId: data.projectId,
    consignor: data.consignor,
    consignorInfo: data.consignorInfo,
    manufacturer: data.manufacturer,
    manufacturerInfo: data.manufacturerInfo,
    testlab: data.testlab,
    testlabInfo: data.testlabInfo,
    cnName: data.cnName,
    enName: data.enName,
    classification: data.classification,
    type: data.type,
    model: data.type,
    trademark: data.trademark,
    voltage: data.voltage + "V",
    capacity: data.capacity + "mAh",
    watt: data.watt + "Wh",
    color: data.color,
    shape: data.shape,
    mass: data.mass + "g",
    licontent: data.licontent,
    testReportNo: data.testReportNo,
    testDate: data.testDate,
    testManual: data.testManual,
    test1: formatTestResult(data.test1),
    test2: formatTestResult(data.test2),
    test3: formatTestResult(data.test3),
    test4: formatTestResult(data.test4),
    test5: formatTestResult(data.test5),
    test6: formatTestResult(data.test6),
    test7: formatTestResult(data.test7),
    test8: formatTestResult(data.test8),
    un38f: formatTestResult(data.un38f),
    un38g: formatTestResult(data.un38g),
    un38F: formatTestResult(data.un38f),
    un38G: formatTestResult(data.un38g),
    note: data.note,
    title: "锂电池/钠离子电池UN38.3试验概要Test Summary",
    projectNo: data.projectNo,
    issueDate: data.issuedDate,
  }
  return summaryInfo
}