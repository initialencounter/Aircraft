import { getLocalConfig, waitForElement } from '../share/utils'

export default defineContentScript({
  runAt: 'document_end',
  matches: [
    'https://*/sales/entrust/main',
    'https://*/sales/entrust/edit*',
  ],
  allFrames: true,
  async main() {
    await entrypoint()
  },
})

async function entrypoint() {
  await waitForElement('#txt_paymentCompanyContact')
  const localConfig = await getLocalConfig()
  if (!localConfig.paymentCompanyInfo) {
    console.log('No payment company info found in local config, skipping insertion.')
    return
  }
  const paymentCompanyInfo = localConfig.paymentCompanyInfo.split('\n').map(item => item.split(/[，,]/))
  setInterval(() => {
    insertPaymentCompanyInfo()
    const monthPay = document.querySelector("#monthPay") as HTMLInputElement
    const paymentCompanyInfoElement = document.querySelector("#paymentCompanyInfo") as HTMLDivElement
    if (!monthPay?.checked) {
      if (paymentCompanyInfoElement) paymentCompanyInfoElement.innerText = ''
      return
    }
    const paymentCompanyElement = document.querySelector("#txt_paymentCompanyContact") as HTMLSpanElement
    for (const [key, value] of paymentCompanyInfo) {
      if (paymentCompanyElement?.innerText.includes(key)) {
        if (paymentCompanyInfoElement) paymentCompanyInfoElement.innerText = value
        return
      }
    }
    if (paymentCompanyInfoElement) paymentCompanyInfoElement.innerText = ''
  }, 200)
}

function insertPaymentCompanyInfo() {
  const existsPaymentCompanyInfoElement = document.querySelector("#paymentCompanyInfo") as HTMLDivElement
  const inputElement = document.querySelector("#txt_paymentCompanyContact") as HTMLInputElement
  const inputElementX = inputElement?.getBoundingClientRect().x
  const inputElementY = inputElement?.getBoundingClientRect().y
  if (existsPaymentCompanyInfoElement) {
    existsPaymentCompanyInfoElement.style.left = `${inputElementX - 100}px`
    existsPaymentCompanyInfoElement.style.top = `${inputElementY + 10}px`
    return
  } else {
    const paymentCompanyInfoElement = document.createElement("div")
    paymentCompanyInfoElement.style.position = "absolute"
    paymentCompanyInfoElement.style.left = `${inputElementX - 100}px`
    paymentCompanyInfoElement.style.top = `${inputElementY + 10}px`
    paymentCompanyInfoElement.style.backgroundColor = "white"
    paymentCompanyInfoElement.style.border = "1px solid #ccc"
    paymentCompanyInfoElement.style.fontSize = "12px"
    paymentCompanyInfoElement.style.padding = "5px"
    paymentCompanyInfoElement.style.zIndex = "1000"
    paymentCompanyInfoElement.id = "paymentCompanyInfo"
    document.body.appendChild(paymentCompanyInfoElement)
  }
}
