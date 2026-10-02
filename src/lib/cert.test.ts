import { describe, expect, it } from "vitest";
import { certify } from "./cert";

describe("certification reducer",()=>{
  it("returns VERIFIED when every required evidence type is verified",()=>{
    const result=certify(
      {id:"req-1",requiredEvidenceTypes:["tests","build"]},
      [
        {id:"e1",type:"tests",state:"VERIFIED"},
        {id:"e2",type:"build",state:"VERIFIED"}
      ]
    );
    expect(result.state).toBe("VERIFIED");
  });

  it("returns FAILED for product evidence failure",()=>{
    const result=certify(
      {id:"req-2",requiredEvidenceTypes:["tests"]},
      [{id:"e1",type:"tests",state:"FAILED"}]
    );
    expect(result.state).toBe("FAILED");
  });

  it("returns BLOCKED_INFRASTRUCTURE when required evidence cannot run for infrastructure reasons",()=>{
    const result=certify(
      {id:"req-3",requiredEvidenceTypes:["hosted_ci"]},
      [{id:"e1",type:"hosted_ci",state:"BLOCKED_INFRASTRUCTURE"}]
    );
    expect(result.state).toBe("BLOCKED_INFRASTRUCTURE");
  });
});
