/* tslint:disable */
/* eslint-disable */
export function get_summary_info(buffer: Uint8Array): SummaryInfo;
export function get_goods_info(buffer: Uint8Array, require_image: boolean): PdfReadResult;
export interface PdfReadResult {
    text: string;
    images: number[][] | null;
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
    un38f: string;
    un38g: string;
    note: string;
    title: string;
    projectNo: string;
    issueDate: string;
}


export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly get_summary_info: (a: number, b: number) => [number, number, number];
  readonly get_goods_info: (a: number, b: number, c: number) => [number, number, number];
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
