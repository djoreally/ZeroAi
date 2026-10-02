import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const blocked=process.argv.includes("--hosted-ci-blocked");
const startedAt=new Date().toISOString();

function sha256(value){
  return createHash("sha256").update(value).digest("hex");
}

function git(args){
  return execFileSync("git",args,{cwd:root,encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
}

const gates=[
  {id:"ARCH-CONTRACT",command:["npm",["run","certify:architecture"]]},
  {id:"TYPECHECK",command:["npm",["run","typecheck"]]},
  {id:"TESTS",command:["npm",["test"]]},
  {id:"BUILD",command:["npm",["run","build"]]}
];

const evidence=[];
for(const gate of gates){
  const [bin,args]=gate.command;
  const gateStartedAt=new Date().toISOString();
  const result=spawnSync(bin,args,{cwd:root,encoding:"utf8",env:process.env});
  const stdout=result.stdout ?? "";
  const stderr=result.stderr ?? "";
  const combined=`${stdout}\n${stderr}`;
  evidence.push({
    id:gate.id,
    command:[bin,...args].join(" "),
    state:result.status===0 ? "VERIFIED" : "FAILED",
    exitCode:result.status,
    signal:result.signal ?? null,
    logHash:`sha256:${sha256(combined)}`,
    startedAt:gateStartedAt,
    completedAt:new Date().toISOString()
  });
  if(result.status!==0) break;
}

const headSha=git(["rev-parse","HEAD"]);
const dirty=Boolean(git(["status","--porcelain"]));
const state=evidence.length===gates.length && evidence.every(item=>item.state==="VERIFIED")
  ? "VERIFIED"
  : "FAILED";

const record={
  version:1,
  type:"local-certification",
  repository:{
    root,
    headSha,
    dirty
  },
  hostedCI:blocked ? {
    state:"BLOCKED_INFRASTRUCTURE",
    reason:"Hosted GitHub Actions unavailable due to billing/account infrastructure."
  } : {
    state:"UNKNOWN"
  },
  state,
  startedAt,
  completedAt:new Date().toISOString(),
  evidence
};

const outDir=path.join(root,".zeroai","evidence");
fs.mkdirSync(outDir,{recursive:true});
const outPath=path.join(outDir,`local-${headSha.slice(0,12)}.json`);
fs.writeFileSync(outPath,JSON.stringify(record,null,2)+"\n");
console.log(JSON.stringify({...record,evidenceFile:path.relative(root,outPath)},null,2));
process.exit(state==="VERIFIED" ? 0 : 1);
