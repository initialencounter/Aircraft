import type { CheckResult } from '../lithium/shared/types'

function matchContactInfo(info: string) {
  // 电话/Tel：000-1646464
  // 邮箱/Mail：abc@gmail.com
  const telRegex = /电话\s?\/\s?Tel\s?[:：]?\s*([^\u4e00-\u9fa5]+)/
  const mailRegex = /邮箱\s?\/\s?Mail\s?[:：]?\s*([^\u4e00-\u9fa5]+)/
  const websiteRegex = /网址\s?\/\s?Website\s?[:：]?\s*([^\u4e00-\u9fa5]+)/

  const telMatch = info.match(telRegex)
  const mailMatch = info.match(mailRegex)
  const websiteMatch = info.match(websiteRegex)
  const tel = telMatch ? telMatch[1].trim() : null
  const mail = mailMatch ? mailMatch[1].trim() : null
  const website = websiteMatch ? websiteMatch[1].trim() : null

  console.log('匹配结果:',  {info, tel, mail, website })
  return { tel, mail, website }
}

export function checkContactInfo(
  systemConsignor: string | undefined,
  systemManufacturer: string | undefined,
  summaryConsignorInfo: string,
  summaryManufacturerInfo: string,
): CheckResult[] {
  if (systemConsignor === systemManufacturer) {
    return []
  }
  const results: CheckResult[] = []
  const { tel: consignorTel, mail: consignorMail, website: consignorWebsite } = matchContactInfo(summaryConsignorInfo)
  const { tel: manufacturerTel, mail: manufacturerMail, website: manufacturerWebsite } = matchContactInfo(summaryManufacturerInfo)

  if (consignorTel && manufacturerTel && consignorTel === manufacturerTel) {
    results.push({
      ok: false,
      result: '委托方和制造商联系电话一致, 可能存在信息错误',
    })
  }
  if (consignorMail && manufacturerMail && consignorMail === manufacturerMail) {
    results.push({
      ok: false,
      result: '委托方和制造商邮箱一致, 可能存在信息错误',
    })
  }
  if (consignorWebsite && manufacturerWebsite && consignorWebsite === manufacturerWebsite) {
    results.push({
      ok: false,
      result: '委托方和制造商网址一致, 可能存在信息错误',
    })
  }
  return results
}