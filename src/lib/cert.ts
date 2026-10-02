export type Evidence = {
  id:string;
  type:string;
  state:"VERIFIED"|"PARTIAL"|"UNKNOWN"|"FAILED";
  artifactHash?:string;
};

export type CertificationRequirement = {
  id:string;
  requiredEvidenceTypes:string[];
};

export function certify(requirement:CertificationRequirement,evidence:Evidence[]) {
  const relevant=evidence.filter(item=>requirement.requiredEvidenceTypes.includes(item.type));
  if (relevant.some(item=>item.state==="FAILED")) return {requirementId:requirement.id,state:"FAILED" as const,evidence:relevant};
  const satisfied=requirement.requiredEvidenceTypes.every(type=>relevant.some(item=>item.type===type && item.state==="VERIFIED"));
  return {
    requirementId:requirement.id,
    state:(satisfied ? "VERIFIED" : relevant.length ? "PARTIAL" : "UNKNOWN") as "VERIFIED"|"PARTIAL"|"UNKNOWN",
    evidence:relevant
  };
}
