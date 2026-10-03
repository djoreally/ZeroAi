import { describe,expect,it } from "vitest";
import { compileBrainContext,consolidationCandidates,findSupersededFact,inferMemories,memoryDecay,memoryPredicate,scopeSubject,stableMemoryId,supersessionEpisode } from "./brain-memory";
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

  it("infers common durable signals and episodic experiences without storing chatter",()=>{
    expect(inferMemories("hello there")).toEqual([]);
    expect(inferMemories("I prefer concise answers")).toEqual([
      expect.objectContaining({kind:"preference",key:"general",value:"concise answers"})
    ]);
    expect(inferMemories("Remember that the launch is Friday")).toEqual([
      expect.objectContaining({kind:"fact",value:"the launch is Friday"})
    ]);
    expect(inferMemories("We tried the old endpoint and it timed out")).toEqual([
      expect.objectContaining({kind:"episode",value:"We tried the old endpoint and it timed out"})
    ]);
  });

  it("keeps other users out of working memory and reports the ZeroPipe reduction",()=>{
    const facts=[
      fact({id:"1",subject:"scope:user=u1",predicate:"brain.preference.general",object:"concise answers"}),
      fact({id:"2",subject:"scope:user=u2",predicate:"brain.preference.general",object:"long answers"}),
      fact({id:"3",subject:"scope:workspace",predicate:"brain.constraint.default",object:"Use Neon Data API"})
    ];
    const context=compileBrainContext(facts,{userId:"u1"},"How should you answer?",10);
    expect(context.workingMemory).toContain("concise answers");
    expect(context.workingMemory).toContain("Use Neon Data API");
    expect(context.workingMemory).not.toContain("long answers");
    expect(context.pipe.scanned).toBe(3);
    expect(context.pipe.scopeMatched).toBe(2);
    expect(context.pipe.returned).toBe(2);
  });

  it("collapses superseded values before they enter working memory",()=>{
    const facts=[
      fact({id:"1",predicate:"brain.goal.current",object:"old goal",updatedAt:"2026-09-01T00:00:00.000Z"}),
      fact({id:"2",predicate:"brain.goal.current",object:"new goal",updatedAt:"2026-10-01T00:00:00.000Z"})
    ];
    const context=compileBrainContext(facts,{userId:"u1"},"goal",10);
    expect(context.workingMemory).toContain("new goal");
    expect(context.workingMemory).not.toContain("old goal");
    expect(context.pipe.supersededCollapsed).toBe(1);
  });

  it("decays episodes faster than durable decisions",()=>{
    const now=Date.parse("2026-10-01T00:00:00.000Z");
    const thirtyDaysAgo="2026-09-01T00:00:00.000Z";
    expect(memoryDecay("episode",thirtyDaysAgo,now)).toBeCloseTo(0.5,4);
    expect(memoryDecay("decision",thirtyDaysAgo,now)).toBeGreaterThan(0.9);
  });

  it("detects a changed durable value and preserves the prior value as an episode",()=>{
    const previous=fact({predicate:"brain.decision.current",object:"ship Monday"});
    const candidate={kind:"decision" as const,key:"current",value:"ship Friday",confidence:0.95,salience:0.9};
    const found=findSupersededFact([previous],previous.subject,candidate);
    expect(found?.object).toBe("ship Monday");
    const episode=supersessionEpisode(previous,candidate);
    expect(episode.kind).toBe("episode");
    expect(episode.value).toContain("ship Monday");
    expect(episode.value).toContain("ship Friday");
  });

  it("consolidates repeated episodes into a higher-order fact",()=>{
    const episodes=[
      fact({id:"1",predicate:"brain.episode.a",object:"We tried webhook delivery and timeout occurred",updatedAt:"2026-09-01T00:00:00.000Z"}),
      fact({id:"2",predicate:"brain.episode.b",object:"We attempted webhook delivery and timeout occurred",updatedAt:"2026-09-02T00:00:00.000Z"}),
      fact({id:"3",predicate:"brain.episode.c",object:"We tried webhook delivery and timeout occurred",updatedAt:"2026-09-03T00:00:00.000Z"})
    ];
    const candidates=consolidationCandidates(episodes,{userId:"u1"},3);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toEqual(expect.objectContaining({kind:"fact"}));
    expect(candidates[0].value).toContain("Repeated pattern observed 3 times");
  });
});
