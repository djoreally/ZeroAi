import { describe,expect,it } from "vitest";
import { certify } from "./cert";
import { validateGateGraph } from "./gates";
import { createLedgerEvent,verifyLedgerChain } from "./ledger";
import { evaluatePolicy } from "./policy";
import { TaskGraphSchema,topologicalOrder } from "./task-graph";

describe("ZeroAI invariants",()=>{
  it("detects tampering and incomplete ledger chains",()=>{
    const secret="test-secret";
    const one=createLedgerEvent({eventId:"1",workspaceId:"w",actor:"a",action:"start",timestamp:"2026-10-01T00:00:00Z",inputHash:"i",parentHash:"GENESIS",evidenceRefs:[]},secret);
    const two=createLedgerEvent({eventId:"2",workspaceId:"w",actor:"a",action:"finish",timestamp:"2026-10-01T00:00:01Z",inputHash:"i2",outputHash:"o",parentHash:one.eventHash,evidenceRefs:["e1"]},secret);
    expect(verifyLedgerChain([one,two],secret)).toBe(true);
    expect(verifyLedgerChain([],secret)).toBe(false);
    expect(verifyLedgerChain([two],secret)).toBe(false);
    expect(verifyLedgerChain([{...one,action:"changed"},two],secret)).toBe(false);
  });

  it("does not certify empty or unknown evidence",()=>{
    expect(certify({id:"empty",requiredEvidenceTypes:[]},[]).state).toBe("UNKNOWN");
    expect(certify({id:"req",requiredEvidenceTypes:["test"]},[{id:"e",type:"test",state:"UNKNOWN"}]).state).toBe("UNKNOWN");
  });

  it("defaults policy to deny",()=>{
    expect(evaluatePolicy([], {agentId:"backend",action:"DEPLOY",resource:"prod",environment:"production"}).decision).toBe("DENY");
  });

  it("rejects duplicate task ids",()=>{
    const node={id:"build",dependencies:[],owner:"backend",inputs:{},expectedOutputs:[],timeoutMs:1000,retryPolicy:{maxAttempts:1,backoffMs:0},permissions:[]};
    expect(TaskGraphSchema.safeParse({nodes:[node,node]}).success).toBe(false);
  });

  it("orders dependencies before dependents",()=>{
    const ordered=topologicalOrder([
      {id:"test",dependencies:["build"],owner:"qa",inputs:{},expectedOutputs:[],timeoutMs:1000,retryPolicy:{maxAttempts:1,backoffMs:0},permissions:[]},
      {id:"build",dependencies:[],owner:"backend",inputs:{},expectedOutputs:[],timeoutMs:1000,retryPolicy:{maxAttempts:1,backoffMs:0},permissions:[]}
    ]);
    expect(ordered.map(node=>node.id)).toEqual(["build","test"]);
  });

  it("rejects gate cycles and self-dependencies",()=>{
    expect(validateGateGraph([{id:"a",requires:["a"],state:"PENDING"}]).length).toBeGreaterThan(0);
    expect(validateGateGraph([
      {id:"a",requires:["b"],state:"PENDING"},
      {id:"b",requires:["a"],state:"PENDING"}
    ])).toContain("Gate graph contains a cycle");
  });
});
