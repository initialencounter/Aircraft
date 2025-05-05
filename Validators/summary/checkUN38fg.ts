import { CheckResult } from "../shared/types/index";

export function checkUN38fg(
  un38f: string,
  un38g: string,
): CheckResult[] {
  const result: CheckResult[] = []
  if (!un38f.includes('不适用')){
    result.push({ok: false, result: "un38f应为不适用"})
  }
  if (!un38g.includes('不适用')){
    result.push({ok: false, result: "un38g应为不适用"})
  }
  return result
}