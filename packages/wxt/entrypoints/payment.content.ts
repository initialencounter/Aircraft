import { getLocalConfig } from '../share/utils'

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
  const localConfig = await getLocalConfig()
  setTimeout(() => {
    const monthPay = document.querySelector("#monthPay") as HTMLInputElement
    if (!monthPay?.checked) {
      return
    }
    const paymentCompanyElement = document.querySelector("#txt_paymentCompanyContact") as HTMLSpanElement
    for (const [key, value] of Object.entries(localConfig.paymentCompany)) {
      if (paymentCompanyElement?.innerText.includes(key)) {
        console.log(`paymentCompany: ${key} => ${value}`)
      }
    }
  }, 200)
}