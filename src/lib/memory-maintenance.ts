import type { MemoryFactRecord } from "./domain";
import { consolidationCandidates,memoryDecay,scopeMatches,type BrainMemoryCandidate,type BrainScope } from "./brain-memory";

export type MemoryMaintenanceOptions={
  minOccurrences?:number;
  decayThreshold?:number;
  nowMs?:number;
};

export type MemoryMaintenancePlan={
  consolidations:BrainMemoryCandidate[];
  invalidations:MemoryFactRecord[];
  nextRunAfterSeconds:number;
  stats:{
    scoped:number;
    episodes:number;
    consolidations:number;
    invalidations:number;
  };
};

function isEpisode(fact:MemoryFactRecord){
  return fact.predicate.startsWith("brain.episode.");
}

function isProtectedEpisode(fact:MemoryFactRecord){
  return fact.predicate.startsWith("brain.episode.superseded-");
}

export function planMemoryMaintenance(
  facts:MemoryFactRecord[],
  scope:BrainScope,
  options:MemoryMaintenanceOptions={}
):MemoryMaintenancePlan{
  const nowMs=options.nowMs ?? Date.now();
  const minOccurrences=options.minOccurrences ?? 3;
  const decayThreshold=options.decayThreshold ?? 0.08;
  const scoped=facts.filter(fact=>!fact.invalidatedAt && scopeMatches(fact.subject,scope));
  const episodes=scoped.filter(isEpisode);
  const consolidations=consolidationCandidates(scoped,scope,minOccurrences);
  const invalidations=episodes.filter(fact=>{
    if(isProtectedEpisode(fact)) return false;
    if(fact.salience>=0.85) return false;
    return memoryDecay("episode",fact.updatedAt,nowMs)<decayThreshold;
  });

  const changed=consolidations.length+invalidations.length;
  const newest=scoped.reduce((latest,fact)=>Math.max(latest,new Date(fact.updatedAt).getTime()),0);
  const hoursSinceActivity=newest ? Math.max(0,(nowMs-newest)/3_600_000) : Number.POSITIVE_INFINITY;
  const nextRunAfterSeconds=changed>0 ? 21_600 : hoursSinceActivity<24 ? 43_200 : 86_400;

  return {
    consolidations,
    invalidations,
    nextRunAfterSeconds,
    stats:{
      scoped:scoped.length,
      episodes:episodes.length,
      consolidations:consolidations.length,
      invalidations:invalidations.length
    }
  };
}
