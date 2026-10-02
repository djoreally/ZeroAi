export type MemoryFact = {
  id:string;
  subject:string;
  predicate:string;
  object:string;
  confidence:number;
  salience:number;
  updatedAt:string;
};

export function compactMemory(facts:MemoryFact[],maxFacts:number):MemoryFact[] {
  const deduped = new Map<string,MemoryFact>();
  for (const fact of facts) {
    const key=`${fact.subject}\u0000${fact.predicate}`;
    const current=deduped.get(key);
    if (!current || fact.confidence>current.confidence || new Date(fact.updatedAt)>new Date(current.updatedAt)) {
      deduped.set(key,fact);
    }
  }
  return [...deduped.values()]
    .sort((a,b)=>(b.salience*b.confidence)-(a.salience*a.confidence))
    .slice(0,maxFacts);
}
