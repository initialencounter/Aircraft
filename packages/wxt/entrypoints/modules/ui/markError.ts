export function markErrorElement(elementId: string, message: string[]) {
  const element = document.querySelector(`#${elementId}`) as HTMLInputElement
  if (element) {
    element.style.backgroundColor = message.length ? '#FF6347' : ''
    element.setAttribute('title', message.length ? message.join('\n') : "")
  }
}