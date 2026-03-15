import { sleep } from '../share/utils'
import { getQmsg } from '../share/qmsg'
import '../assets/message.min.css'
import { CLASSIFICATION_ID_MAP, ID_CLASSIFICATION_MAP } from '../share/classificationMap'
import { ID_SHAPE_MAP, SHAPE_ID_MAP } from '../share/shapeMap'
import { SummaryInfo } from 'aircraft-rs'
import { matchBatteryWeight, matchCapacity, matchVoltage, matchWattHour } from '../../validators/src/lithium/shared/utils'
import { matchTestManual } from '../../validators/src/lithium/shared/utils/matchDevice'
import { matchColor, removeNonChineseCharacters } from '../../validators/src/summary/checkColor'
import { COLOR_ID_MAP, ID_COLOR_MAP } from '../share/colorMap'
import { matchShape } from '../../validators/src/summary/checkShape'
import { FormFillJSONData } from '../share/types'
import { ID_MANUAL_MAP } from '../share/manualMap'

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
            setCommonData(formData)
            jQuerySetDateBox('#testDate', formData.testDate)
            setCheckboxValue(formData)
            setClassification(formData.classification)
            setColor(formData.color)
            setShape(formData.shape)
            setTestManual(formData.testManual)
            Qmsg.success(`已从文件 "${file.name}" 提取并填充概要信息`)
          }
        })
      }
    }
  })

  function setCommonData(data: FormFillJSONData) {
    const fields = [
      'consignor',
      'consignorInfo',
      'manufacturer',
      'manufacturerInfo',
      'testlab',
      'testlabInfo',
      'cnName',
      'enName',
      'type',
      'trademark',
      'voltage',
      'capacity',
      'watt',
      'mass',
      'licontent',
      'testReportNo',
      'note',
    ]
    for (const field of fields) {
      const el = document.getElementById(field) as HTMLInputElement | HTMLTextAreaElement | null
      if (el && data[field as keyof FormFillJSONData]) {
        el.value = String(data[field as keyof FormFillJSONData])
      }
    }
  }

  function setClassification(classificationId: string) {
    if (!classificationId) return
    const chineseName = ID_CLASSIFICATION_MAP[classificationId as keyof typeof ID_CLASSIFICATION_MAP]
    if (chineseName) {
      // 更新显示文本
      const textEl = document.getElementById('classificationText')
      if (textEl) textEl.textContent = chineseName

      // 更新隐藏 input 的值
      const valueEl = document.getElementById('classificationValue') as HTMLInputElement | null
      if (valueEl) valueEl.value = classificationId

      // 清空 combogrid 文本输入框，避免遮挡 span
      const comboTextInput = document.querySelector(
        '#classificationGrid ~ span.textbox input.textbox-text'
      ) as HTMLInputElement | null
      if (comboTextInput) comboTextInput.value = ''
    } else {
      Qmsg.warning(`未找到 classification id=${classificationId} 对应的类别`)
    }
  }

  function setColor(colorId: string) {
    if (!colorId) return
    const chineseName = ID_COLOR_MAP[colorId as keyof typeof ID_COLOR_MAP]
    if (chineseName) {
      const textEl = document.getElementById('colorText')
      if (textEl) textEl.textContent = chineseName

      const valueEl = document.getElementById('colorValue') as HTMLInputElement | null
      if (valueEl) valueEl.value = colorId

      const comboTextInput = document.querySelector(
        '#colorGrid ~ span.textbox input.textbox-text'
      ) as HTMLInputElement | null
      if (comboTextInput) comboTextInput.value = ''
    } else {
      Qmsg.warning(`未找到 color id=${colorId} 对应的颜色`)
    }
  }

  function setShape(shapeId: string) {
    if (!shapeId) return
    const chineseName = ID_SHAPE_MAP[shapeId as keyof typeof ID_SHAPE_MAP]
    if (chineseName) {
      const textEl = document.getElementById('shapeText')
      if (textEl) textEl.textContent = chineseName

      const valueEl = document.getElementById('shapeValue') as HTMLInputElement | null
      if (valueEl) valueEl.value = shapeId

      const comboTextInput = document.querySelector(
        '#shapeGrid ~ span.textbox input.textbox-text'
      ) as HTMLInputElement | null
      if (comboTextInput) comboTextInput.value = ''
    } else {
      Qmsg.warning(`未找到 shape id=${shapeId} 对应的形状`)
    }
  }

  function setTestManual(testManualId: string) {
    if (!testManualId) return
    const chineseName = ID_MANUAL_MAP[testManualId as keyof typeof ID_MANUAL_MAP]
    if (chineseName) {
      const textEl = document.getElementById('testManualText')
      if (textEl) textEl.innerHTML = chineseName

      const valueEl = document.getElementById('testManualValue') as HTMLInputElement | null
      if (valueEl) valueEl.value = testManualId

      const comboTextInput = document.querySelector(
        '#commentGrid ~ span.textbox input.textbox-text'
      ) as HTMLInputElement | null
      if (comboTextInput) comboTextInput.value = ''
    } else {
      Qmsg.warning(`未找到 testManual id=${testManualId} 对应的手册`)
    }
  }

  function setCheckboxValue(data: FormFillJSONData) {
    const checkboxs = [
      'test1',
      'test2',
      'test3',
      'test4',
      'test5',
      'test6',
      'test7',
      'test8',
      'un38f',
      'un38g',
    ]
    for (const key of checkboxs) {
      const checkboxYes = document.getElementById(`radio_yes_${key}`) as HTMLInputElement
      const checkboxNo = document.getElementById(`radio_no_${key}`) as HTMLInputElement
      const value = data[key as keyof FormFillJSONData]
      if (checkboxYes && checkboxNo) {
        checkboxYes.checked = value === true
        checkboxNo.checked = value === false
      }
    }
  }

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
      classification: CLASSIFICATION_ID_MAP[classification as keyof typeof CLASSIFICATION_ID_MAP] ?? '',
      // @ts-ignore
      type: (summaryInfo.type || summaryInfo.model) ?? '',
      trademark: summaryInfo.trademark ?? '/',
      voltage: voltage === '0' ? '/' : voltage,
      capacity: capacity === '0' ? '/' : capacity,
      watt: wattHour === '0' ? '' : wattHour,
      color: COLOR_ID_MAP[color as keyof typeof COLOR_ID_MAP] ?? '',
      shape: SHAPE_ID_MAP[shape as keyof typeof SHAPE_ID_MAP] ?? '',
      mass: String(matchBatteryWeight('为' + summaryInfo.mass)),
      licontent: licontent === '0' ? '' : licontent,
      testReportNo: summaryInfo.testReportNo,
      testDate: summaryInfo.testDate,
      testManual: matchTestManualMap[testManual as keyof typeof matchTestManualMap] ?? '',
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

  function jQuerySetDateBox(selector: string, date: string) {
    window.postMessage({
      type: 'JQUERY_SET_DATEBOX',
      selector,
      payload: date,
    }, '*');
  }
}
