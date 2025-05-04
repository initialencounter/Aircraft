import { defineStore } from 'pinia'
import { FileItem } from '../types'

interface FileItemState {
  [key: string]: FileItem[]
}

export const FileItemStore = defineStore('fileItem', {
  state: (): FileItemState => ({}),
})
