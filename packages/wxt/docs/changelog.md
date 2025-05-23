# 更新日志

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
