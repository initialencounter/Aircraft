export const env = { wasm: { simd: true } };
export const InferenceSession = { create: () => { throw new Error('Not supported in Chrome service worker'); } };
export const Tensor = class { };
