import { getServerPort } from './utils'

export interface DropStackSummary {
  batteryNum: number | null
  batteryWeight: number | null
  devicesNum: number | null
  deviceModel: string | null
  cnName: string | null
  enName: string | null
  model: string | null
  voltage: number | null
  capacity: number | null
  watt: number | null
  licontent: number | null
  isReportNoCorrect: boolean | null
  isDateCorrect: boolean | null
  loaded: number | null
  packageSize: string | null
  packageWeight: number | null
}

export type DropStackField = keyof DropStackSummary

const FIELD_LABELS: Record<DropStackField, string> = {
  batteryNum: '每包装件电池数量',
  batteryWeight: '每包装件电池总净重 (kg)',
  devicesNum: '每包装件设备数量',
  deviceModel: '设备型号',
  cnName: '电池中文名称',
  enName: '电池英文名称',
  model: '电池型号',
  voltage: '电池电压 (V)',
  capacity: '电池容量 (mAh)',
  watt: '电池瓦时 (Wh)',
  licontent: '锂含量 (g)',
  isReportNoCorrect: '报告编号是否一致',
  isDateCorrect: '日期是否合法',
  loaded: '堆码载荷 (kgf)',
  packageSize: '包装件尺寸 (mm)',
  packageWeight: '包装件毛重 (kg)',
}

// loaded 只适用于堆码报告，不参与两份报告的比对
const COMPARE_FIELDS: DropStackField[] = [
  'batteryNum',
  'batteryWeight',
  'devicesNum',
  'deviceModel',
  'cnName',
  'enName',
  'model',
  'voltage',
  'capacity',
  'watt',
  'licontent',
  'packageSize',
  'packageWeight',
]

const NUMBER_FIELDS = new Set<DropStackField>([
  'batteryNum',
  'batteryWeight',
  'devicesNum',
  'voltage',
  'capacity',
  'watt',
  'licontent',
  'loaded',
  'packageWeight',
])

export interface DropStackTableRow {
  field: DropStackField
  label: string
  drop: string
  stack: string
  ok: boolean | null
  compare: boolean
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' && value.trim() === '') return null
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

function toTextOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text === '' ? null : text
}

function toBoolOrNull(value: unknown): boolean | null {
  if (value === true) return true
  if (value === false) return false
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase()
    if (text === 'true') return true
    if (text === 'false') return false
  }
  return null
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizePackageSize(value: string): string {
  return value
    .replace(/mm/gi, '')
    .replace(/[×*X]/g, 'x')
    .replace(/\s+/g, '')
    .toLowerCase()
}

function normalizeValue(
  field: DropStackField,
  value: unknown
): string | number | null {
  if (NUMBER_FIELDS.has(field)) return toNumberOrNull(value)
  const text = toTextOrNull(value)
  if (text === null) return null
  return field === 'packageSize' ? normalizePackageSize(text) : normalizeText(text)
}

function isEqual(
  dropValue: string | number | null,
  stackValue: string | number | null
): boolean {
  if (dropValue === null && stackValue === null) return true
  if (dropValue === null || stackValue === null) return false
  return dropValue === stackValue
}

function formatValue(value: string | number | null): string {
  return value === null ? '—' : String(value)
}

export function buildDropStackRows(
  drop: DropStackSummary | null,
  stack: DropStackSummary | null
): DropStackTableRow[] {
  const rows: DropStackTableRow[] = COMPARE_FIELDS.map((field) => {
    const dropValue = drop ? normalizeValue(field, drop[field]) : null
    const stackValue = stack ? normalizeValue(field, stack[field]) : null
    const canCompare = !!drop && !!stack
    return {
      field,
      label: FIELD_LABELS[field],
      drop: drop ? formatValue(dropValue) : '—',
      stack: stack ? formatValue(stackValue) : '—',
      ok: canCompare ? isEqual(dropValue, stackValue) : null,
      compare: true,
    }
  })

  rows.push({
    field: 'loaded',
    label: FIELD_LABELS.loaded,
    drop: drop ? formatValue(normalizeValue('loaded', drop.loaded)) : '—',
    stack: stack ? formatValue(normalizeValue('loaded', stack.loaded)) : '—',
    ok: null,
    compare: false,
  })

  return rows
}

// 缓存端口查询结果，避免两个拖拽框并发解析时重复 IPC
let portPromise: Promise<number> | null = null
function getPort(): Promise<number> {
  if (!portPromise) portPromise = getServerPort()
  return portPromise
}

export async function parseDropStackReport(
  file: File
): Promise<DropStackSummary> {
  const formData = new FormData()
  formData.append('file', file, file.name)

  const port = await getPort()
  const response = await fetch(
    `http://127.0.0.1:${port}/upload-drop-or-stack-files`,
    {
      method: 'POST',
      body: formData,
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }

  const raw = (await response.json()) as string
  const summary = JSON.parse(stripCodeFence(raw)) as DropStackSummary
  if (!summary || typeof summary !== 'object') {
    throw new Error('大模型返回的内容不是 JSON 对象')
  }
  summary.isReportNoCorrect = toBoolOrNull(
    summary.isReportNoCorrect as unknown
  )
  summary.isDateCorrect = toBoolOrNull(summary.isDateCorrect as unknown)
  return summary
}

function stripCodeFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json|typescript|ts)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}
