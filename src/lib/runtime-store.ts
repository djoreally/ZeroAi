import type { ZeroStore } from "./store";
import { MemoryZeroStore } from "./store-memory";
import { NeonDataApiZeroStore } from "./store-neon-data-api";
import { getNeonDataApiToken } from "./neon-service-token";

declare global {
  var __zeroaiMemoryStore:MemoryZeroStore|undefined;
  var __zeroaiNeonStore:NeonDataApiZeroStore|undefined;
}

export function getStore():ZeroStore {
  const dataApiUrl=process.env.NEON_DATA_API_URL;

  if(dataApiUrl){
    globalThis.__zeroaiNeonStore ??= new NeonDataApiZeroStore(dataApiUrl,getNeonDataApiToken);
    return globalThis.__zeroaiNeonStore;
  }

  if (process.env.NODE_ENV==="production") {
    throw new Error("ZEROAI_PERSISTENCE_NOT_CONFIGURED");
  }

  globalThis.__zeroaiMemoryStore ??= new MemoryZeroStore();
  return globalThis.__zeroaiMemoryStore;
}
