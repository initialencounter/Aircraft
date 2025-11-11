import { sleep } from '../share/utils'
import { getQmsg } from '../share/qmsg'
import '../assets/message.min.css'

export default defineContentScript({
  runAt: 'document_end',
  matches: [
    'https://*/rek/inspect*',
    'https://*/aek/inspect*',
    'https://*/sek/inspect*',
    'https://*/pek/inspect*',
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
    if (!projectNo.startsWith('PEK'))
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
    } catch (e) {
      console.error('parse clipboard data error:', e)
      Qmsg.error('解析数据失败', { timeout: 500 })
    }
  }

  function compareFormData(data: FormJSONData | PekFormJSONData) {
    const localFormData = getFormDataJSON()
    if (
      (data.projectNo.startsWith('PEK') && !localFormData.projectNo.startsWith('PEK')) ||
      (!data.projectNo.startsWith('PEK') && localFormData.projectNo.startsWith('PEK'))
    ) {
      if (data.projectNo.startsWith('PEK')) {
        return sekVSPek(localFormData, data as unknown as PekFormJSONData)
      } else {
        return sekVSPek(data as FormJSONData, localFormData as unknown as PekFormJSONData)
      }
    }


    if (data.projectNo.startsWith('PEK') && localFormData.projectNo.startsWith('PEK')) {
      return pekVSPek(data as unknown as PekFormJSONData, localFormData as unknown as PekFormJSONData)
    }
    const diffDataKeys: string[] = []
    Object.keys(localFormData).forEach((key) => {
      if (ignoreList.includes(key)) return
      if (
        localFormData[key as keyof FormJSONData].trim() !==
        // @ts-ignore
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

  const pekKeyMap: Record<keyof PekFormJSONData, string> = {
    projectNo: "项目编号",
    projectId: "项目ID",
    checkLocation: "检验地点",
    taskId: "taskId",
    according: "依据",
    itemCName: "物品名称中文",
    itemEName: "物品名称英文",
    color: "颜色",
    shape: "形状",
    size: "尺寸",
    model: "型号",
    brands: "商标",
    btyCount: "电池数量",
    netWeight: "净重",
    grossWeight: "毛重",
    type1: "电池类型1",
    type2: "电池类型2",
    otherDescribe: "操作信息",
    otherDescribeChecked: "操作信息勾选",
    otherDescribeCAddition: "描述中文",
    otherDescribeEAddition: "描述英文",
    inspectionItem1: "包装方式",
    inspectionItem1Text1: "与**包装在一起1",
    inspectionItem1Text2: "与**包装在一起2",
    inspectionItem6: "包装件通过3米堆码试验",
    inspectionItem1Text3: "安装在**上1",
    inspectionItem1Text4: "安装在**上2",
    inspectionItem2: "提供测试报告，通过1.2米跌落试验",
    inspectionItem2Text1: "电压",
    inspectionItem2Text2: "容量",
    inspectionItem3: "提供并通过UN38.3标准实验",
    inspectionItem3Text1: "瓦时",
    inspectionItem4: "加贴电池标记",
    inspectionItem4Text1: "锂含量",
    inspectionItem5: "附有随机文件",
    inspectionItem5Text1: "参见包装说明",
    remarks: "注意事项",
    conclusions: "结论",
    result1: "DGR规定,资料核实",
    unno: "UN No.",
    psn: "PSN",
    classOrDiv: "危险性",
    pg: "包装等级",
    packPassengerCargo: "客货机",
    packSubDanger: "次要危险性",
    packCargo: "仅限货机",
    packSpecial: "特殊规定	",
    market: "技术部备注",
  }
  // @ts-ignore
  const PekKey2SekKey: Record<keyof PekFormJSONData, keyof FormJSONData | null> = {
    color: 'btyColor',
    shape: 'btyShape',
    size: 'btySize',
    model: 'btyKind',
    brands: 'btyBrand',
    netWeight: 'btyNetWeight',
    // 瓦时
    inspectionItem3Text1: 'inspectionItem1Text1',
    // 锂含量
    inspectionItem4Text1: 'inspectionItem1Text2',
  }
  function sekVSPek(sekData: FormJSONData, pekData: PekFormJSONData) {
    const diffDataKeys: string[] = []
    const ignoreList = [
      'projectId',
      'projectNo',
      'according',
      'otherDescribe',
      'inspectionItem1',
      'conclusions',
      'remarks',
      'inspectionItem1Text1',
      'inspectionItem1Text2',
    ]
    for (const pekKey of Object.keys(pekData) as Partial<keyof PekFormJSONData>[]) {
      if (ignoreList.includes(pekKey)) {
        continue
      }
      let sekValue = ''
      let pekValue = pekData[pekKey]
      let sekKey = PekKey2SekKey[pekKey]
      if (!sekKey) {
        sekKey = pekKey as keyof FormJSONData
      }
      sekValue = sekData[sekKey] as keyof FormJSONData
      if (sekValue === undefined || pekValue === undefined) {
        continue
      }
      if (sekValue.trim() !== pekValue.trim()) {
        diffDataKeys.push(keyMap[sekKey as keyof FormJSONData] || pekKey)
        console.log({ sekKey, sekValue, pekValue, pekKey })
      }
    }
    return diffDataKeys
  }

  function pekVSPek(pekData1: PekFormJSONData, pekData2: PekFormJSONData) {
    const diffDataKeys: string[] = []
    if (pekData1['otherDescribeChecked'] !== pekData2['otherDescribeChecked']) {
      diffDataKeys.push('其它描述勾选')
    }
    Object.keys(pekData1).forEach((key) => {
      if (ignoreList.includes(key)) return
      if (pekData1[key as keyof PekFormJSONData] === undefined ||
        pekData2[key as keyof PekFormJSONData] === undefined) {
        return
      }
      if (
        pekData1[key as keyof PekFormJSONData].trim() !==
        // @ts-ignore
        pekData2[key as keyof PekFormJSONData].trim()
      ) {
        diffDataKeys.push(pekKeyMap[key as keyof PekFormJSONData])
      }
    })
    return diffDataKeys
  }

  interface PekFormJSONData {
    according: string;
    brands: string;
    btyCount: string;
    checkLocation: string;
    classOrDiv: string;
    color: string;
    conclusions: string;
    grossWeight: string;
    inspectionItem1: string;
    inspectionItem1Text1: string;
    inspectionItem1Text2: string;
    inspectionItem1Text3: string;
    inspectionItem1Text4: string;
    inspectionItem2: string;
    inspectionItem2Text1: string;
    inspectionItem2Text2: string;
    inspectionItem3: string;
    inspectionItem3Text1: string;
    inspectionItem4: string;
    inspectionItem4Text1: string;
    inspectionItem5: string;
    inspectionItem5Text1: string;
    inspectionItem6: string;
    itemCName: string;
    itemEName: string;
    market: string;
    model: string;
    netWeight: string;
    otherDescribe: string;
    otherDescribeCAddition: string;
    otherDescribeChecked: string;
    otherDescribeEAddition: string;
    packCargo: string;
    packPassengerCargo: string;
    packSpecial: string;
    packSubDanger: string;
    pg: string;
    projectId: string;
    projectNo: string;
    psn: string;
    remarks: string;
    result1: string;
    shape: string;
    size: string;
    taskId: string;
    type1: string;
    type2: string;
    unno: string;
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
