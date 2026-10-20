/**
 * 检查单条目
 *
 * 按自己的检验流程修改下面这个数组即可：
 * - id:       唯一标识，用于保存勾选状态（改动 id 会让本单已勾选状态失效）
 * - section:  分组标题，按首次出现的顺序渲染
 * - label:    显示的文字
 * - field:    可选，表单字段的 name。点击文字会定位到该字段
 */
export interface ChecklistItem {
  id: string
  section: string
  label: string
  field?: string
}

export const checklistItems: ChecklistItem[] = [
  // 页面外 / 需要人判断的动作
  { id: 'entrust', section: '核对', label: '委托单与检测单信息一致' },
  { id: 'appearance', section: '核对', label: '照片与实物一致（颜色/形状）' },
  { id: 'unno', section: '核对', label: 'UN 编号正确', field: 'unno' },

  // 判定
  { id: 'type', section: '判定', label: '电池类型与瓦时/锂含量正确' },
  { id: 'un383', section: '判定', label: 'UN38.3 报告与概要一致' },
  { id: 'special', section: '判定', label: '特殊规定/包装说明适用' },
  { id: 'according', section: '判定', label: '依据正确', field: 'according' },

  // 收尾
  { id: 'attachment', section: '收尾', label: '附件已上传（资料/电池报告）' },
  { id: 'conclusions', section: '收尾', label: '结论与注意事项已填写', field: 'conclusions' },
]
