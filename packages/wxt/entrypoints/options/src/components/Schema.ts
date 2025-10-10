import Schema from 'schemastery'

interface ModelsWithFactory {
  model: string
  factory: string
}

export interface Config {
  pekProjectNoColor: string
  sekProjectNoColor: string
  aekProjectNoColor: string
  rekProjectNoColor: string
  openInNewTab: boolean
  dangerousModels: string[]
  dangerousModelsWithFactory: ModelsWithFactory[]
  enableCopyProjectNo?: boolean
  enableCopyProjectName?: boolean
  enablePreventCloseBeforeSave?: boolean
  enableSaveHotKey?: boolean
  enableImportHotKey?: boolean
  enableSetImportProjectNo?: boolean
  autoProjectNoPreset?: boolean
  pekProjectNoPreset?: string
  sekProjectNoPreset?: string
  aekProjectNoPreset?: string
  rekProjectNoPreset?: string
  enableSetQueryProjectNo?: boolean
  enableSetImportClassification?: boolean
  enableDisplayEntrustEName?: boolean
  enableSetEntrust?: boolean
  category?: 0 | 1 | 2 | 3
  moonPay?: boolean
  amount?: string
  tagNextYear?: boolean
  customIcon?: boolean
  dataCompare?: boolean
  onekeyAssign?: boolean
  onekeyRollback?: boolean
  nextYearColor?: string
  nextYearBgColor?: string
  verify?: boolean
  verifyButtonOnMiddle?: boolean
  checkAssignUser?: boolean
  showInspectFormLink?: boolean
  freshHotkey?: boolean
  autoRefreshDuration?: number
  aircraftServer: string
  enableCheckAttachment: boolean
  enableLabelCheck: boolean
  enableLabelCheckManual: boolean
}

const ModelsWithFactoryList: Schema<ModelsWithFactory> = Schema.object({
  model: Schema.string().description('电池型号'),
  factory: Schema.string().description('电池厂家'),
})

export const Config: Schema<Config> = Schema.intersect([
  // 业务受理 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  Schema.object({
    onekeyAssign: Schema.boolean().description('一键分配').default(true),
    checkAssignUser: Schema.boolean()
      .description(
        '检查分配用户，如果未选择分配用户，则需要确认（强烈建议开启）'
      )
      .default(true),
    showInspectFormLink: Schema.boolean()
      .description(
        '在业务受理查看检验单（点击物品名称或点击操作栏的“检验单”超链接）'
      )
      .default(true),
  }).description('业务受理'),

  // 初验 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  Schema.object({
    enableDisplayEntrustEName: Schema.boolean()
      .description('显示委托方英文名称')
      .default(true),
    enableSetEntrust: Schema.boolean()
      .description(`自动设置初验的内容`)
      .default(true),
  }).description('初验'),
  Schema.union([
    Schema.object({
      enableSetEntrust: Schema.const(true),
      category: Schema.union([
        Schema.const(0).description('化学品'),
        Schema.const(1).description('锂电池类'),
        Schema.const(2).description('器械类'),
        Schema.const(3).description('磁性物质'),
      ])
        .description(`分类`)
        .default(1),
      moonPay: Schema.boolean().description(`月结`).default(true),
      amount: Schema.string().description(`金额`).default('500.00'),
      tagNextYear: Schema.boolean()
        .description(`导入项目后，标记为下一年报告`)
        .default(false),
    }),
    Schema.object({
      enableSetEntrust: Schema.const(false),
    }),
  ]),
  // 样品检验 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  Schema.object({

    openInNewTab: Schema.boolean().description('在新标签页打开网页').default(true),
    onekeyRollback: Schema.boolean().description('一键回退').default(true),
    freshHotkey: Schema.boolean()
      .description('刷新快捷键(ctrl+d)')
      .default(true),
    autoRefreshDuration: Schema.number()
      .description('离开页面后，刷新列表的时间间隔，单位：毫秒')
      .default(10000),
  }).description('样品检验'),

  // 样品检验-主界面 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  Schema.object({
    verify: Schema.boolean()
      .description(
        '表单验证（仅限锂电池），验证规则详见[rule](https://lims.initenc.cn/rule.html)，欢迎补充'
      )
      .default(true),
    dangerousModels: Schema.array(String)
      .default([
        '27100118P',
        '28100118',
        '624475ART',
        '506795',
        'INR18650-1.5Ah',
        'P13001L',
        '2998125',
        'BL-18EI',
      ])
      .description('危险电池型号'),
    dangerousModelsWithFactory: Schema.array(ModelsWithFactoryList)
      .default([{ model: '18650', factory: '东莞倍创利电子科技有限公司' }])
      .description('危险电池型号对应的厂家(常见的电池型号可以输入对应，只有型号和厂家都相同才会弹出提示)'),
    aircraftServer: Schema.string()
      .description('附件解析服务器地址')
      .default('http://127.0.0.1:25455'),
    enableCheckAttachment: Schema.boolean()
      .description('启用附件解析')
      .default(true),
    enableLabelCheck: Schema.boolean()
      .description('启用标签检查（识别不准确，不建议开启）')
      .default(false),
    enableLabelCheckManual: Schema.boolean()
      .description('启用手动标签检查')
      .default(false),
    verifyButtonOnMiddle: Schema.boolean()
      .description('验证按钮放在提交按钮旁边')
      .default(false),
    enableCopyProjectNo: Schema.boolean()
      .description(
        `复制项目编号 （点击项目编号，或者双击 *Ctrl*，即可将项目编号复制到剪切板）`
      )
      .default(true),
    enableCopyProjectName: Schema.boolean()
      .description(
        `复制项目名称 （双击项目名称，或者按住 *Ctrl* 键并双击两次 *C* 键，即可将项目名称复制到剪切板）`
      )
      .default(true),
    enablePreventCloseBeforeSave: Schema.boolean()
      .description(
        `保存前阻止关闭 （当有未保存的数据时，关闭页面时会弹出提示）`
      )
      .default(true),
    enableSaveHotKey: Schema.boolean()
      .description(`保存快捷键 （使用快捷键 *Ctrl + S* 将保存检验单）`)
      .default(true),
    enableImportHotKey: Schema.boolean()
      .description(`导入快捷键 （使用快捷键 *Ctrl + D* 将打开导入窗口）`)
      .default(true),
    customIcon: Schema.boolean()
      .description('自定义标签页图标（用更显眼的图标来区分空海运）')
      .default(false),
    dataCompare: Schema.boolean()
      .description(
        '启用海陆运数据对比功能（在检验单页面，点击表头即可将表单数据复制到剪切板, 再点击另一页面的对比按钮）'
      )
      .default(false),
  }).description('样品检验-主界面'),
  Schema.union([
    Schema.object({
      customIcon: Schema.const(true),
      pekProjectNoColor: Schema.string().description('空运编号字体颜色').default('#51a020'),
      sekProjectNoColor: Schema.string().description('海运编号字体颜色').default('#3e8ed0'),
      aekProjectNoColor: Schema.string().description('道路编号字体颜色').default('#8c1af6'),
      rekProjectNoColor: Schema.string().description('铁路编号字体颜色').default('#ea3323'),
    }),
    Schema.object({
      customIcon: Schema.const(false),
    })
  ]),

  // 样品检验-导入 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  Schema.object({
    enableSetImportProjectNo: Schema.boolean()
      .description(`自动填充剪切板中的项目编号`)
      .default(true),
    enableSetImportClassification: Schema.boolean()
      .description(`根据品名，自动填充分类`)
      .default(true),
    autoProjectNoPreset: Schema.boolean()
      .description(`自动设置检验单编号前缀`)
      .default(false),
  }).description('样品检验-导入-查询'),
  Schema.union([
    Schema.object({
      autoProjectNoPreset: Schema.const(false),
      pekProjectNoPreset: Schema.string()
        .description(`手动设置空运检验单编号前缀`)
        .default('PEKGZ2024'),
      sekProjectNoPreset: Schema.string()
        .description(`手动设置海运检验单编号前缀`)
        .default('SEKGZ2024'),
      aekProjectNoPreset: Schema.string()
        .description(`手动设置空运检验单编号前缀`)
        .default('AEKGZ2024'),
      rekProjectNoPreset: Schema.string()
        .description(`手动设置空运检验单编号前缀`)
        .default('REKGZ2024'),
    }),
    Schema.object({
      autoProjectNoPreset: Schema.const(true),
    }),
  ]),

  // 样品检验单查询 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  Schema.object({
    enableSetQueryProjectNo: Schema.boolean()
      .description(`设置查询项目编号 （在查询窗口中，自动填充项目编号）`)
      .default(false),
  }).description('样品检验单查询'),

  // 主题设置 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  Schema.object({
    nextYearColor: Schema.string()
      .description('下一年报告字体颜色')
      .default(''),
    nextYearBgColor: Schema.string()
      .description('下一年报告背景颜色')
      .default('#76EEC6'),
  }).description('主题设置'),
])
