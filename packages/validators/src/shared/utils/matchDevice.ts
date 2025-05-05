export function matchDeviceName(otherDescribe: string) {
  return fetchLastRegexMatch(otherDescribe, /设备[:：](.*?)[。;；]/g)
}

export function matchDeviceModel(otherDescribe: string) {
  return fetchLastRegexMatch(
    otherDescribe,
    /设备[:：].*?[;；]型号[:：](.*?)[。；;]/g
  )
}

export function matchDeviceTrademark(otherDescribe: string) {
  return fetchLastRegexMatch(
    otherDescribe,
    /设备[:：].*?[;；]型号[:：].*?[；;]商标[:：](.*?)[。;；]/g
  )
}

export function matchTestManual(rawTestManual: string) {
  let revision = fetchLastRegexMatch(rawTestManual, /[Rr][Ee][Vv]\.?\s?(\d)/g)
  if (!revision) {
    revision = ''
  }
  const amend = matchAmend(rawTestManual)
  return '第' + revision + '版' + amend
}

function matchAmend(rawTestManual: string) {
  const amendList = rawTestManual.match(/[Aa][Mm][Ee][Nn][Dd]/g)
  if (amendList === null) {
    return ''
  } else if (amendList.length === 2) {
    return '修订1和修订2'
  } else {
    const amend = fetchLastRegexMatch(
      rawTestManual,
      /[Aa][Mm][Ee][Nn][Dd]\.?\s?(\d)/g
    )
    if (amend === '') {
      return ''
    } else {
      return '修订' + amend
    }
  }
}

function fetchLastRegexMatch(rawText: string, reg: RegExp) {
  const matches = [...rawText.matchAll(reg)]
  const results = matches.map((match) => match[1])
  const result = results[results.length - 1]
  if (!results.length) return ''
  return result
}

export function match967BatteryNumber(sourceText: string): number {
  const batteryNumRegex = /内置\s*(\d+)\s*块电池/
  const batteryMatch = sourceText.match(batteryNumRegex)
  return batteryMatch ? parseInt(batteryMatch[1], 10) : 0
}

export function match966BatteryNumber(sourceText: string): number {
  const batteryNumRegex = /与\s*(\d+)\s*块电池包装在一起/
  const batteryMatch = sourceText.match(batteryNumRegex)
  return batteryMatch ? parseInt(batteryMatch[1], 10) : 0
}

export function matchDeviceNumber(sourceText: string): number {
  const deviceNumRegex = /内含\s*(\d+)\s*台设备/
  const deviceMatch = sourceText.match(deviceNumRegex)
  return deviceMatch ? parseInt(deviceMatch[1], 10) : 0
}
