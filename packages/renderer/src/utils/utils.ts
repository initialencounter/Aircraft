function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear().toString().slice(2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  const millisecond = date.getMilliseconds().toString().padStart(3, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}:${millisecond}`
}

/**
 * 计算亮度, < 126 ? '#FFFFFF' : '#000000'
 * @param hex
 */
function calculateColorBrightness(hex: string) {
  const { r, g, b } = hexToRgb(hex) || { r: 0, g: 0, b: 0 }
  return (r * 299 + g * 587 + b * 114) / 1000 < 126 ? '#cfcece' : '#272727'
}

/**
 * 16进制颜色转RGB
 * @param hex
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  hex = hex.replace(/^#/, '')

  if (!/^[0-9A-F]{6}$/i.test(hex)) {
    return null
  }
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  return { r, g, b }
}

// 格式化文件大小
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 获取文件图标
export const getFileIcon = (fileType: string): string => {
  if (fileType.startsWith('image/')) return 'image'
  if (fileType.startsWith('video/')) return 'video'
  if (fileType.startsWith('audio/')) return 'audio'
  if (fileType === 'application/pdf') return 'pdf'
  if (fileType.includes('word') || fileType.includes('document')) return 'word'
  if (fileType.includes('sheet') || fileType.includes('excel')) return 'excel'
  return 'document'
}

export { formatTimestamp, calculateColorBrightness }
