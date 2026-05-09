import { sleep } from '../share/utils'
import { getQmsg } from '../share/qmsg'
import '../assets/message.min.css'
import { ID_CLASSIFICATION_MAP } from '../share/classificationMap'
import { ID_SHAPE_MAP } from '../share/shapeMap'
import { SummaryInfo } from 'aircraft-rs'
import { ID_COLOR_MAP } from '../share/colorMap'
import { SummaryFormJSONData } from '../share/types'
import { ID_MANUAL_MAP } from '../share/manualMap'
import { summaryInfoToForm } from '../share/convert'

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
          summaryBytes: arrayNumber,
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

  function setCommonData(data: SummaryFormJSONData) {
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
      if (el && data[field as keyof SummaryFormJSONData]) {
        el.value = String(data[field as keyof SummaryFormJSONData])
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

  function setCheckboxValue(data: SummaryFormJSONData) {
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
      const value = data[key as keyof SummaryFormJSONData]
      if (checkboxYes && checkboxNo) {
        checkboxYes.checked = value === "true"
        checkboxNo.checked = value === "false"
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

  function jQuerySetDateBox(selector: string, date: string) {
    window.postMessage({
      type: 'JQUERY_SET_DATEBOX',
      selector,
      payload: date,
    }, '*');
  }
}
