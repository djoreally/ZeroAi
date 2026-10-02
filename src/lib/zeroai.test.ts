import { describe,expect,it } from "vitest";
import { createLedgerEvent,verifyLedgerChain } from "@/lib/ledger";
import { evaluatePolicy } from "@/lib/policy";
import { topologicalOrder } from "@/lib/task-graph";

describe("ZeroAI invariants",()=>{
  it("detects tampering in the ledger chain",()=>{
    const secret="test-secret";
    const one=createLedgerEvent({eventId:"1",workspaceId:"w",actor:"a",action:"start",timestamp:"2026-10-01T00:00:00Z",inputHash:"i",parentHash:"GENESIS",evidenceRefs:[]},secret);
    const two=createLedgerEvent({eventId:"2",workspaceId:"w",actor:"a",action:"finish",timestamp:"2026-10-01T00:00:01Z",inputHash:"i2",outputHash:"o",parentHash:one.eventHash,evidenceRefs:["e1"]},secret);
    expect(verifyLedgerChain([one,two],secret)).toBe(true);
    expect(verifyLedgerChain([{...one,action:"changed"},two],secret)).toBe(false);
  });

  it("defaults policy to deny",()=>{
    expect(evaluatePolicy([], {agentId:"backend",action:"DEPLOY",resource:"prod",environment:"production"}).decision).toBe("DENY");
  });

  it("orders dependencies before dependents",()=>{
    const ordered=topologicalOrder([
      {id:"test",dependencies:["build"],owner:"qa",inputs:{},expectedOutputs:[],timeoutMs:1000,retryPolicy:{maxAttempts:1,backoffMs:0},permissions:[]},
      {id:"build",dependencies:[],owner:"backend",inputs:{},expectedOutputs:[],timeoutMs:1000,retryPolicy:{maxAttempts:1,backoffMs:0},permissions:[]}
    ]);
    expect(ordered.map(node=>node.id)).toEqual(["build","test"]);
  });
});
