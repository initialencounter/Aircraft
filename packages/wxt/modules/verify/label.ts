import { getSekExpectedLabel, getPekExpectedLabel, checkLabel } from '../../Validators/summary/goods/checkLabel'
import { getPkgInfoSubType } from '../../Validators/shared/utils'
import type { PekData, SekData } from '../../Validators/shared/types/index'

/**
 * 获取选中的标签
 */
export function getSelectedImages(): string[] {
  let selectedImages: HTMLImageElement[] = Array.from(document.querySelectorAll('img[data-selected="true"]'))
  let labels = []
  for (let img of selectedImages) {
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
export function checkLabelManual(systemId: 'pek' | 'sek', data: PekData | SekData): Array<{ ok: boolean; result: string }> {
  let labels = getSelectedImages()
  let expectedLabels
  
  if (systemId === 'pek') {
    let pekData = data as PekData
    let pkgInfoSubType = getPkgInfoSubType(pekData.inspectionItem5Text1, pekData.packCargo)
    expectedLabels = getPekExpectedLabel(pkgInfoSubType, Number(pekData.netWeight))
  } else {
    let sekData = data as SekData
    expectedLabels = getSekExpectedLabel(sekData.conclusions, sekData.unno)
  }
  
  return checkLabel(expectedLabels, labels)
}
