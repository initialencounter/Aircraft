import type {
  AttachmentInfo,
  EntrustData,
  PekData,
  SekData,
} from '@aircraft/validators'
import { getCurrentProjectNo } from '../utils/helpers'
import {
  getAttachmentFiles,
  getProjectAttachmentInfo,
} from '../utils/api'
import type { LocalConfig } from '../../../share/utils'
import { PekSodiumData, SekSodiumData } from '../../../../validators/src/sodium/shared/types';

/**
 * 检查附件文件
 */
export async function checkAttachmentFile(
  type: 'goodsfile' | 'batteryfile',
  projectNo: string,
  projectId: string
): Promise<Array<{ ok: boolean; result: string }>> {
  const AttachmentFilesName = type === 'goodsfile' ? '图片' : '概要'
  const AttachmentFilesText = await getAttachmentFiles(type, projectId)
  if (!AttachmentFilesText)
    return [{ ok: false, result: AttachmentFilesName + '未上传' }]
  const rawFileName = AttachmentFilesText.match(/"filename":"(.*?)\.pdf"/g)
  if (!rawFileName?.length)
    return [{ ok: false, result: AttachmentFilesName + '未上传' }]
  const fileName = rawFileName[0].slice(12, 29)
  if (fileName !== projectNo)
    return [{ ok: false, result: AttachmentFilesName + '上传错误' }]
  return []
}

/**
 * 检查所有附件文件
 */
export async function checkAttachmentFiles(
  projectNo: string,
  projectId: string
): Promise<Array<{ ok: boolean; result: string }>> {
  const check1 = await checkAttachmentFile('goodsfile', projectNo, projectId)
  const check2 = await checkAttachmentFile('batteryfile', projectNo, projectId)
  return [...check1, ...check2]
}

/**
 * 检查附件内容
 */
export async function checkAttachment(
  systemId: 'pek' | 'sek',
  dataFromForm: PekData | SekData | PekSodiumData | SekSodiumData,
  localConfig: typeof LocalConfig,
  entrustData: EntrustData,
  attachmentInfo: AttachmentInfo,
  isSodium: boolean,
): Promise<Array<{ ok: boolean; result: string }>> {
  if (localConfig.enableCheckAttachment === false) return []
  try {
    const projectNo = getCurrentProjectNo()
    if (!projectNo) return []
    if (!attachmentInfo?.goods || !attachmentInfo?.summary)
      return [{ ok: false, result: '无法获取本地的图片概要' }]

    if (!localConfig.enableLabelCheck) {
      attachmentInfo.goods.labels = ['pass']
    }

    return checkSummary(systemId, dataFromForm, attachmentInfo, entrustData, localConfig, isSodium)
  } catch (e) {
    console.log(e)
    return [{ ok: false, result: '附件解析失败' }]
  }
}

/**
 * 检查摘要
 */
export function checkSummary(
  systemId: 'pek' | 'sek',
  dataFromForm: PekData | SekData | PekSodiumData | SekSodiumData,
  attachmentInfo: AttachmentInfo,
  entrustData: EntrustData,
  localConfig: typeof LocalConfig,
  isSodium = false
): Array<{ ok: boolean; result: string }> {
  if (isSodium) {
    if (systemId === 'pek') {
      return window.checkPekSodiumAttachment(
        dataFromForm as PekSodiumData,
        attachmentInfo,
        entrustData
      )
    } else {
      return window.checkSekSodiumAttachment(
        dataFromForm as SekSodiumData,
        attachmentInfo,
        entrustData
      )
    }
  } else {
    if (systemId === 'pek') {
      let results: Array<{ ok: boolean; result: string }> = []
      if (localConfig.autoCheckStackEvaluation === true) {
        if (dataFromForm.otherDescribe.includes(
          '2c9180849267773c0192dc73c77e5fb2'
        )) {
          if (!attachmentInfo?.other) {
            results.push({ ok: false, result: '找不到项目文件夹' })
          }
          if (attachmentInfo?.other?.stackEvaluation === false) {
            results.push({ ok: false, result: `项目文件夹内找不到堆码评估单` })
          }
        }
        results.push(...window.checkPekAttachment(
          dataFromForm as PekData,
          attachmentInfo,
          entrustData
        ))
      }

      if (localConfig.manualCheckStackEvaluation === true) {
        const stackTest = String(dataFromForm['inspectionItem6']) === '1' // 堆码
        const stackTestEvaluation = dataFromForm.otherDescribe.includes(
          '2c9180849267773c0192dc73c77e5fb2'
        )
        if (stackTestEvaluation || stackTest) {
          results.push({ ok: true, result: `你已勾选${stackTest ? '堆码报告' : '评估单'}, 请确认` })
        }
      }
      results.push(...window.checkPekAttachment(
        dataFromForm as PekData,
        attachmentInfo,
        entrustData
      ))
      return results
    } else {
      return window.checkSekAttachment(
        dataFromForm as SekData,
        attachmentInfo,
        entrustData
      )
    }
  }

}

const LABEL_RGB_MAP = {
  '9': [255, 0, 0],
  '9A': [0, 0, 255],
  'bty': [0, 255, 0],
  'CAO': [128, 128, 128],
}

/**
 * 将 YOLO segment 的 mask 绘制在输入图像上
 * @param attachmentInfo 附件信息
 * @returns 返回包含绘制结果的 canvas 元素、base64 图像数据和图片尺寸
 */
export async function drawSegmentMask(attachmentInfo: AttachmentInfo): Promise<{
  canvas: HTMLCanvasElement;
  imageData: string;
  width: number;
  height: number;
} | null> {
  const { goods: { packageImage, segmentResults } } = attachmentInfo;

  // 检查是否有图像数据
  if (!packageImage || packageImage.length === 0) {
    console.warn('没有图像数据');
    return null;
  }

  // 将 Uint8Array 转换为 Blob，然后创建 Image 对象
  const blob = new Blob([new Uint8Array(packageImage)], { type: 'image/jpeg' });
  const imageUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        // 计算目标尺寸
        let targetWidth = img.width;
        let targetHeight = img.height;

        targetWidth = 250;
        // 等比缩放高度
        targetHeight = (img.height * targetWidth) / img.width;

        // 创建 canvas
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('无法获取 canvas context'));
          return;
        }

        // 计算缩放比例
        const scaleX = targetWidth / img.width;
        const scaleY = targetHeight / img.height;

        // 绘制原始图像（缩放）
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // 为每个检测结果绘制边框
        if (segmentResults && segmentResults.length > 0) {
          segmentResults.forEach((result, index) => {
            const { x1, y1, x2, y2, label, confidence } = result;

            // 计算缩放后的坐标
            const scaledX1 = x1 * scaleX;
            const scaledY1 = y1 * scaleY;
            const scaledX2 = x2 * scaleX;
            const scaledY2 = y2 * scaleY;

            // @ts-ignore
            const rgb = LABEL_RGB_MAP[label];

            // 绘制边界框
            ctx.strokeStyle = `rgb(${rgb.join(',')})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(scaledX1, scaledY1, scaledX2 - scaledX1, scaledY2 - scaledY1);

            // 绘制标签和置信度
            const text = `${label} ${(confidence * 100).toFixed(1)}%`;
            ctx.font = '14px Arial';
            const textMetrics = ctx.measureText(text);
            const textHeight = 20;

            // 绘制文本背景
            ctx.fillStyle = `rgb(${rgb.join(',')})`;
            ctx.fillRect(scaledX1, scaledY1 - textHeight, textMetrics.width + 8, textHeight);

            // 绘制文本
            ctx.fillStyle = 'white';
            ctx.fillText(text, scaledX1 + 4, scaledY1 - 5);
          });
        }

        // 转换为 base64
        const imageData = canvas.toDataURL('image/png');

        // 清理 URL
        URL.revokeObjectURL(imageUrl);

        resolve({
          canvas,
          imageData,
          width: targetWidth,
          height: targetHeight
        });
      } catch (error) {
        URL.revokeObjectURL(imageUrl);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('图像加载失败'));
    };

    img.src = imageUrl;
  });
}

export function showSegmentMask(image: {
  canvas: HTMLCanvasElement;
  imageData: string;
  width: number;
  height: number;
}): void {
  if (!image) return
  document.getElementById('lims-verify-label-container')?.remove()
  const panel = document.querySelector(
    'body > div.panel.easyui-fluid > div.easyui-panel.panel-body > div'
  ) as HTMLDivElement

  if (!panel) return

  const imagePosition = document.querySelector(
    '#batteryInspectForm > div > div:nth-child(5) > table'
  )
  if (!imagePosition) return

  const container = document.createElement('div')
  container.id = 'lims-verify-label-container'
  Object.assign(container.style, {
    id: 'lims-verify-label-container',
    width: 'auto',
    height: 'auto',
    display: 'flex',
    'flex-direction': 'row',
    position: 'absolute',
  })

  const y = imagePosition.getBoundingClientRect().y
  container.style.top = y + 'px'

  // 动态调整位置
  setInterval(() => {
    const width = imagePosition.getBoundingClientRect().width
    const x =
      imagePosition.getBoundingClientRect().x +
      width -
      container.getBoundingClientRect().width
    container.style.left = x + 'px'
  }, 200)

  // 添加标签选择图片
  const img = document.createElement('img')
  Object.assign(img.style, {
    id: 'segment-mask-image',
    width: image.width + 'px',
    height: image.height + 'px',
    objectFit: 'cover',
    opacity: '1',
    transition: 'all 0.3s',
    margin: '5px',
    border: '5px solid transparent', // 初始时设置透明边框
  })

  img.src = image.imageData
  container.appendChild(img)
  document.body.appendChild(container)
}