import type { ZeroStore } from "./store";
import { MemoryZeroStore } from "./store-memory";
import { NeonDataApiZeroStore } from "./store-neon-data-api";

declare global {
  var __zeroaiMemoryStore:MemoryZeroStore|undefined;
  var __zeroaiNeonStore:NeonDataApiZeroStore|undefined;
}

export function getStore():ZeroStore {
  const dataApiUrl=process.env.NEON_DATA_API_URL;
  const token=process.env.ZEROAI_NEON_DATA_API_TOKEN;

  if(dataApiUrl && token){
    globalThis.__zeroaiNeonStore ??= new NeonDataApiZeroStore(dataApiUrl,token);
    return globalThis.__zeroaiNeonStore;
  }

  if (process.env.NODE_ENV==="production") {
    throw new Error("ZEROAI_PERSISTENCE_NOT_CONFIGURED");
  }

  globalThis.__zeroaiMemoryStore ??= new MemoryZeroStore();
  return globalThis.__zeroaiMemoryStore;
}
