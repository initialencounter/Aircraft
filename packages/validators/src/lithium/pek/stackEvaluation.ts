import { AttachmentInfo, CheckResult, PekData } from "../shared/types"

export function checkStackEvaluation(
  autoCheckStackEvaluation: boolean,
  manualCheckStackEvaluation: boolean,
  currentData: PekData,
  otherInfo: AttachmentInfo['other'] | undefined,
  systemId: string,
  categroy: string,
) {
  if (systemId !== 'pek' || categroy !== 'battery') return []
  const stackTest = String(currentData['inspectionItem6']) === '1' // 堆码
  const stackTestEvaluation = currentData['otherDescribe'].includes(
    '2c9180849267773c0192dc73c77e5fb2'
  )
  const results: CheckResult[] = []
  

  if (manualCheckStackEvaluation === true) {
    if (stackTestEvaluation || stackTest) {
      results.push({
        ok: true,
        result: `你已勾选${stackTest ? '堆码报告' : '评估单'}, 请确认`,
      })
    }
  }

  if (autoCheckStackEvaluation === true) {
    if (!otherInfo) {
      results.push({ ok: false, result: 'everything 搜不到编号, 无法验证堆码评估单' })
      return results
    }
    if (!otherInfo?.projectDir) {
      results.push({ ok: false, result: '找不到项目文件夹' })
    }
    if (stackTestEvaluation) {
      if (otherInfo.stackEvaluation === false) {
        results.push({ ok: false, result: `项目文件夹内不存在堆码评估单` })
      }
    } else {
      if (otherInfo.stackEvaluation === true) {
        results.push({ ok: false, result: '项目文件夹内存在堆码评估单' })
      }
    }
  }
  return results
}