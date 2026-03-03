import { sleep } from '../share/utils'
import { getQmsg } from '../share/qmsg'
import '../assets/message.min.css'

export default defineContentScript({
  runAt: 'document_end',
  matches: ['https://*/inspect/batterytest*'],
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
  await sleep(400)
  const Qmsg = getQmsg()
  const headerBar = document.querySelector(
    'body > div.panel.easyui-fluid > div.panel-header'
  )
  if (!headerBar) return
  headerBar.addEventListener('click', () => {
    setFormDataToClipBoard()
  })
  const targetChild = document.querySelector("#printBtn0")
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
  checkListButton.title = '点其他概要的表头获取概要数据，再点此对比，比较两份概要数据的一致性'
  targetParent.appendChild(checkListButton)
  console.log('对比按钮插入成功！')

  function getFormDataJSON() {
    const projectNo = document.querySelector("#projectNo")?.textContent
    const form = document.querySelector(
      '#batteryInspectForm'
    ) as HTMLFormElement
    // 获取表单数据
    const data = {} as FormJSONData
    const formData = new FormData(form)
    formData.forEach((value, name) => {
      if (data[name as keyof FormJSONData]) {
        data[name as keyof FormJSONData] = (data[name as keyof FormJSONData] +
          `,${value}`) as FormJSONData[keyof FormJSONData]
      } else {
        data[name as keyof FormJSONData] =
          value as FormJSONData[keyof FormJSONData]
      }
    })
    data.projectNo = projectNo || ''
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
      const anotherData: FormJSONData = JSON.parse(jsonText)
      const localData = getFormDataJSON()
      const diffDataKeys = compareFormData(localData, anotherData)
      if (diffDataKeys.length > 0) {
        Qmsg.error(JSON.stringify(diffDataKeys, null, 2), { timeout: 3000 })
      } else {
        Qmsg.success(`与概要 ${anotherData.projectNo} 数据一致`, { timeout: 1000 })
        const verifyButton = document.getElementById('lims-checkListButton')
          ?.children[0]?.children[1] as SVGAElement
        if (verifyButton) verifyButton.setAttribute('fill', '#54a124')
      }
    } catch (e) {
      console.error('parse clipboard data error:', e)
      Qmsg.error('解析数据失败', { timeout: 500 })
    }
  }


  const ignoreList = [
    'id',
    'projectId',
    'projectNo'
  ]

  const keyMap: Record<keyof FormJSONData, string> = {
    projectNo: "项目编号",
    id: "id",
    projectId: "projectId",
    consignor: "委托方",
    consignorInfo: "委托方信息",
    manufacturer: "制造商",
    manufacturerInfo: "制造商信息",
    testlab: "测试单位",
    testlabInfo: "测试单位信息",
    cnName: "电池名称（中文）",
    enName: "电池名称（英文）",
    classification: "电池类型",
    type: "型号",
    trademark: "商标",
    voltage: "电压",
    capacity: "容量",
    watt: "瓦时",
    color: "颜色",
    shape: "形状",
    mass: "质量",
    licontent: "锂含量",
    testReportNo: "测试报告编号",
    testDate: "测试报告签发日期",
    testManual: "测试标准",
    test1: "T1",
    test2: "T2",
    test3: "T3",
    test4: "T4",
    test5: "T5",
    test6: "T6",
    test7: "T7",
    test8: "T8",
    un38f: "un38f",
    un38g: "un38g",
    note: "备注",
  }

  function compareFormData(localData: FormJSONData, anotherData: FormJSONData) {
    const diffDataKeys: string[] = []
    for (const localKey of Object.keys(localData) as Partial<keyof FormJSONData>[]) {
      if (ignoreList.includes(localKey)) {
        continue
      }
      const localValue = localData[localKey]
      const anotherValue = anotherData[localKey]
      if (localValue.trim() !== anotherValue.trim()) {
        diffDataKeys.push(keyMap[localKey] || localKey)
      }
    }
    return diffDataKeys
  }

  /**
   * FormData
   */
  interface FormJSONData {
    projectNo: string
    id: string
    projectId: string
    consignor: string
    consignorInfo: string
    manufacturer: string
    manufacturerInfo: string
    testlab: string
    testlabInfo: string
    cnName: string
    enName: string
    classification: string
    type: string
    trademark: string
    voltage: string
    capacity: string
    watt: string
    color: string
    shape: string
    mass: string
    licontent: string
    testReportNo: string
    testDate: string
    testManual: string
    test1: string
    test2: string
    test3: string
    test4: string
    test5: string
    test6: string
    test7: string
    test8: string
    un38f: string
    un38g: string
    note: string
  }

}
