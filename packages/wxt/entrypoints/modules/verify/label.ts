import {
  checkLabel,
  getPekExpectedLabel,
  getSekExpectedLabel,
  getPkgInfoSubType,
} from '@aircraft/validators'
import type { PekData, SekData } from '@aircraft/validators'
import { PekSodiumData, SekSodiumData } from '../../../../validators/src/sodium/shared/types'

/**
 * 获取选中的标签
 */
export function getSelectedImages(): string[] {
  const selectedImages: HTMLImageElement[] = Array.from(
    document.querySelectorAll('img[data-selected="true"]')
  )
  const labels = []
  for (const img of selectedImages) {
    if (img.dataset.id) {
      labels.push(img.dataset.id.replace('lims-verify-label-', ''))
    }
  }
  console.log(labels)
  return labels
}

/**
 * 手动检查标签
 */
export function checkLabelManual(
  systemId: 'pek' | 'sek',
  data: PekData | SekData | PekSodiumData | SekSodiumData
): Array<{ ok: boolean; result: string }> {
  const labels = getSelectedImages()
  let expectedLabels

  if (systemId === 'pek') {
    const pekData = data as PekData
    const pkgInfoSubType = getPkgInfoSubType(
      pekData.inspectionItem5Text1,
      pekData.packCargo
    )
    expectedLabels = getPekExpectedLabel(
      pkgInfoSubType,
      Number(pekData.netWeight)
    )
  } else {
    const sekData = data as SekData
    expectedLabels = getSekExpectedLabel(sekData.conclusions, sekData.unno)
  }

  return checkLabel(expectedLabels, labels)
}
