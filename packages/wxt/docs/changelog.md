# 更新日志

## [v3.2.2] - 2026-02-10

### 新增

- 并行处理加快验证速度([2abd7e3](https://github.com/initialencounter/Aircraft/commit/2abd7e3c78769f7711b397794a5ffc4ca6848d48))
- 程序预热加快验证速度([0151f87](https://github.com/initialencounter/Aircraft/commit/0151f87b226dd22b0cb5bf577acb788cf3cdb22e))

## [v3.2.1] - 2026-02-08

### 修复

- chrome 使用 webGPU 加速标签识别速度([bb2f69c](https://github.com/initialencounter/Aircraft/commit/bb2f69cbf2bab5b479479fafb944ce601e8ebc64))
- 使用 YOLO26 预训练模型重新训练, 加速标签识别速度([650cba5](https://github.com/initialencounter/Aircraft/commit/650cba5c97b382327fc14526ceb2b2f15959f080))

## [v3.1.5] - 2026-01-18

### 修复

- 堆码评估单反向验证([58f57a8](https://github.com/initialencounter/Aircraft/commit/58f57a818f924ecedc11729d3938a8db269d595f))

## [v3.1.4] - 2026-01-16

### 修复

- 修复海运瓦时数结论验证([38d927c](https://github.com/initialencounter/Aircraft/commit/38d927ce77dfb1e42661382de7acc9733c52152b))([55bd4b1](https://github.com/initialencounter/Aircraft/commit/55bd4b134b63aa581b8e205850e8fd810fbe0989))([3b67044](https://github.com/initialencounter/Aircraft/commit/3b67044a68d52ce07099d8546416b31ee18891b6))

## [v3.1.1] - 2026-01-04

### 修复

- 开启运输防意外启动描述错误提示([26521ee](https://github.com/initialencounter/Aircraft/commit/26521ee7539f570ef05184807fcb93764af85602))
- 检查地点错误禁止一键分配([6e83b0d](https://github.com/initialencounter/Aircraft/commit/6e83b0d4c0db5a713a7c655270a09593134f2314))

### 新增

- 重复上传附件验证([ffb44e2](https://github.com/initialencounter/Aircraft/commit/ffb44e2b5b9ba26b8567e963f75ea36024e0d65a))

## [v3.0.16] - 2025-12-22

### 修复

- 优化概要项目编号错误提示([d891f0a](https://github.com/initialencounter/Aircraft/commit/d891f0a9150a88c65eed0297a288273e0b402d11))

- 优化CAO标签边框颜色([1278898])(https://github.com/initialencounter/Aircraft/commit/1278898ade55dfd03aaeadd0209fdffdbc644e6e)

## [v3.0.15] - 2025-12-12

- T1-T8测试项检查([15b232c](https://github.com/initialencounter/Aircraft/commit/15b232c98178c729e89f209a4a72eb02b32847a8))

## [v3.0.14] - 2025-12-04

### 优化

- 并行请求，加快验证速度([18191a3](https://github.com/initialencounter/Aircraft/commit/18191a383db7256a96b8743269e31cfcc22b47f5))

## [v3.0.13] - 2025-12-01

### 修复

- 右键关闭消息弹窗([5fbc291](https://github.com/initialencounter/Aircraft/commit/5fbc2919157f8247c6fcc3403d143535360cb70f))

## [v3.0.12] - 2025-12-01

### 修复

- UN3556 荷电状态勾选([aa269b9](https://github.com/initialencounter/Aircraft/commit/aa269b945dbd8033bce591a748825b84fa9d559a))


## [v3.0.10] - 2025-12-01

### 修复

- 获取报告年份错误导致的，无法验证荷电状态([5d3ecb6](https://github.com/initialencounter/Aircraft/commit/5d3ecb6758b76ccaa0956c5e753ff9d912eebfe5))

## [v3.0.9] - 2025-11-30

### 修复

- 概要英文手动换行解析失败([/aaa6aa6](https://github.com/initialencounter/Aircraft/commit/aaa6aa60c105c0d431463c540ce9d3795de00578))
- 概要图片商标解析失败([f1e5a6f](https://github.com/initialencounter/Aircraft/commit/f1e5a6fc24ef1f63195b635598ae352ac486cd94))
- 忽略概要委托方和制造商全角与半角括号([30d326e](https://github.com/initialencounter/Aircraft/commit/30d326e286c91d3074dc74c948913113fe087852))

### 新增

- 优化概要解析性能([ff20d3b](https://github.com/initialencounter/Aircraft/commit/ff20d3baee4dd01ba909bb5faab1f17c32ef9dca))

## [v3.0.8] - 2025-11-28

### 修复

- UN3556 荷电状态勾选([d76a242](https://github.com/initialencounter/Aircraft/commit/d76a242590739cef24df55221d1a6bab4e6d4c1f))

## [v3.0.7] - 2025-11-28

### 修复

- 只在导入时标记下一年报告([0601e8d](https://github.com/initialencounter/Aircraft/commit/0601e8d990df3d2ac8bb15a892e80c84a52dfeb2))

## [v3.0.6] - 2025-11-28

### 修复

- 保存前阻止关闭页面, 搭配快捷键使用时仍显示未保存([2bd9631](https://github.com/initialencounter/Aircraft/commit/2bd9631af8de320bedfde76dfde66d1b56f004f1))

### 新增

- 标记未保存的修改项(需要手动开启)([2bd9631](https://github.com/initialencounter/Aircraft/commit/2bd9631af8de320bedfde76dfde66d1b56f004f1))

## [v3.0.1] - 2025-11-23

### 修复

- 大尺寸标签图片放大后无法缩小([4c148c5](https://github.com/initialencounter/Aircraft/commit/4c148c5f67bc0c43645f49d40864b9460295baf8))

## [v3.0.0] - 2025-11-24

### 修复

- 单位转换浮点精度问题([8d68d93](https://github.com/initialencounter/Aircraft/commit/8d68d9345c8a853ff53205ebbd7c54415f3160ef))

## [v3.0.0] - 2025-11-23

### 新增

- 纯浏览器实现
- YOLO 标签检测

## [v2.1.10] - 2025-11-11

### 修复

- 海陆运电池标记验证

## [v2.1.9] - 2025-11-11

### 修复

- 海陆运比对数据错误

## [v2.1.8] - 2025-11-11

### 修复

- 钠离子电池跌落检查([9b2f6e0](https://github.com/initialencounter/Aircraft/commit/9b2f6e005229bcd7639de35a2efe4007bb51694d))

## [v2.1.7] - 2025-11-10

### 修复

- 项目列表序号显示错误([859dde6](https://github.com/initialencounter/Aircraft/commit/859dde6d83b39eab515423c4cae0dee479852c04))

### 新增

- 比对数据适配空运

## [v2.1.5] - 2025-11-06

### 新增

- SoC荷电状态和设备显示电量验证([f931c0a](https://github.com/initialencounter/Aircraft/commit/f931c0aa68229914df6c22e293736b793f797a2e))

## [v2.1.0] - 2025-11-01

### 新增

- 适配钠离子电池([cc126ec](https://github.com/initialencounter/Aircraft/commit/cc126ec9db8631a04644d365af54f0503894872f))

### 修复

- 海陆运跌落,188标记无法验证

## [v2.0.15] - 2025-10-30

### 新增

- 所有搜索页面默认显示100条结果([f77cb3b](https://github.com/initialencounter/Aircraft/commit/f77cb3b38dfc9d228c5eceb0d79e7ff8e231dead))

- 自动保存配置([361c954](https://github.com/initialencounter/Aircraft/commit/361c954db1e0c55349efac873c5a0bbcb8856281))

### 变动

- 默认关闭初验双击品名截图([d5bf158](https://github.com/initialencounter/Aircraft/commit/d5bf158374de930b31a8c7c56ab7a07f816490e2))

## [v2.0.14] - 2025-10-14

### 新增

- 分配并提交试验单([3c63190](https://github.com/initialencounter/Aircraft/commit/3c631908d3ff857aa84e9262795ec0297bf10477))

### 修复

- 默认关闭在新标签页打开项目编号([2cdb9f2](https://github.com/initialencounter/Aircraft/commit/2cdb9f2c89f0aec6c593af8e2f2fd116fb6fe348))

## [v2.0.13] - 2025-10-11

### 修复

- 查询或刷新列表后，无法在初验页面打开检验单([ffc1f2b](https://github.com/initialencounter/Aircraft/commit/ffc1f2b3fced74d3f34f4067c4157d027727691c))

## [v2.0.12] - 2025-10-11

### 新增

- 全局生效在新标签页打开项目编号([cca89e6](https://github.com/initialencounter/Aircraft/commit/cca89e68dd0d4a9ca00a21941091ac3afc7dc732))

### 修复

- 某些页面无法设置项目编号颜色([ef65609](https://github.com/initialencounter/Aircraft/commit/ef65609e1bf406129c4534eb7ef956481deb1f13))
- 查询或刷新列表后无法在新标签页打开检验单([1eab2d3](https://github.com/initialencounter/Aircraft/commit/1eab2d31b8049d7355a32f14d310c6a81cb1213c))

## [v2.0.11] - 2025-10-10

### 新增

- 在新标签页打开检验单([9827b58](https://github.com/initialencounter/Aircraft/commit/9827b581fc0c8ebfc999adae44e3da2c0cf08d9f))
- 自定义项目编号颜色

## [v2.0.10] - 2025-09-17

### 新增

- 电池型号提示([05c513](https://github.com/initialencounter/Aircraft/commit/05c561388ef9e744640079e7a3044985d19ed53d)) 默认设置了这些型号，可在选项页面添加更多型号。

```json
[
  "27100118P",
  "28100118",
  "624475ART",
  "506795",
  "INR18650-1.5Ah",
  "P13001L",
  "2998125",
  "BL-18EI"
]
```

## [v2.0.8] - 2025-09-05

### 修复

- 分配按钮导致底栏页数跳转无法显示([0e8d1e0](https://github.com/initialencounter/Aircraft/commit/0e8d1e0d646abe3d3adbfb4c8f26274b96f39c81))
- 无法加载验证等待动画([6e3884c](https://github.com/initialencounter/Aircraft/commit/6e3884ca09cd7b3e147961a762221ff9c0914345))

### 新增

- 勾选开启运输时警告([778e0b3](https://github.com/initialencounter/Aircraft/commit/778e0b3d2be5a670d325c17199fb5843ee0e4da4))
- 5%尼古丁含量,质量体积分数验证([22073eb](https://github.com/initialencounter/Aircraft/commit/22073eb35b30b228e8065f42c1fd47498003e258))
- 967该电[池/芯]已经做好防短路措施并已采取防止意外启动措施([2b83437](https://github.com/initialencounter/Aircraft/commit/2b83437a28a55952b5ef868798b1d72cd730d555))
- 描述中电池质量单位g([c993888](https://github.com/initialencounter/Aircraft/commit/c993888fefa1aa9747294bbb98126bf0a2e9a029))

## [v2.0.7] - 2025-08-21

### 修复

- 电池数量为1时，无法验证净重([4087827](https://github.com/initialencounter/Aircraft/commit/4087827753e096560a6de2ed1699b40e7b5ba768))
- 无法匹配单位mWh，mV,kV,kAh([208b29b](https://github.com/initialencounter/Aircraft/commit/208b29b965341b2cc03680599fb0b30225093abc))
- 海运导入搜索自身编号([855b06c](https://github.com/initialencounter/Aircraft/commit/855b06c837b9f936f8d117e6adf4220ec5e76d07))

### 新增

- 电池能量密度验证，最高不超过320Wh/kg([45acdc4](https://github.com/initialencounter/Aircraft/commit/45acdc40b114bb982b202c48f1418ad4a2abf937))
- 圆形电池尺寸，直径符号验证([4040212](https://github.com/initialencounter/Aircraft/commit/40402128b8142432f1482cd64ad666adcac845a7))

## [v2.0.6] - 2025-05-19

### 修复

- 初验金额设置

### 验证规则

- 海陆运非限制188验证

## [v2.0.1] - 2025-04-09

### 新增

- 概要 LLM 验证
- 初验录入双击截图，截取中英文品名，用于确认品名
- 电池数量验证，设备内置或包装电池数量 \* 设备数量 = 包装机内电池总数
- 迁移到框架wxt

### 修复

- 修复无法验证设备英文型号
- 切换付款方后无法设置金额

### 验证规则

- 非仅限货机时，客货机不能为Forbidden

## [v1.8.13] - 2025-02-21

### 修复

- 电池质量单位匹配错误

## [v1.8.12] - 2025-02-20

### 修复

- firefox 跨域请求错误。
- 概要的标题和报告编号验证错误。

### 新增

- 概要的形状和颜色验证。

## [v1.8.11] - 2025-02-17

### 修复

- 瓦时、容量和质量单位匹配错误

## [v1.8.10] - 2025-01-7

### 新增

- 支持验证图片和概要（需要安装[图片概要解析器](/attachment)）。
- 修复验证通过后气泡挡住提交按钮。
- 修复一键退回只能退回一次。

## [v1.8.5] - 2024-12-11

### 新增

- 自动刷新样品检验的项目列表。
- 样品检验导入时，自动搜索剪切板的项目编号。
- 初验时，聚焦导入窗口，使用快捷键 `Ctrl + D`，自动导入剪切板的项目编号。
- 陆运表单验证。

### 修复

- 在业务受理无法查看空运以外的检验单。
- UN3556编号提示错误。
- 尺寸单位验证失效。
- 无法设置道路金额。

### 验证规则

- 电池净重计算。
- 瓦时数计算。
- 注意事项验证。
- 堆码重复勾选验证。
- 设备名称型号验证。
- 海运内置电池，注意事项验证。

## [v1.7.6] - 2024-12-02

### 新增

- 保存后立即分配。
- 在业务受理处查看检验单。

### 修复

- 锂电池标记验证错误。

## [v1.6.5] - 2024-11-25

### 验证规则

- 新增
  - 电池限重验证。
  - 包装说明验证。
  - IA/IB 验证。
  - 荷电状态验证。
  - 加贴锂电池标记验证。
- 删除
  - 海运毛重验证。

### 修复

- 修复配置页面显示错误。
- 修复无法设置默认颜色。
- 旧版浏览器无法加载插件。
- 增大海运的瓦时数输入框尺寸。

### 改进

- 默认关闭查询时的自动填充项目编号。

## [v1.6.0] - 2024-11-11

### 新增

- 支持显示委托方英文名称。
  在录入委托方时，只能查看委托方中文名称和结算人，无法查看英文名称，需要来回切换页面核对委托方英文名称，非常麻烦。
  现在可以直接在搜索结果显示委托方英文名称，无需来回切换页面。
  如果您不需要显示委托方英文名称，可以到插件的选项页面关闭此功能。

## [v1.5.13] - 2024-11-06

### 修复

- 初验
  - 导入时，结算方式无法自动勾选月结。
- 样品检验
  - 967/970, 966/969 第II部分勾选堆码后，仍提示未勾选。
  - `Ctrl+S` 快捷键保存后，仍提示未保存。
  - 无法关闭导入快捷键。
- 其他
  - 修改备注后，无法设置颜色。

### 新增

- 支持导入导出配置。
- 支持自定义初验内容。
- 部分功能适配化学品。

## [v1.5.9] - 2024-11-05

### 新增

- 支持自定义下一年报告字体颜色，和背景颜色。

## [v1.5.8] - 2024-11-05

### 新增

- 增大海运的其他描述的输入框尺寸。
- 堆码验证。当 967/970, 966/969 第II部分未勾堆码或堆码评估，点击验证按钮将弹出提示。

## [v1.5.7] - 2024-11-04

### 新增

- 导入时，自动勾选标记为明年报告。

## [v1.5.6] - 2024-11-01

### 改进

- 导入搜索时添加月份（为上一个月），以减少搜索时间。
  如果这个改动不符合您出报告的习惯，可以打开插件的选项页面，将`导入时自动添加月份`选项打开。

## [v1.5.5] - 2024-10-24

### 新增

- 实现验证上传资料功能，当未上传资料时或上传资料错误时，点击验证按钮将弹出提示。

### 改进

- 增大电池尺寸的输入框尺寸。

## [v1.5.4] - 2024-09-24

### 修复

- 导入前搜索检验单时，当剪切板存在完整的项目编号时，去除搜索的预设。

## [v1.5.3] - 2024-09-11

### 修复

- 修复初验改变运输方式时，金额设置失败。

## [v1.5.2] - 2024-09-10

### 修复

- 修复导入后没有重新设置金额。

## [v1.5.1] - 2024-09-09

### 新增

- 将一键退回作为可选项。

## [v1.5.0] - 2024-09-05

### 新增

- 实现一键退回功能。

## [v1.4.0] - 2024-09-05

### 新增

- 实现表单验证功能（检验单右上角）。
  验证规则详见 [验证规则](/rule)，欢迎补充。

## [v1.3.0] - 2024-09-05

### 新增

- 实现一键分配功能。

## [v1.0.0] - 2024-08-29

### 新增

- 使用报告编号搜索时可以自动删除输入的非法字符，如空格。
- 搜索的报告日期范围会根据输入的编号中的日期来自动设置，无需手动设置日期。
- 查询检验单时可以自动设置运输方式。
- 检验单发生改动时，关闭页面将提示未保存，会在标题前面加上星号 #1。
- 标签页面标题显示为项目编号。
