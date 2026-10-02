export type GateState = "PENDING"|"PASS"|"FAIL";
export type Gate = { id:string; requires:string[]; state:GateState };

export function validateGateGraph(all:Gate[]):string[] {
  const issues:string[]=[];
  const byId=new Map<string,Gate>();

  for(const gate of all){
    if(byId.has(gate.id)) issues.push(`Duplicate gate id ${gate.id}`);
    byId.set(gate.id,gate);
    if(gate.requires.includes(gate.id)) issues.push(`Gate ${gate.id} cannot depend on itself`);
  }

  for(const gate of all){
    for(const dependency of gate.requires){
      if(!byId.has(dependency)) issues.push(`Unknown gate dependency ${dependency} for ${gate.id}`);
    }
  }

  const visiting=new Set<string>();
  const visited=new Set<string>();

  function visit(id:string){
    if(visiting.has(id)){
      issues.push("Gate graph contains a cycle");
      return;
    }
    if(visited.has(id)) return;
    const gate=byId.get(id);
    if(!gate) return;
    visiting.add(id);
    gate.requires.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }

  all.forEach(gate=>visit(gate.id));
  return [...new Set(issues)];
}

export function canEnterGate(gate:Gate,all:Gate[]):boolean {
  return gate.requires.every(id=>all.find(item=>item.id===id)?.state==="PASS");
}

export function nextRunnableGates(all:Gate[]):Gate[] {
  const issues=validateGateGraph(all);
  if(issues.length) throw new Error(issues.join("; "));
  return all.filter(gate=>gate.state==="PENDING" && canEnterGate(gate,all));
}
