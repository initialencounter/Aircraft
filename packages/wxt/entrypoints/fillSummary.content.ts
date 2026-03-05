import { sleep } from '../share/utils'
import { getQmsg } from '../share/qmsg'
import '../assets/message.min.css'
import { CLASSIFICATION_ID_MAP } from '../share/classificationMap'
import { SHAPE_ID_MAP } from '../share/shapeMap'
import { SummaryInfo } from 'aircraft-rs'
import { matchBatteryWeight, matchCapacity, matchVoltage, matchWattHour } from '../../validators/src/lithium/shared/utils'
import { matchTestManual } from '../../validators/src/lithium/shared/utils/matchDevice'
import { matchColor, removeNonChineseCharacters } from '../../validators/src/summary/checkColor'
import { COLOR_ID_MAP } from '../share/colorMap'
import { matchShape } from '../../validators/src/summary/checkShape'
import { FormFillJSONData } from '../share/types'

export default defineContentScript({
  runAt: 'document_end',
  matches: ['https://*/inspect/batterytest?*'],
  allFrames: true,
  async main() {
    chrome.storage.local.get(
      [
        'summaryDataFillEnabled',
      ],
      async function (result) {
        if (!(result.summaryDataFillEnabled === false)) {
          entrypoint()
        }
      }
    )
  },
})

async function entrypoint() {
  await sleep(400)
  const Qmsg = getQmsg()
  injectJQueryInterceptor()
  const body = document.querySelector("body > div.panel.easyui-fluid > div.easyui-panel.panel-body")
  if (!body) return

  // 拖拽文件监听（支持 .docx ）
  body.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.stopPropagation()
      ; (body as HTMLElement).style.outline = '2px dashed #4a90e2'
  })

  body.addEventListener('dragleave', (e) => {
    e.preventDefault()
    e.stopPropagation()
      ; (body as HTMLElement).style.outline = ''
  })

  body.addEventListener('drop', async (e) => {
    e.preventDefault()
    e.stopPropagation()
      ; (body as HTMLElement).style.outline = ''

    const files = Array.from((e as DragEvent).dataTransfer?.files ?? [])
    const accepted = files.filter((f) =>
      f.name.endsWith('.docx')
    )

    if (accepted.length === 0) {
      Qmsg.warning('请拖入 .docx 文件')
      return
    }

    for (const file of accepted) {
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer()
        const arrayNumber = Array.from(new Uint8Array(arrayBuffer))
        chrome.runtime.sendMessage({
          action: 'get-summary-info',
          summaryBuffer: arrayNumber,
        }, (response) => {
          if (response.error) {
            Qmsg.error(`解析文件失败: ${response.error}`)
          } else {
            const summaryInfo = response as SummaryInfo
            const formData = summaryInfoToForm(summaryInfo)
            console.log({
              summaryInfo,
              formData,
            })
            setFormData(formData)
            Qmsg.success(`已从文件 "${file.name}" 提取并填充概要信息`)
          }
        })
      }
    }
  })

  function injectJQueryInterceptor() {
    // 检查是否已经注入过
    if ((window as any).__jquery_intercepted) {
      return;
    }

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('jquery-interceptor.js');
    script.onload = () => {
      (window as any).__jquery_intercepted = true;
      script.remove();
    };
    script.onerror = (e) => {
      console.error('[JQuery Hook] Failed to load interceptor script:', e);
    };

    try {
      const target = document.head || document.documentElement || document;
      target.appendChild(script);
    } catch (e) {
      console.error('[JQuery Hook] Failed to inject script:', e);
    }
  }

  function setFormData(data: FormFillJSONData) {
    window.postMessage({
      type: 'FROM_FILL_SUMMARY', // 使用一个独特的类型来标识
      payload: data
    }, '*'); // 如果你知道目标源，最好指定具体的源，而不是 '*'
  }

  const matchTestManualMap = {
    '第8版修订1': '2911',
    '第8版': '2906',
    '第7版修订1': '2905',
    '第7版': '2904',
    '第6版修订1': '2903',
    '第6版': '2902',
    '第5版修订1和修订2': '2901',
    '第5版': '2910',
    '第4版修订2': '2909',
    '第4版修订1': '2808',
    '第4版': '2907',
  }

  function summaryInfoToForm(summaryInfo: SummaryInfo): FormFillJSONData {
    const classification = removeNonChineseCharacters(summaryInfo.classification).trim()
    const color = matchColor(summaryInfo.shape)
    const shape = matchShape(summaryInfo.shape)
    const testManual = matchTestManual(summaryInfo.testManual)
    const wattHour = String(matchWattHour(' ' + summaryInfo.watt) ?? '')
    const licontent = String(matchBatteryWeight('为' + summaryInfo.licontent) ?? '')
    const voltage = String(matchVoltage(summaryInfo.voltage) ?? '')
    const capacity = String(matchCapacity(summaryInfo.capacity) ?? '')

    const resolveInfo = (info: string | undefined, base: string): string =>
      !info && base.includes('\n')
        ? base.split('\n').slice(1).join('\n').trim()
        : (info ?? base ?? '')

    const consignorInfo = resolveInfo(summaryInfo.consignorInfo, summaryInfo.consignor)
    const manufacturerInfo = resolveInfo(summaryInfo.manufacturerInfo, summaryInfo.manufacturer)
    const testlabInfo = resolveInfo(summaryInfo.testlabInfo, summaryInfo.testlab)
    const enName = resolveInfo(summaryInfo.enName, summaryInfo.cnName)

    return {
      consignor: summaryInfo.consignor.split('\n')[0] ?? '',
      consignorInfo,
      manufacturer: summaryInfo.manufacturer.split('\n')[0] ?? '',
      manufacturerInfo,
      testlab: summaryInfo.testlab.split('\n')[0] ?? '',
      testlabInfo,
      cnName: summaryInfo.cnName.split('\n')[0] ?? '',
      enName,
      classification: CLASSIFICATION_ID_MAP[classification as keyof typeof CLASSIFICATION_ID_MAP] ?? '2500',
      type: (summaryInfo.type || summaryInfo.model) ?? '',
      trademark: summaryInfo.trademark ?? '/',
      voltage: voltage === '0' ? '/' : voltage,
      capacity: capacity === '0' ? '/' : capacity,
      watt: wattHour === '0' ? '' : wattHour,
      color: COLOR_ID_MAP[color as keyof typeof COLOR_ID_MAP] ?? '1856d2dd3623444c93101e39dc84ac59',
      shape: SHAPE_ID_MAP[shape as keyof typeof SHAPE_ID_MAP] ?? '8aad92b65c76a14d015c771747250caa',
      mass: String(matchBatteryWeight('为' + summaryInfo.mass)),
      licontent: licontent === '0' ? '' : licontent,
      testReportNo: summaryInfo.testReportNo,
      testDate: summaryInfo.testDate,
      testManual: matchTestManualMap[testManual as keyof typeof matchTestManualMap] ?? '2906',
      test1: summaryInfo.test1.includes('通过'),
      test2: summaryInfo.test2.includes('通过'),
      test3: summaryInfo.test3.includes('通过'),
      test4: summaryInfo.test4.includes('通过'),
      test5: summaryInfo.test5.includes('通过'),
      test6: summaryInfo.test6.includes('通过'),
      test7: summaryInfo.test7.includes('通过'),
      test8: summaryInfo.test8.includes('通过'),
      un38f: summaryInfo.un38F.includes('通过'),
      un38g: summaryInfo.un38G.includes('通过'),
      note: !summaryInfo.note ? '/' : summaryInfo.note,
    }
  }
}
