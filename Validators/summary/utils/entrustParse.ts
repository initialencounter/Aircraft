export function parseEntrust(entrustData: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(entrustData, 'text/html');
  if (!doc) return null
  const consignor = doc.querySelector('#page1 > table > tbody > tr:nth-child(6) > td:nth-child(3) > span')
  const manufacturer = doc.querySelector('#page1 > table > tbody > tr:nth-child(13) > td:nth-child(4) > span')
  if (!consignor || !manufacturer) return null
  return {
    consignor: consignor.innerHTML.trim(),
    manufacturer: manufacturer.innerHTML.trim(),
  }
}