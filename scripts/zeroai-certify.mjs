import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const failures=[];
const required=[
  "zeroai.constitution.yaml",
  "architecture.registry.json",
  "requirements/core.json",
  "decisions/ledger.json",
  "contracts/change-contract.schema.json",
  "contracts/runtime-plan.json",
  "contracts/active/R1-zeroai-runtime-interception.json",
  "policies/prohibited-runtime.json",
  "agent-registry/agents.json",
  "certification/manifest.json"
];

for(const file of required){
  if(!fs.existsSync(path.join(root,file))) failures.push(`MISSING: ${file}`);
}

function readJson(file){
  try{return JSON.parse(fs.readFileSync(path.join(root,file),"utf8"));}
  catch(error){failures.push(`INVALID JSON: ${file}: ${error.message}`);return null;}
}

const architecture=readJson("architecture.registry.json");
const requirements=readJson("requirements/core.json");
const decisions=readJson("decisions/ledger.json");
const runtimePlan=readJson("contracts/runtime-plan.json");
const r1Contract=readJson("contracts/active/R1-zeroai-runtime-interception.json");
const policy=readJson("policies/prohibited-runtime.json");
readJson("contracts/change-contract.schema.json");
readJson("agent-registry/agents.json");
readJson("certification/manifest.json");

const requirementIds=new Set(requirements?.requirements?.map(r=>r.id) ?? []);
for(const decision of decisions?.decisions ?? []){
  for(const id of decision.requirements ?? []) if(!requirementIds.has(id)) failures.push(`UNKNOWN REQUIREMENT: ${decision.id} -> ${id}`);
}

const expectedMilestones=["R1","R2","R3","R4"];
const actualMilestones=(runtimePlan?.milestones ?? []).map(m=>m.id);
if(JSON.stringify(actualMilestones)!==JSON.stringify(expectedMilestones)){
  failures.push(`RUNTIME PLAN ORDER DRIFT: expected ${expectedMilestones.join(" -> ")} got ${actualMilestones.join(" -> ")}`);
}
for(const milestone of runtimePlan?.milestones ?? []){
  for(const id of milestone.requirements ?? []){
    if(!requirementIds.has(id)) failures.push(`UNKNOWN RUNTIME REQUIREMENT: ${milestone.id} -> ${id}`);
  }
}
for(const id of r1Contract?.requirementIds ?? []){
  if(!requirementIds.has(id)) failures.push(`UNKNOWN R1 REQUIREMENT: ${id}`);
}
if(runtimePlan?.entrypoint!=="zeroai") failures.push("CLI-001: runtime entrypoint must remain zeroai");
if(runtimePlan?.acceptanceCommand!=="zeroai > fix this bug") failures.push("RUNTIME-001: canonical acceptance command drifted");

if(architecture?.providers?.database?.access!=="Data API only") failures.push("DB-001: architecture registry must require Data API only");
if(architecture?.providers?.telephony?.provider!=="AgentPhone" || architecture?.providers?.telephony?.exclusive!==true) failures.push("TEL-001: AgentPhone must be exclusive");
if(architecture?.providers?.deployment?.trigger!=="GitHub merge to main only") failures.push("REL-001: deployment trigger drifted");

const pkg=readJson("package.json");
const deps={...(pkg?.dependencies ?? {}),...(pkg?.devDependencies ?? {})};
for(const item of policy?.forbiddenDependencies ?? []){
  if(Object.prototype.hasOwnProperty.call(deps,item.name)) failures.push(`${item.requirementId}: forbidden dependency ${item.name}`);
}

function walk(dir){
  if(!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) return walk(full);
    return /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)?[full]:[];
  });
}

for(const rootName of policy?.sourceRoots ?? []){
  for(const file of walk(path.join(root,rootName))){
    const body=fs.readFileSync(file,"utf8").toLowerCase();
    for(const rule of policy?.forbiddenSourceTokens ?? []){
      if(body.includes(String(rule.token).toLowerCase())) failures.push(`${rule.requirementId}: forbidden runtime token "${rule.token}" in ${path.relative(root,file)}`);
    }
  }
}

if(failures.length){
  console.error("ZEROAI ARCHITECTURE CERTIFICATION: FAILED");
  for(const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("ZEROAI ARCHITECTURE CERTIFICATION: VERIFIED");
console.log(`requirements=${requirementIds.size} decisions=${decisions?.decisions?.length ?? 0} runtime=${actualMilestones.join("->")}`);
