import type { ZeroStore } from "./store";
import { MemoryZeroStore } from "./store-memory";

declare global {
  var __zeroaiMemoryStore:MemoryZeroStore|undefined;
}

export function getStore():ZeroStore {
  if (process.env.NODE_ENV==="production") {
    throw new Error("ZEROAI_PERSISTENCE_NOT_CONFIGURED");
  }
  globalThis.__zeroaiMemoryStore ??= new MemoryZeroStore();
  return globalThis.__zeroaiMemoryStore;
}
