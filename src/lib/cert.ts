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
  if(requirement.requiredEvidenceTypes.length===0){
    return {requirementId:requirement.id,state:"UNKNOWN" as const,evidence:[]};
  }

  const relevant=evidence.filter(item=>requirement.requiredEvidenceTypes.includes(item.type));
  if (relevant.some(item=>item.state==="FAILED")) {
    return {requirementId:requirement.id,state:"FAILED" as const,evidence:relevant};
  }

  const satisfied=requirement.requiredEvidenceTypes.every(type=>
    relevant.some(item=>item.type===type && item.state==="VERIFIED")
  );
  if(satisfied) return {requirementId:requirement.id,state:"VERIFIED" as const,evidence:relevant};

  const hasSupport=relevant.some(item=>item.state==="VERIFIED" || item.state==="PARTIAL");
  return {
    requirementId:requirement.id,
    state:hasSupport ? "PARTIAL" as const : "UNKNOWN" as const,
    evidence:relevant
  };
}
