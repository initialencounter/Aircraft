export interface FileItem {
  file: File
  size: string
  lastModified: string
  additionValue?: string
  type: string
  icon: string
  bgColor?: string
}

export interface SummaryFromLLM {
  /**制造商或生产工厂中文名称*/
  manufacturerCName: string | null

  /**制造商或生产工厂英文名称*/
  manufacturerEName: string | null

  /**测试单位 Test Lab*/
  testLab: string | null

  /**电池中文名称*/
  cnName: string | null

  /**电池英文名称*/
  enName: string | null

  /**电池类型
   * 锂离子电芯：不含电路保护板的单电芯电池，判断方法：T1的测试数量为10个，T7为不适用
   * 单电芯锂离子电池：含电路保护板单电芯电池，判断方法：T1的测试数量为10个,电芯的组合方式为1S1P
   * 锂离子电池：多个电芯组成的电池，判断方法：T1的测试数量为8个或4个
   * 锂金属电芯：单电芯锂金属电池，判断方法：T1的测试数量为10个，T7为不适用
   * 锂金属电池：多个电芯组成的锂金属电池，判断方法：T7为不适用，T1的测试数量为8个或4个
   */
  classification:
    | '锂离子电池'
    | '锂离子电芯'
    | '锂金属电池'
    | '锂金属电芯'
    | '单电芯锂离子电池'
    | '单电芯锂金属电池'
    | null

  /**电池型号*/
  type: string | null

  /**电池商标*/
  trademark: string | null

  /**电池电压，单位：V*/
  voltage: number | null

  /**电池容量，单位：mAh*/
  capacity: number | null

  /**电池瓦时，单位：Wh
   * 如果是锂金属电池则无需填写
   */
  watt: number | null

  /**电池颜色*/
  color: string | null

  /**电池形状*/
  shape: string | null

  /**单块电池质量，单位：g
   * 如果报告中没有写明，则需要从T1原始数据中取一个平均值或最大值
   */
  mass: number | null

  /**锂含量，单位：g
   * 如果是锂离子电池则无需填写
   */
  licontent: number | null

  /**UN38.3测试报告编号*/
  testReportNo: string | null

  /** UN38.3测试报告签发日期签发日期
   * 格式为：yyyy-MM-dd，如果日期为2021.01.01，则填需要转为2021-01-01
   */
  testDate: string | null

  /** UN38.3测试报告测试标准或试验依据Test Method
   * 版本号和修订号有区别的，不要弄错了
   * 没有修订号的，不要写修订号，这个经常容易弄错，请仔细核对
   */
  testManual:
    | '第8版'
    | '第7版修订1'
    | '第7版'
    | '第6版修订1'
    | '第6版'
    | '第5版修订1和修订2'
    | '第5版修订1'
    | '第5版'
    | '第4版'
    | null

  /**
   * T.1：高度模拟 Altitude Simulation(通过true, 不适用/未通过false)
   */
  test1: boolean

  /**T.2：温度试验 Thermal Test*/
  test2: boolean

  /**T.3：振动 Vibration*/
  test3: boolean

  /**T.4：冲击 Shock*/
  test4: boolean

  /**T.5：外部短路 External Short Circuit*/
  test5: boolean

  /**T.6：撞击/挤压 Impact/Crush */
  test6: boolean

  /**T.7：过度充电 vercharge*/
  test7: boolean

  /**T.8：T.8：强制放电 Forced Discharge*/
  test8: boolean
}
