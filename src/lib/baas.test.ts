import { describe,expect,it } from "vitest";
import { createApiKey,verifyApiKey } from "./api-key";
import { appendWorkspaceEvent } from "./event-service";
import { MemoryZeroStore } from "./store-memory";

describe("ZeroAI BaaS invariants",()=>{
  it("hashes API key secrets and verifies the presented token",()=>{
    const {token,record}=createApiKey("workspace","test",["state:read"],"salt");
    expect(record.secretHash).not.toContain(token);
    expect(verifyApiKey(token,record,"salt")).toBe(true);
    expect(verifyApiKey(token+"x",record,"salt")).toBe(false);
  });

  it("rejects stale canonical-state writes",async()=>{
    const store=new MemoryZeroStore();
    await store.putState({workspaceId:"w",key:"k",version:1,value:{a:1},valueHash:"h1",updatedAt:"now"},0);
    await expect(store.putState({workspaceId:"w",key:"k",version:2,value:{a:2},valueHash:"h2",updatedAt:"later"},0)).rejects.toThrow("STATE_VERSION_CONFLICT");
  });

  it("chains durable events through parent hashes",async()=>{
    const store=new MemoryZeroStore();
    const one=await appendWorkspaceEvent({store,workspaceId:"w",stream:"execution",actor:"a",action:"started",payload:{n:1},secret:"secret"});
    const two=await appendWorkspaceEvent({store,workspaceId:"w",stream:"execution",actor:"a",action:"finished",payload:{n:2},secret:"secret"});
    expect(one.sequence).toBe(1);
    expect(two.sequence).toBe(2);
    expect(two.parentHash).toBe(one.eventHash);
  });
});
