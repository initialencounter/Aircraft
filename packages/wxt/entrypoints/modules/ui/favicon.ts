import { formatHexColor } from "../../../share/utils"
import type { Config } from "../../../entrypoints/options/src/components/Schema"

export function changeFavicon(iconURL: string) {
  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.getElementsByTagName('head')[0].appendChild(link)
  }
  link.href = iconURL
}

export function switchFaviconBySystemId(systemId: string, localConfig: Config) {
  if (systemId === 'PEKGZ') {
    changeFavicon(
      `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' class='icon' style='width: 1em;height: 1em;vertical-align: middle;fill: currentColor;overflow: hidden;' viewBox='0 0 1024 1024' version='1.1' p-id='3646'%3E%3Cpath d='M512 608.3079436L801.06525215 319.24269145s48.1539718-48.1539718 0-96.3079436-96.3079436 0-96.3079436 0l-168.64496731 168.64496731L174.71006537 319.24269145l-48.15397179 48.1539718 289.06525214 144.53262607-134.91597385 134.91597385-130.10764773-14.42497833-48.1539718 48.15397179L271.08871965 752.91128035l72.26631304 168.57425664 48.1539718-48.1539718-14.42497834-130.10764774L512 608.3079436zM704.75730855 849.28993463L639.34993129 522.53589104l-113.49063838 113.49063838 130.74404384 261.417377z' p-id='3647' fill='%23${formatHexColor(localConfig.pekProjectNoColor ?? '')}'/%3E%3C/svg%3E`
    )
  } else if (systemId === 'SEKGZ') {
    changeFavicon(
      `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' class='icon' style='width: 1em;height: 1em;vertical-align: middle;fill: currentColor;overflow: hidden;' viewBox='0 0 1024 1024' version='1.1' p-id='1002'%3E%3Cpath d='M515.584 102.4a137.216 137.216 0 0 1 139.674 135.168 137.472 137.472 0 0 1-42.394 101.837 178.022 178.022 0 0 0-54.477 128.665v1.434h169.83c3.738 0 6.81 3.072 6.81 6.81v67.942c0 3.738-3.072 6.81-6.81 6.81H558.286v338.227c72.397-7.475 139.52-34.816 189.85-76.8a13.67 13.67 0 0 0-2.458-22.63l-67.43-34.612a3.43 3.43 0 0 1 0.511-6.297l185.856-59.802a6.656 6.656 0 0 1 8.5 4.25l59.801 185.856a3.38 3.38 0 0 1-4.761 4.096L848.23 842.29a13.466 13.466 0 0 0-16.076 2.714c-66.868 70.963-166.4 116.736-273.767 125.952a555.938 555.938 0 0 1-26.163 1.536h-27.955a460.288 460.288 0 0 1-166.298-35.687 398.285 398.285 0 0 1-134.707-91.801 13.466 13.466 0 0 0-16.077-2.714l-79.872 41.216a3.38 3.38 0 0 1-4.761-4.096l59.494-186.01a6.912 6.912 0 0 1 8.602-4.403l185.907 59.392c2.867 0.922 3.225 4.916 0.512 6.298l-67.38 34.714a13.67 13.67 0 0 0-2.457 22.63c50.483 41.882 117.658 69.274 189.542 76.902V551.066H306.842a6.81 6.81 0 0 1-6.81-6.81v-67.942c0-3.738 3.072-6.81 6.81-6.81h169.984v-1.434c0-48.896-20.327-95.232-55.348-129.433A137.677 137.677 0 0 1 515.635 102.4z m2.048 81.613a56.115 56.115 0 0 0 0 112.128 56.115 56.115 0 0 0 0-112.128z' p-id='1003' fill='%23${formatHexColor(localConfig.sekProjectNoColor ?? '')}'/%3E%3C/svg%3E`
    )
  } else if (systemId === 'REKGZ') {
    changeFavicon(
      `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='48px' viewBox='0 -960 960 960' width='48px' fill='%23${formatHexColor(localConfig.rekProjectNoColor ?? '')}'%3E%3Cpath d='M160-340v-380q0-41 19-71.5t58.5-50q39.5-19.5 100-29T480-880q86 0 146.5 9t99 28.5Q764-823 782-793t18 73v380q0 59-40.5 99.5T660-200l60 60v20h-70l-80-80H390l-80 80h-70v-20l60-60q-59 0-99.5-40.5T160-340Zm320-480q-120 0-173 15.5T231-760h501q-18-27-76.5-43.5T480-820ZM220-545h234v-155H220v155Zm440 60H220h520-80Zm-146-60h226v-155H514v155ZM335-315q23 0 39-16t16-39q0-23-16-39t-39-16q-23 0-39 16t-16 39q0 23 16 39t39 16Zm290 0q23 0 39-16t16-39q0-23-16-39t-39-16q-23 0-39 16t-16 39q0 23 16 39t39 16Zm-325 60h360q34 0 57-25t23-60v-145H220v145q0 35 23 60t57 25Zm180-505h252-501 249Z'/%3E%3C/svg%3E`
    )
  } else if (systemId === 'AEKGZ') {
    changeFavicon(
      `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='48px' viewBox='0 -960 960 960' width='48px' fill='%23${formatHexColor(localConfig.aekProjectNoColor ?? '')}'%3E%3Cpath d='M224.12-161q-49.12 0-83.62-34.42Q106-229.83 106-279H40v-461q0-24 18-42t42-18h579v167h105l136 181v173h-71q0 49.17-34.38 83.58Q780.24-161 731.12-161t-83.62-34.42Q613-229.83 613-279H342q0 49-34.38 83.5t-83.5 34.5Zm-.12-60q24 0 41-17t17-41q0-24-17-41t-41-17q-24 0-41 17t-17 41q0 24 17 41t41 17ZM100-339h22q17-27 43.04-43t58-16q31.96 0 58.46 16.5T325-339h294v-401H100v401Zm631 118q24 0 41-17t17-41q0-24-17-41t-41-17q-24 0-41 17t-17 41q0 24 17 41t41 17Zm-52-204h186L754-573h-75v148ZM360-529Z'/%3E%3C/svg%3E`
    )
  }
}

