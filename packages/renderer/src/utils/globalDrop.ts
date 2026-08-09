import { ref } from 'vue'

/**
 * 全局拖拽暂存的文件。
 * 在其他路由拖入文件时会跳转到 /summary_parse，
 * 当 drop 未命中 FileDropzone 拖拽区时，由全局监听暂存到这里供其处理。
 */
export const pendingDropFiles = ref<File[]>([])
