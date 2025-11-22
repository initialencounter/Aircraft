declare module "/aircraft.js" {
  /**
   * Initialize the WASM module
   * @param module_or_path Path to the WASM file or the module itself
   */
  export default function initWasm(module_or_path?: string | URL | Request | BufferSource): Promise<any>;

  /**
   * Parse PDF buffer and extract content
   * @param buffer PDF file as Uint8Array
   * @returns Parsed PDF content as string
   */
  export function add(buffer: Uint8Array): string;

  /**
   * Get PDF title from buffer
   * @param buffer PDF file as Uint8Array
   * @returns PDF title as string
   */
  export function get_pdf_title(buffer: Uint8Array): string;
}
