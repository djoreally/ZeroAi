import { describe,expect,it } from "vitest";
import { planMemoryMaintenance } from "./memory-maintenance";
import type { MemoryFactRecord } from "./domain";

function fact(overrides:Partial<MemoryFactRecord>):MemoryFactRecord{
  return {
    id:"00000000-0000-0000-0000-000000000001",
    workspaceId:"w1",
    subject:"scope:user=u1",
    predicate:"brain.episode.example",
    object:"We tried webhook delivery and timeout occurred",
    confidence:0.82,
    salience:0.72,
    validFrom:"2026-01-01T00:00:00.000Z",
    createdAt:"2026-01-01T00:00:00.000Z",
    updatedAt:"2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("ZeroMemory autonomic maintenance",()=>{
  it("plans repeated-experience consolidation",()=>{
    const facts=[
      fact({id:"1",predicate:"brain.episode.a",updatedAt:"2026-09-01T00:00:00.000Z"}),
      fact({id:"2",predicate:"brain.episode.b",object:"We attempted webhook delivery and timeout occurred",updatedAt:"2026-09-02T00:00:00.000Z"}),
      fact({id:"3",predicate:"brain.episode.c",updatedAt:"2026-09-03T00:00:00.000Z"})
    ];
    const plan=planMemoryMaintenance(facts,{userId:"u1"},{minOccurrences:3,nowMs:Date.parse("2026-10-01T00:00:00.000Z")});
    expect(plan.consolidations).toHaveLength(1);
    expect(plan.stats.consolidations).toBe(1);
    expect(plan.nextRunAfterSeconds).toBe(21_600);
  });

  it("invalidates only low-salience stale ordinary episodes",()=>{
    const old="2026-01-01T00:00:00.000Z";
    const facts=[
      fact({id:"old",predicate:"brain.episode.old",salience:0.5,updatedAt:old}),
      fact({id:"important",predicate:"brain.episode.important",salience:0.9,updatedAt:old}),
      fact({id:"history",predicate:"brain.episode.superseded-goal-current-abc",salience:0.5,updatedAt:old})
    ];
    const plan=planMemoryMaintenance(facts,{userId:"u1"},{decayThreshold:0.1,nowMs:Date.parse("2026-10-01T00:00:00.000Z")});
    expect(plan.invalidations.map(item=>item.id)).toEqual(["old"]);
  });

  it("does not maintain another user or inherited broader scope",()=>{
    const facts=[
      fact({id:"u1",subject:"scope:user=u1"}),
      fact({id:"u2",subject:"scope:user=u2"}),
      fact({id:"workspace",subject:"scope:workspace"}),
      fact({id:"agent",subject:"scope:user=u1;agent=assistant"})
    ];
    const userPlan=planMemoryMaintenance(facts,{userId:"u1"},{nowMs:Date.parse("2026-10-01T00:00:00.000Z")});
    expect(userPlan.stats.scoped).toBe(1);
    const agentPlan=planMemoryMaintenance(facts,{userId:"u1",agentId:"assistant"},{nowMs:Date.parse("2026-10-01T00:00:00.000Z")});
    expect(agentPlan.stats.scoped).toBe(1);
  });

  it("backs off when there is no maintenance work",()=>{
    const recent=fact({id:"recent",predicate:"brain.fact.note",object:"durable",updatedAt:"2026-10-01T00:00:00.000Z"});
    const plan=planMemoryMaintenance([recent],{userId:"u1"},{nowMs:Date.parse("2026-10-01T06:00:00.000Z")});
    expect(plan.stats.invalidations).toBe(0);
    expect(plan.stats.consolidations).toBe(0);
    expect(plan.nextRunAfterSeconds).toBe(43_200);
  });
});
