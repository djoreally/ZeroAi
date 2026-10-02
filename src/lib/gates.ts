export type GateState = "PENDING"|"PASS"|"FAIL";
export type Gate = { id:string; requires:string[]; state:GateState };

export function canEnterGate(gate:Gate,all:Gate[]):boolean {
  return gate.requires.every(id=>all.find(item=>item.id===id)?.state==="PASS");
}

export function nextRunnableGates(all:Gate[]):Gate[] {
  return all.filter(gate=>gate.state==="PENDING" && canEnterGate(gate,all));
}
