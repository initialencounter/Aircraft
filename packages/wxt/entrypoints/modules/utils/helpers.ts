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

const classificationMap: { [key: string]: string } = {
  '2500': '锂离子电池',
  '2501': '锂离子电芯',
  '2502': '锂金属电池',
  '2503': '锂金属电芯',
  '2504': '单电芯锂金属电池',
  '2505': '单电芯锂离子电池',
  '2510': '钠离子电池',
  '2511': '钠离子电芯',
  '2512': '单电芯钠离子电池',
}

const TEST_MANUAL_MAP: { [key: string]: string } = {
  '2911': '联合国《试验和标准手册》（第8版修订1）38.3节',
  '2906': '联合国《试验和标准手册》（第8版）38.3节',
  '2905': '联合国《试验和标准手册》（第7版修订1）38.3节',
  '2904': '联合国《试验和标准手册》（第7版）38.3节',
  '2903': '联合国《关于危险货物运输的建议书-试验和标准手册》（第6版修订1）38.3节',
  '2902': '联合国《关于危险货物运输的建议书-试验和标准手册》（第6版）38.3节',
  '2901': '联合国《关于危险货物运输的建议书-试验和标准手册》（第5版修订1和修订2）38.3节',
  '2910': '联合国《关于危险货物运输的建议书-试验和标准手册》（第5版）38.3节',
  '2909': '联合国《关于危险货物运输的建议书-试验和标准手册》（第4版修订2）38.3节',
  '2908': '联合国《关于危险货物运输的建议书-试验和标准手册》（第4版修订1）38.3节',
  '2907': '联合国《关于危险货物运输的建议书-试验和标准手册》（第4版）38.3节',
}

const TEST_MANUAL_EN_MAP: { [key: string]: string } = {
  '2911': 'UN "Manual of Tests and Criteria" ST/SG/AC.10/11/Rev.8/Amend1/Subsection 38.3',
  '2906': 'UN "Manual of Tests and Criteria" ST/SG/AC.10/11/Rev.8/Subsection 38.3',
  '2905': 'UN "Manual of Tests and Criteria" ST/SG/AC.10/11/Rev.7/Amend1/Subsection 38.3',
  '2904': 'UN "Manual of Tests and Criteria" ST/SG/AC.10/11/Rev.7/Subsection 38.3',
  '2903': 'UN Recommendations on the Transport of Dangerous Goods Manual of Tests and Criteria ST/SG/AC.10/11/Rev.6/Amend 1/Subsection 38.3',
  '2902': 'UN Recommendations on the Transport of Dangerous Goods Manual of Tests and Criteria ST/SG/AC.10/11/Rev.6/Subsection 38.3',
  '2901': 'UN Recommendations on the Transport of Dangerous Goods Manual of Tests and Criteria ST/SG/AC.10/11/Rev.5/Amend.1 and Amend.2/Subsection 38.3',
  '2910': 'UN Recommendations on the Transport of Dangerous Goods Manual of Tests and Criteria ST/SG/AC.10/11/Rev.5Subsection 38.3',
  '2909': 'UN Recommendations on the Transport of Dangerous Goods Manual of Tests and Criteria ST/SG/AC.10/11/Rev.4/ Amend.2/Subsection 38.3',
  '2908': 'UN Recommendations on the Transport of Dangerous Goods Manual of Tests and Criteria ST/SG/AC.10/11/Rev.4/Amend.1/Subsection 38.3',
  '2907': 'UN Recommendations on the Transport of Dangerous Goods Manual of Tests and Criteria ST/SG/AC.10/11/Rev.4/Subsection 38.3',
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
    classification: classificationMap[data.classification],
    type: data.type,
    model: data.type,
    trademark: data.trademark,
    voltage: data.voltage + "V",
    capacity: data.capacity + "mAh",
    watt: data.watt + "Wh",
    color: data.color,
    shape: data.shape,
    mass: data.mass + "g",
    licontent: data.licontent + "g",
    testReportNo: data.testReportNo,
    testDate: data.testDate,
    testManual: TEST_MANUAL_MAP[data.testManual] + "\n" + TEST_MANUAL_EN_MAP[data.testManual],
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