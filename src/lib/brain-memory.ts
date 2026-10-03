import { createHash } from "node:crypto";
import type { MemoryFactRecord } from "./domain";

export type BrainScope = {
  userId:string;
  agentId?:string;
  sessionId?:string;
  projectId?:string;
};

export type BrainMemoryKind = "fact"|"preference"|"decision"|"goal"|"constraint"|"episode";

export type BrainMemoryCandidate = {
  kind:BrainMemoryKind;
  key:string;
  value:string;
  confidence:number;
  salience:number;
};

export type BrainContextMemory = BrainMemoryCandidate & {
  id:string;
  score:number;
  decay:number;
  updatedAt:string;
};

export type ZeroPipeDiagnostics = {
  scanned:number;
  active:number;
  scopeMatched:number;
  supersededCollapsed:number;
  ranked:number;
  returned:number;
};

function enc(value:string){ return encodeURIComponent(value.trim()); }
function dec(value:string){ try{return decodeURIComponent(value);}catch{return value;} }

export function scopeSubject(scope:BrainScope):string {
  const parts=[`user=${enc(scope.userId)}`];
  if(scope.agentId) parts.push(`agent=${enc(scope.agentId)}`);
  if(scope.projectId) parts.push(`project=${enc(scope.projectId)}`);
  if(scope.sessionId) parts.push(`session=${enc(scope.sessionId)}`);
  return `scope:${parts.join(";")}`;
}

function parseScopeSubject(subject:string):Record<string,string>|null {
  if(!subject.startsWith("scope:")) return null;
  const values:Record<string,string>={};
  for(const part of subject.slice(6).split(";")){
    const [key,...rest]=part.split("=");
    if(key && rest.length) values[key]=dec(rest.join("="));
  }
  return values;
}

export function scopeMatches(subject:string,scope:BrainScope):boolean {
  if(subject==="scope:workspace" || !subject.startsWith("scope:")) return true;
  const parsed=parseScopeSubject(subject);
  if(!parsed) return false;
  if(parsed.user && parsed.user!==scope.userId) return false;
  if(parsed.agent && parsed.agent!==scope.agentId) return false;
  if(parsed.project && parsed.project!==scope.projectId) return false;
  if(parsed.session && parsed.session!==scope.sessionId) return false;
  return true;
}

function cleanKey(value:string){
  return value.toLowerCase().trim().replace(/[^a-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80) || "memory";
}

export function fingerprint(value:string){
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0,12);
}

export function memoryPredicate(kind:BrainMemoryKind,key:string){
  return `brain.${kind}.${cleanKey(key)}`;
}

export function stableMemoryId(workspaceId:string,subject:string,predicate:string){
  const hex=createHash("sha256").update(`${workspaceId}\u0000${subject}\u0000${predicate}`).digest("hex").slice(0,32);
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`;
}

function tokenize(value:string){
  return new Set(value.toLowerCase().match(/[a-z0-9]{2,}/g) ?? []);
}

function overlapScore(query:Set<string>,fact:Set<string>){
  if(query.size===0) return 0;
  let matches=0;
  for(const token of query) if(fact.has(token)) matches++;
  return matches/query.size;
}

function kindHalfLifeDays(kind:BrainMemoryKind){
  switch(kind){
    case "episode": return 30;
    case "goal": return 180;
    case "preference": return 365;
    case "fact": return 365;
    case "decision": return 730;
    case "constraint": return 730;
  }
}

export function memoryDecay(kind:BrainMemoryKind,updatedAt:string,nowMs=Date.now()){
  const ageDays=Math.max(0,(nowMs-new Date(updatedAt).getTime())/86_400_000);
  return Math.pow(0.5,ageDays/kindHalfLifeDays(kind));
}

function factToMemory(fact:MemoryFactRecord,input:string):BrainContextMemory|null {
  const match=/^brain\.(fact|preference|decision|goal|constraint|episode)\.(.+)$/.exec(fact.predicate);
  if(!match) return null;
  const kind=match[1] as BrainMemoryKind;
  const query=tokenize(input);
  const content=tokenize(`${kind} ${match[2]} ${fact.object}`);
  const relevance=overlapScore(query,content);
  const decay=memoryDecay(kind,fact.updatedAt);
  const score=(0.45*relevance)+(0.20*fact.salience)+(0.15*fact.confidence)+(0.20*decay);
  return {
    id:fact.id,
    kind,
    key:match[2],
    value:fact.object,
    confidence:fact.confidence,
    salience:fact.salience,
    score:Number(score.toFixed(6)),
    decay:Number(decay.toFixed(6)),
    updatedAt:fact.updatedAt
  };
}

export function zeroPipeContext(facts:MemoryFactRecord[],scope:BrainScope,input:string,maxFacts=24){
  const active=facts.filter(fact=>!fact.invalidatedAt);
  const scoped=active.filter(fact=>scopeMatches(fact.subject,scope));
  const latest=new Map<string,MemoryFactRecord>();
  for(const fact of scoped){
    const key=`${fact.subject}\u0000${fact.predicate}`;
    const current=latest.get(key);
    if(!current || new Date(fact.updatedAt)>new Date(current.updatedAt)) latest.set(key,fact);
  }

  const ranked=[...latest.values()]
    .map(fact=>factToMemory(fact,input))
    .filter((value):value is BrainContextMemory=>Boolean(value))
    .sort((a,b)=>b.score-a.score);

  const memories=ranked.slice(0,Math.max(1,Math.min(maxFacts,64)));
  const diagnostics:ZeroPipeDiagnostics={
    scanned:facts.length,
    active:active.length,
    scopeMatched:scoped.length,
    supersededCollapsed:Math.max(0,scoped.length-latest.size),
    ranked:ranked.length,
    returned:memories.length
  };
  return {memories,diagnostics};
}

export function compileBrainContext(facts:MemoryFactRecord[],scope:BrainScope,input:string,maxFacts=24){
  const {memories,diagnostics}=zeroPipeContext(facts,scope,input,maxFacts);
  const workingMemory=memories.map(memory=>`[${memory.kind}:${memory.key}] ${memory.value}`).join("\n");
  return {memories,workingMemory,count:memories.length,pipe:diagnostics};
}

export function inferMemories(input:string):BrainMemoryCandidate[] {
  const text=input.trim();
  if(text.length<4 || text.length>4000) return [];
  const candidates:BrainMemoryCandidate[]=[];

  const preference=/\b(?:i prefer|i like|my preference is)\s+(.+)/i.exec(text);
  if(preference) candidates.push({kind:"preference",key:"general",value:preference[1].trim(),confidence:0.88,salience:0.82});

  const decision=/\b(?:we decided|we agreed|the decision is|we are going with)\s+(.+)/i.exec(text);
  if(decision) candidates.push({kind:"decision",key:"current",value:decision[1].trim(),confidence:0.92,salience:0.90});

  const goal=/\b(?:my goal is|our goal is|the goal is|i want to|we want to)\s+(.+)/i.exec(text);
  if(goal) candidates.push({kind:"goal",key:"current",value:goal[1].trim(),confidence:0.84,salience:0.84});

  const constraint=/\b(?:from now on|always|never|do not|don't)\s+(.+)/i.exec(text);
  if(constraint) candidates.push({kind:"constraint",key:"default",value:constraint[0].trim(),confidence:0.86,salience:0.88});

  const remember=/\bremember(?: that)?\s+(.+)/i.exec(text);
  if(remember) candidates.push({kind:"fact",key:`remembered-${fingerprint(remember[1])}`,value:remember[1].trim(),confidence:0.95,salience:0.92});

  const episode=/\b(?:we tried|i tried|we attempted|i attempted|it failed because|failed because|we fixed it by|i fixed it by|resolved by)\s+(.+)/i.exec(text);
  if(episode) candidates.push({kind:"episode",key:`experience-${fingerprint(text)}`,value:text,confidence:0.82,salience:0.72});

  const unique=new Map<string,BrainMemoryCandidate>();
  for(const candidate of candidates) unique.set(`${candidate.kind}:${candidate.key}`,candidate);
  return [...unique.values()];
}

export function findSupersededFact(facts:MemoryFactRecord[],subject:string,candidate:BrainMemoryCandidate){
  const predicate=memoryPredicate(candidate.kind,candidate.key);
  return facts
    .filter(fact=>!fact.invalidatedAt && fact.subject===subject && fact.predicate===predicate && fact.object!==candidate.value)
    .sort((a,b)=>new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime())[0] ?? null;
}

export function supersessionEpisode(previous:MemoryFactRecord,candidate:BrainMemoryCandidate):BrainMemoryCandidate{
  const value=`Previously ${candidate.kind}:${candidate.key} = ${previous.object}. Superseded by ${candidate.value}.`;
  const transition=fingerprint(`${previous.object}\u0000${candidate.value}\u0000${previous.updatedAt}`);
  return {
    kind:"episode",
    key:`superseded-${candidate.kind}-${cleanKey(candidate.key)}-${transition}`,
    value,
    confidence:Math.min(previous.confidence,candidate.confidence),
    salience:Math.max(0.65,Math.min(0.95,candidate.salience))
  };
}

function episodeSignature(value:string){
  const stop=new Set(["the","and","that","this","with","from","were","was","have","has","had","because","tried","attempted","fixed","resolved","into","then"]);
  return [...tokenize(value)].filter(token=>!stop.has(token)).sort().slice(0,8).join("|");
}

export function consolidationCandidates(facts:MemoryFactRecord[],scope:BrainScope,minOccurrences=3):BrainMemoryCandidate[]{
  const groups=new Map<string,MemoryFactRecord[]>();
  for(const fact of facts){
    if(fact.invalidatedAt || !scopeMatches(fact.subject,scope) || !fact.predicate.startsWith("brain.episode.")) continue;
    const signature=episodeSignature(fact.object);
    if(!signature) continue;
    const group=groups.get(signature) ?? [];
    group.push(fact);
    groups.set(signature,group);
  }

  const candidates:BrainMemoryCandidate[]=[];
  for(const [signature,group] of groups){
    if(group.length<minOccurrences) continue;
    const latest=[...group].sort((a,b)=>new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime())[0];
    const avgConfidence=group.reduce((sum,item)=>sum+item.confidence,0)/group.length;
    const avgSalience=group.reduce((sum,item)=>sum+item.salience,0)/group.length;
    candidates.push({
      kind:"fact",
      key:`consolidated-${fingerprint(signature)}`,
      value:`Repeated pattern observed ${group.length} times. Latest episode: ${latest.object}`,
      confidence:Math.min(0.98,avgConfidence+(Math.min(group.length,8)*0.02)),
      salience:Math.min(0.95,Math.max(avgSalience,0.75))
    });
  }
  return candidates;
}
