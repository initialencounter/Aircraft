export interface FileItem {
  file: File
  size: string
  lastModified: string
  additionValue?: string
  type: string
  icon: string
  bgColor?: string
}

export interface DataModel {
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