/* tslint:disable */
/* eslint-disable */
export function get_summary_info(buffer: Uint8Array): SummaryInfo;
export function get_goods_info(buffer: Uint8Array, require_image: boolean, is_965: boolean): GoodsInfoWasm;
export interface GoodsInfoWasm {
    project_no: string;
    item_c_name: string;
    labels: string[];
    image: number[] | null;
}

export interface SegmentResult {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    label: string;
    confidence: number;
    mask: number[][];
}

export interface SummaryInfo {
    id: string;
    projectId: string;
    consignor: string;
    consignorInfo: string;
    manufacturer: string;
    manufacturerInfo: string;
    testlab: string;
    testlabInfo: string;
    cnName: string;
    enName: string;
    classification: string;
    model: string;
    trademark: string;
    voltage: string;
    capacity: string;
    watt: string;
    color: string;
    shape: string;
    mass: string;
    licontent: string;
    testReportNo: string;
    testDate: string;
    testManual: string;
    test1: string;
    test2: string;
    test3: string;
    test4: string;
    test5: string;
    test6: string;
    test7: string;
    test8: string;
    un38F: string;
    un38G: string;
    note: string;
    title: string;
    projectNo: string;
    issueDate: string;
}

export interface SearchPropertyParams {
    searchText: string;
}

export interface DataModel {
    id: number;
    appraiserName: string;
    assigneeName: string;
    auditorName: string | null;
    conclusions: number | null;
    displayStatus: string;
    nextYear: number | null;
    principalName: string | null;
    projectId: string;
    projectNo: string | null;
    repeat: number;
    reportType: number;
    submitDate: string;
    surveyorNames: string | null;
    systemId: string;
    selfId: string;
    itemCName: string | null;
    itemEName: string | null;
    mnotes: string | null;
    reportNo: string | null;
    tnotes: string | null;
}

export interface PdfReadResult {
    text: string;
    images: number[] | null;
}

export interface GoodsInfo {
    projectNo: string;
    itemCName: string;
    labels: string[];
    segmentResults: SegmentResult[];
}

export interface ClipboardHotkey {
    hotkeys: string[];
    clipboardContentName: string;
}

export interface SearchResponse {
    results: SearchResult[];
}

export interface SearchResult {
    path: string;
    name: string;
}

export interface SearchParams {
    search: string;
    json: number;
    path_column: number;
}

export interface DirectoryInfo {
    dir: string;
}

export interface ProjectRow {
    itemCName: string;
    itemEName: string;
    editStatus: number;
    projectId: string;
    projectNo: string;
}

export interface QueryResult {
    rows: ProjectRow[];
}

export interface LogMessage {
    timeStamp: string;
    level: string;
    message: string;
}

export interface ResponseFormat {
    type: string;
}

export interface Usage {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
}

export interface Message {
    content: string;
    role: string;
}

export interface Choice {
    finish_reason: string | null;
    index: number | null;
    message: Message | null;
}

export interface ChatResponse {
    choices: Choice[];
    created: number;
    id: string;
    model: string;
    object: string;
    usage: Usage;
}

export interface ChatRequest {
    messages: Message[];
    model: string;
    temperature: number;
    response_format: ResponseFormat;
}

export interface PdfDeleteResult {
    deleted: boolean;
    id: string;
    object: string;
}

export interface PdfReadResult {
    content: string;
    fileType: string;
    filename: string;
    title: string;
    type: string;
}

export interface FileUploadResult {
    bytes: number;
    createdAt: number;
    filename: string;
    id: string;
    object: string;
    purpose: string;
    status: string;
    statusDetails: string;
}

export interface OtherConfig {
    queryServerHost: string;
}

export interface Config {
    base: BaseConfig;
    server: ServerConfig;
    hotkey: HotkeyConfig;
    llm: LLMConfig;
    other: OtherConfig;
}

export interface LLMConfig {
    baseUrl: string;
    apiKey: string;
    model: string;
}

export interface HotkeyConfig {
    uploadEnable: boolean;
    uploadKey: string;
    copyEnable: boolean;
    copyKey: string;
    customHotkey: CustomHotkey[];
}

export interface CustomHotkey {
    hotkey: string;
    cmd: string;
}

export interface ServerConfig {
    baseUrl: string;
    username: string;
    password: string;
    port: number;
    debug: boolean;
    logEnabled: boolean;
}

export interface BaseConfig {
    nothing: string;
    autoStart: boolean;
    silentStart: boolean;
}

export interface AttachmentInfo {
    summary: SummaryInfo;
    goods: GoodsInfo;
    other: OtherInfo;
}

export interface OtherInfo {
    stackEvaluation: boolean;
    projectDir: string;
}


export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly get_summary_info: (a: number, b: number) => [number, number, number];
  readonly get_goods_info: (a: number, b: number, c: number, d: number) => [number, number, number];
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
