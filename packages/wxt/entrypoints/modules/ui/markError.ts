export function markErrorElement(selector: string, message: string[]) {
  if (!selector) return
  const element = document.querySelector(selector) as HTMLInputElement | null
  if (!element) return
  let targetElement: HTMLElement = element
  if (element.type === 'radio' || element.type === 'hidden' || element.type === 'checkbox') {
    targetElement = element.parentElement as HTMLElement
    if (element.name === 'remarks') {
      targetElement = element.parentElement?.parentElement as HTMLElement
    }
  }
  targetElement.style.backgroundColor = message.length ? '#FF6347' : ''
  targetElement.setAttribute('title', message.length ? message.join('\n') : "")
}

export function clearError() {
  const elements = document.querySelectorAll('[name]') as NodeListOf<HTMLInputElement>
  elements.forEach(element => {
    if (!element) return
    let targetElement: HTMLElement = element
    if (element.type === 'radio' || element.type === 'hidden' || element.type === 'checkbox') {
      targetElement = element.parentElement as HTMLElement
      if (element.name === 'remarks') {
        targetElement = element.parentElement?.parentElement as HTMLElement
      }
    }
    targetElement.removeAttribute('title')
    if (targetElement.style.backgroundColor === 'rgb(255, 99, 71)') {
      targetElement.style.backgroundColor = ''
    }
  })
}