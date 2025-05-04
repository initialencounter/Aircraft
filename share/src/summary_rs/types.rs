use napi_derive::napi;
use serde::{Serialize, Deserialize};

#[napi(object)]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SummaryInfo {
    /// 项目ID
    pub id: String,
    /// 项目ID
    pub project_id: String,

    /// 委托方
    pub consignor: String,
    /// 委托方信息
    pub consignor_info: String,

    /// 制造商
    pub manufacturer: String,
    /// 制造商信息
    pub manufacturer_info: String,

    /// 测试实验室
    pub testlab: String,
    /// 测试实验室信息
    pub testlab_info: String,

    /// 中文名称
    pub cn_name: String,
    /// 英文名称
    pub en_name: String,
    /// 电池/电芯类别
    pub classification: String,

    /// 型号
    #[napi(js_name = "type")]
    #[serde(rename = "type")]
    pub model: String,
    /// 商标
    pub trademark: String,

    /// 电压
    pub voltage: String,
    /// 容量
    pub capacity: String,

    /// 瓦数
    pub watt: String,
    /// 颜色
    pub color: String,
    /// 形状
    pub shape: String,

    /// 质量
    pub mass: String,
    /// 锂含量
    pub licontent: String,

    /// 测试报告编号
    pub test_report_no: String,
    /// 测试日期
    pub test_date: String,
    

    /// 测试标准
    pub test_manual: String,

    /// 测试项目
    pub test1: String,
    pub test2: String,
    pub test3: String,

    pub test4: String,
    pub test5: String,
    pub test6: String,

    pub test7: String,
    pub test8: String,

    #[napi(js_name = "un38f")]
    #[serde(rename = "un38f")]
    pub un38f: String,
    #[napi(js_name = "un38g")]
    #[serde(rename = "un38g")]
    pub un38g: String,

    /// 备注
    pub note: String,

    /// 标题
    pub title: String,
    /// 项目编号
    pub project_no: String,
    /// 签发日期
    pub issue_date: String,
}

impl SummaryInfo {
    pub fn default() -> Self {
        Self {
            id: "".to_string(),
            project_id: "".to_string(),
            consignor: "".to_string(),
            consignor_info: "".to_string(),
            manufacturer: "".to_string(),
            manufacturer_info: "".to_string(),
            testlab: "".to_string(),
            testlab_info: "".to_string(),
            cn_name: "".to_string(),
            en_name: "".to_string(),
            classification: "".to_string(),
            model: "".to_string(),
            trademark: "".to_string(),
            voltage: "".to_string(),
            capacity: "".to_string(),
            watt: "".to_string(),
            color: "".to_string(),
            shape: "".to_string(),
            mass: "".to_string(),
            licontent: "".to_string(),
            test_report_no: "".to_string(),
            test_date: "".to_string(),
            test_manual: "".to_string(),
            test1: "".to_string(),
            test2: "".to_string(),
            test3: "".to_string(),
            test4: "".to_string(),
            test5: "".to_string(),
            test6: "".to_string(),
            test7: "".to_string(),
            test8: "".to_string(),
            un38f: "".to_string(),
            un38g: "".to_string(),
            note: "".to_string(),
            title: "".to_string(),
            project_no: "".to_string(),
            issue_date: "".to_string(),
        }
    }
}
