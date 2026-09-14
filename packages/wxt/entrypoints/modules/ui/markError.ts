export function markErrorElement(elementName: string, message: string[]) {
  const element = document.getElementsByName(elementName)[0] as HTMLInputElement
  if (element) {
    element.style.backgroundColor = message.length ? '#FF6347' : ''
    element.setAttribute('title', message.length ? message.join('\n') : "")
  }
}