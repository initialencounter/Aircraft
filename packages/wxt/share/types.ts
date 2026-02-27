export interface ProjectTraceData {
  appraiserName: string;
  assigneeName: string;
  auditorName: string;
  conclusions: number;
  displayStatus: string;
  id: string;
  itemCName: string;
  itemEName: string;
  mnotes: string;
  nextYear: boolean;
  principalName: string;
  projectId: string;
  projectNo: string;
  repeat: boolean;
  reportNo: string;
  reportType: number;
  submitDate: string;
  surveyorNames: null;
  systemId: string;
  tnotes: string;
}

export interface ProjectTraceResponse {
  total: number,
  rows: ProjectTraceData[],
}


export interface BatteryTestSummary {
  createdBy: string
  createdDate: string
  modifiedBy: string
  modifiedDate: string
  id: string
  projectId: string
  sn: number
  consignor: string
  consignorInfo: string
  manufacturer: string
  manufacturerInfo: string
  testlab: string
  testlabInfo: string
  cnName: string
  enName: string
  classification: string
  type: string
  trademark: string
  voltage: string
  capacity: string
  watt: string
  color: string
  shape: string
  mass: string
  licontent: string
  testReportNo: string
  testDate: string
  testManual: string
  test1: boolean
  test2: boolean
  test3: boolean
  test4: boolean
  test5: boolean
  test6: boolean
  test7: boolean
  test8: boolean
  un38f: boolean
  un38g: boolean
  note: string
  issuedStatus: boolean
  issuedDate: string
  createdByName: string
  modifiedByName: string
  projectNo: string
}