export { checkPekBtyType } from './lithium/pek'
export { checkSekBtyType } from './lithium/sek'
export { checkSekAttachment, checkPekAttachment } from './summary'
export { checkSummaryFromLLM } from './lithium/llm'
export * from './lithium/shared/types'
export {
  checkLabel,
  getPekExpectedLabel,
  getSekExpectedLabel,
} from './summary/goods'
export { getPkgInfoSubType } from './lithium/shared/utils'

export { checkPekSodiumBtyType } from './sodium/pek'
export { checkSekSodiumBtyType } from './sodium/sek'
export { checkSekSodiumAttachment, checkPekSodiumAttachment } from './summary'

export { checkModel, checkModelWithFactory } from './lithium/shared/dangerousModel'
export { checkStackEvaluation } from './lithium/pek/stackEvaluation'

import { CheckResult, PekData, SekData } from './lithium/shared/types'
import { PekSodiumData, SekSodiumData } from './sodium/shared/types'
import { checkPekBtyType } from './lithium/pek'
import { checkSekBtyType } from './lithium/sek'
import { checkPekSodiumBtyType } from './sodium/pek'
import { checkSekSodiumBtyType } from './sodium/sek'

export function checkInspectData(
  dataFromForm: PekData | SekData | PekSodiumData | SekSodiumData,
  category: string,
  projectYear: string | undefined,
): CheckResult[] {
  const systemId = dataFromForm.projectNo.slice(0, 3).toLowerCase()
  if (category === 'battery') {
    if (systemId === 'pek') {
      return checkPekBtyType(dataFromForm as PekData, projectYear)
    } else {
      return checkSekBtyType(dataFromForm as SekData, projectYear)
    }
  } else {
    if (systemId === 'pek') {
      return checkPekSodiumBtyType(dataFromForm as PekSodiumData)
    } else {
      return checkSekSodiumBtyType(dataFromForm as SekSodiumData)
    }
  }
}