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
  updatedAt:string;
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

function scopeMatches(subject:string,scope:BrainScope):boolean {
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

function fingerprint(value:string){
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

function recencyScore(updatedAt:string){
  const ageDays=Math.max(0,(Date.now()-new Date(updatedAt).getTime())/86_400_000);
  return Math.exp(-ageDays/90);
}

function factToMemory(fact:MemoryFactRecord,input:string):BrainContextMemory|null {
  const match=/^brain\.(fact|preference|decision|goal|constraint|episode)\.(.+)$/.exec(fact.predicate);
  if(!match) return null;
  const query=tokenize(input);
  const content=tokenize(`${match[1]} ${match[2]} ${fact.object}`);
  const relevance=overlapScore(query,content);
  const score=(0.45*relevance)+(0.25*fact.salience)+(0.20*fact.confidence)+(0.10*recencyScore(fact.updatedAt));
  return {
    id:fact.id,
    kind:match[1] as BrainMemoryKind,
    key:match[2],
    value:fact.object,
    confidence:fact.confidence,
    salience:fact.salience,
    score:Number(score.toFixed(6)),
    updatedAt:fact.updatedAt
  };
}

export function compileBrainContext(facts:MemoryFactRecord[],scope:BrainScope,input:string,maxFacts=24){
  const latest=new Map<string,MemoryFactRecord>();
  for(const fact of facts){
    if(fact.invalidatedAt || !scopeMatches(fact.subject,scope)) continue;
    const key=`${fact.subject}\u0000${fact.predicate}`;
    const current=latest.get(key);
    if(!current || new Date(fact.updatedAt)>new Date(current.updatedAt)) latest.set(key,fact);
  }

  const memories=[...latest.values()]
    .map(fact=>factToMemory(fact,input))
    .filter((value):value is BrainContextMemory=>Boolean(value))
    .sort((a,b)=>b.score-a.score)
    .slice(0,Math.max(1,Math.min(maxFacts,64)));

  const workingMemory=memories.map(memory=>`[${memory.kind}:${memory.key}] ${memory.value}`).join("\n");
  return {memories,workingMemory,count:memories.length};
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

  const unique=new Map<string,BrainMemoryCandidate>();
  for(const candidate of candidates) unique.set(`${candidate.kind}:${candidate.key}`,candidate);
  return [...unique.values()];
}
