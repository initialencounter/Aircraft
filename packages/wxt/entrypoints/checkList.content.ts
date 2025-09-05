import { sleep } from '../share/utils'
import { getQmsg } from '../share/qmsg'
import '../assets/message.min.css'

export default defineContentScript({
  runAt: 'document_end',
  matches: [
    'https://*/rek/inspect*',
    'https://*/aek/inspect*',
    'https://*/sek/inspect*',
  ],
  allFrames: true,
  async main() {
    chrome.storage.local.get(
      [
        'dataCompare',
      ],
      async function (result) {
        if (result.dataCompare === true) {
          entrypoint()
        }
      }
    )
  },
})

async function entrypoint() {
  await sleep(200)
  const Qmsg = getQmsg()
  const headerBar = document.querySelector(
    'body > div.panel.easyui-fluid > div.panel-header'
  )
  if (!headerBar) return
  headerBar.addEventListener('click', () => {
    setFormDataToClipBoard()
  })
  const targetChild = document.getElementById('openDocumentsBtn0')
  if (!targetChild) return
  const targetParent = targetChild.parentElement
  if (!targetParent) return
  const checkListButton = document.createElement('a')
  checkListButton.id = 'lims-checkListButton'
  checkListButton.href = 'javascript:void(0);'
  checkListButton.className = 'easyui-linkbutton l-btn l-btn-small'
  checkListButton.style.background = '#ffffff'
  // hover
  checkListButton.onmouseover = function () {
    checkListButton.style.background = '#54a124'
  }
  checkListButton.onmouseout = function () {
    checkListButton.style.background = '#ffffff'
  }
  checkListButton.innerHTML = `
    <span class='l-btn-left l-btn-icon-left'>
      <span class='l-btn-text'>对比</span>
      <svg class='l-btn-icon' xmlns='http://www.w3.org/2000/svg' height='24px' viewBox='0 -960 960 960' width='24px' fill='#bbbbbb'><path d='M500-520h80v-80h80v-80h-80v-80h-80v80h-80v80h80v80Zm-80 160h240v-80H420v80ZM320-200q-33 0-56.5-23.5T240-280v-560q0-33 23.5-56.5T320-920h280l240 240v400q0 33-23.5 56.5T760-200H320Zm0-80h440v-360L560-840H320v560ZM160-40q-33 0-56.5-23.5T80-120v-560h80v560h440v80H160Zm160-240v-560 560Z'/></svg>
    </span>
    `
  checkListButton.onclick = handleDiffClick
  targetParent.appendChild(checkListButton)
  console.log('对比按钮插入成功！')

  function getFormDataJSON() {
    const form = document.querySelector(
      '#batteryInspectForm'
    ) as HTMLFormElement
    // 获取表单数据
    const data = {} as FormJSONData
    const formData = new FormData(form)
    const projectNo = (document.getElementById('projectNo') as HTMLInputElement).innerHTML
    data['projectNo'] = projectNo
    formData.forEach((value, name) => {
      if (data[name as keyof FormJSONData]) {
        data[name as keyof FormJSONData] = (data[name as keyof FormJSONData] +
          `,${value}`) as FormJSONData[keyof FormJSONData]
      } else {
        data[name as keyof FormJSONData] =
          value as FormJSONData[keyof FormJSONData]
      }
    })
    data['comment'] = data['comment'].slice(1)
    data['remarks'] = data['remarks'].slice(1)
    return data
  }

  function setFormDataToClipBoard() {
    const data = getFormDataJSON()
    const jsonText = JSON.stringify(data, null, 2)
    navigator.clipboard.writeText(jsonText)
    Qmsg.success('已复制检查清单', { timeout: 500 })
  }

  async function handleDiffClick() {
    try {
      const jsonText = await navigator.clipboard.readText()
      const data = JSON.parse(jsonText)
      const diffDataKeys = compareFormData(data)
      if (diffDataKeys.length > 0) {
        Qmsg.error(JSON.stringify(diffDataKeys, null, 2), { timeout: 3000 })
      } else {
        Qmsg.success(`与检验单 ${data.projectNo} 数据一致`, { timeout: 500 })
        const verifyButton = document.getElementById('lims-checkListButton')
          ?.children[0]?.children[1] as SVGAElement
        if (verifyButton) verifyButton.setAttribute('fill', '#54a124')
      }
    } catch {
      Qmsg.error('解析数据失败', { timeout: 500 })
    }
  }

  function compareFormData(data: FormJSONData) {
    const localFormData = getFormDataJSON()
    const diffDataKeys: string[] = []
    Object.keys(localFormData).forEach((key) => {
      if (ignoreList.includes(key)) return
      if (
        localFormData[key as keyof FormJSONData].trim() !==
        data[key as keyof FormJSONData].trim()
      ) {
        diffDataKeys.push(keyMap[key as keyof FormJSONData])
      }
    })
    return diffDataKeys
  }

  const ignoreList = [
    'projectId',
    'checkLocation',
    'taskId',
    'according',
    'projectNo',
  ]

  const keyMap: Record<keyof FormJSONData, string> = {
    according: '依据',
    btyBrand: '商标',
    btyColor: '颜色',
    btyCount: '电池数量',
    btyCountChecked: '勾选电池数量',
    btyGrossWeight: '毛重',
    btyGrossWeightChecked: '勾选毛重',
    btyKind: '型号',
    btyNetWeight: '净重',
    btyNetWeightChecked: '勾选净重',
    btyShape: '形状',
    btySize: '尺寸',
    btyType: '电池类型',
    checkLocation: '检验地点',
    classOrDiv: '危险性',
    comment: '备注',
    commentExtra: '特殊规定',
    conclusions: '结论',
    inspectionItem1: '勾选瓦时或锂含量',
    inspectionItem1Text1: '瓦时',
    inspectionItem1Text2: '锂含量',
    inspectionItem7: '随附文件',
    inspectionItem8Cn: '鉴别项目8中文',
    inspectionItem8En: '鉴别项目8英文',
    inspectionItem9Cn: '鉴别项目9中文',
    inspectionItem9En: '鉴别项目9英文',
    inspectionResult1: '瓦时或锂含量范围',
    inspectionResult2: '锂电池已通过 UN38.3 测试',
    inspectionResult3: '电池按照规定的质量管理体系进行制造。 ',
    inspectionResult4: '该锂电池不属于召回电池，不属于废弃和回收电池。 ',
    inspectionResult5: '通过包装件 1.2 米跌落试验。',
    inspectionResult6: '包装件需要按照特殊规定188的要求进行适当标记。 ',
    inspectionResult7: '随附文件',
    inspectionResult8: '检验结果8',
    inspectionResult9: '检验结果9',
    itemCName: '物品名称中文',
    itemEName: '物品名称英文',
    market: '技术部备注',
    otherDescribe: '包装方式',
    otherDescribeCAddition: '其它描述中文',
    otherDescribeChecked: '勾选其它描述',
    otherDescribeEAddition: '其它描述英文',
    pg: '包装等级',
    projectId: '项目ID',
    psn: '运输专有名称',
    remarks: '注意事项',
    taskId: 'taskId',
    unno: 'UN编号',
    projectNo: '项目编号',
  }

  /**
   * FormData
   */
  interface FormJSONData {
    according: string
    btyBrand: string
    btyColor: string
    btyCount: string
    btyCountChecked: string
    btyGrossWeight: string
    btyGrossWeightChecked: string
    btyKind: string
    btyNetWeight: string
    btyNetWeightChecked: string
    btyShape: string
    btySize: string
    btyType: string
    checkLocation: string
    classOrDiv: string
    comment: string
    commentExtra: string
    conclusions: string
    inspectionItem1: string
    inspectionItem1Text1: string
    inspectionItem1Text2: string
    inspectionItem7: string
    inspectionItem8Cn: string
    inspectionItem8En: string
    inspectionItem9Cn: string
    inspectionItem9En: string
    inspectionResult1: string
    inspectionResult2: string
    inspectionResult3: string
    inspectionResult4: string
    inspectionResult5: string
    inspectionResult6: string
    inspectionResult7: string
    inspectionResult8: string
    inspectionResult9: string
    itemCName: string
    itemEName: string
    market: string
    otherDescribe: string
    otherDescribeCAddition: string
    otherDescribeChecked: string
    otherDescribeEAddition: string
    pg: string
    projectId: string
    psn: string
    remarks: string
    taskId: string
    unno: string
    projectNo: string
  }
}
