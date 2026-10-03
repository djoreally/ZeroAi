import { describe,expect,it } from "vitest";
import { compileBrainContext,inferMemories,memoryPredicate,scopeSubject,stableMemoryId } from "./brain-memory";
import type { MemoryFactRecord } from "./domain";

function fact(overrides:Partial<MemoryFactRecord>):MemoryFactRecord{
  return {
    id:"00000000-0000-0000-0000-000000000001",
    workspaceId:"w1",
    subject:"scope:user=u1",
    predicate:"brain.fact.note",
    object:"default memory",
    confidence:0.9,
    salience:0.8,
    validFrom:"2026-10-01T00:00:00.000Z",
    createdAt:"2026-10-01T00:00:00.000Z",
    updatedAt:"2026-10-01T00:00:00.000Z",
    ...overrides
  };
}

describe("ZeroMemory brain",()=>{
  it("creates stable scoped memory identifiers",()=>{
    const scope=scopeSubject({userId:"u1",agentId:"assistant"});
    const predicate=memoryPredicate("preference","tone");
    expect(stableMemoryId("w1",scope,predicate)).toBe(stableMemoryId("w1",scope,predicate));
    expect(scope).toContain("user=u1");
    expect(predicate).toBe("brain.preference.tone");
  });

  it("infers common durable memory signals without storing ordinary chatter",()=>{
    expect(inferMemories("hello there")).toEqual([]);
    expect(inferMemories("I prefer concise answers")).toEqual([
      expect.objectContaining({kind:"preference",key:"general",value:"concise answers"})
    ]);
    expect(inferMemories("Remember that the launch is Friday")).toEqual([
      expect.objectContaining({kind:"fact",value:"the launch is Friday"})
    ]);
  });

  it("keeps other users out of working memory",()=>{
    const facts=[
      fact({id:"1",subject:"scope:user=u1",predicate:"brain.preference.general",object:"concise answers"}),
      fact({id:"2",subject:"scope:user=u2",predicate:"brain.preference.general",object:"long answers"}),
      fact({id:"3",subject:"scope:workspace",predicate:"brain.constraint.default",object:"Use Neon Data API"})
    ];
    const context=compileBrainContext(facts,{userId:"u1"},"How should you answer?",10);
    expect(context.workingMemory).toContain("concise answers");
    expect(context.workingMemory).toContain("Use Neon Data API");
    expect(context.workingMemory).not.toContain("long answers");
  });

  it("uses the latest value for the same scoped predicate",()=>{
    const facts=[
      fact({id:"1",predicate:"brain.goal.current",object:"old goal",updatedAt:"2026-09-01T00:00:00.000Z"}),
      fact({id:"2",predicate:"brain.goal.current",object:"new goal",updatedAt:"2026-10-01T00:00:00.000Z"})
    ];
    const context=compileBrainContext(facts,{userId:"u1"},"goal",10);
    expect(context.workingMemory).toContain("new goal");
    expect(context.workingMemory).not.toContain("old goal");
  });
});
