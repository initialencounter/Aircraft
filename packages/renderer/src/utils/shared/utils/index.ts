import {
  matchDeviceName,
  matchDeviceModel,
  matchDeviceTrademark,
} from './matchDevice'

export { matchDeviceName, matchDeviceModel, matchDeviceTrademark }

function matchWattHour(projectName: string) {
  const matches = [...projectName.matchAll(/\s(\d+\.?\d+)[Kk]?[Ww][Hh]/g)]
  const results = matches.map((match) => match[1])
  const rowText = matches.map((match) => match[0])[results.length - 1]
  let wattHour = Number(results[results.length - 1])
  if (!results.length) return 0
  if (isNaN(wattHour)) return 0
  if (rowText.toLowerCase().includes('kwh')) wattHour *= 1000
  return wattHour
}

function matchVoltage(projectName: string) {
  const matches = [...projectName.matchAll(/(\d+\.?\d*)[Vv]/g)]
  const results = matches.map((match) => match[1])
  const voltage = Number(results[results.length - 1])
  if (!results.length) return 0
  if (isNaN(voltage)) return 0
  return voltage
}

function matchCapacity(projectName: string) {
  const matches = [...projectName.matchAll(/(\d+\.?\d*)[Mm]?[Aa][Hh]/g)]
  const results = matches.map((match) => match[1])
  const rowText = matches.map((match) => match[0])[results.length - 1]
  let result = Number(results[results.length - 1])
  if (!results.length) return 0
  if (isNaN(result)) return 0
  if (!rowText.toLowerCase().includes('mah')) result *= 1000
  return result
}

function matchBatteryWeight(describe: string) {
  const matches = [...describe.matchAll(/为(\d+\.?\d*)[Kk]?g?/g)]
  const results = matches.map((match) => match[1])
  const rowText = matches.map((match) => match[0])[0]
  let weight = Number(results[0])
  if (!results.length) return 0
  if (isNaN(weight)) return 0
  if (rowText.toLowerCase().includes('kg')) weight = weight * 1000
  return weight
}

export { matchWattHour, matchVoltage, matchCapacity, matchBatteryWeight }
