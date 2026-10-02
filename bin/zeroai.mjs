#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { execFileSync } from "node:child_process";

const configDir=path.join(os.homedir(),".zeroai");
const configPath=path.join(configDir,"config.json");

function readConfig(){
  try{return JSON.parse(fs.readFileSync(configPath,"utf8"));}
  catch{return {};}
}

function writeConfig(value){
  fs.mkdirSync(configDir,{recursive:true,mode:0o700});
  fs.writeFileSync(configPath,JSON.stringify(value,null,2)+"\n",{mode:0o600});
}

function requiredConfig(config){
  if(!config.workspaceId) throw new Error("ZEROAI_WORKSPACE_NOT_BOUND: run zeroai bind <workspace-id>");
  if(!config.apiUrl) throw new Error("ZEROAI_API_URL_NOT_CONFIGURED: run zeroai bind <workspace-id> --api-url <url>");
  if(!config.provider?.provider || !config.provider?.model) throw new Error("ZEROAI_PROVIDER_NOT_CONFIGURED: run zeroai provider <provider> <model> [credential-env]");
  return config;
}

function token(){
  const value=process.env.ZEROAI_API_KEY;
  if(!value) throw new Error("ZEROAI_API_KEY_NOT_SET");
  return value;
}

function git(args){
  return execFileSync("git",args,{cwd:process.cwd(),encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
}

function repoContext(){
  try{
    const root=git(["rev-parse","--show-toplevel"]);
    const headSha=git(["rev-parse","HEAD"]);
    const branch=git(["branch","--show-current"]) || "DETACHED";
    const status=git(["status","--porcelain"]);
    const changedFiles=status ? status.split("\n").map(line=>line.slice(3).trim()).filter(Boolean) : [];
    return {root,headSha,branch,dirty:changedFiles.length>0,changedFiles};
  }catch{
    throw new Error("ZEROAI_REPOSITORY_REQUIRED: run zeroai inside a Git repository");
  }
}

async function request(config,url,options={}){
  const response=await fetch(new URL(url,config.apiUrl),{
    ...options,
    headers:{
      "content-type":"application/json",
      "authorization":`Bearer ${token()}`,
      ...(options.headers ?? {})
    }
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(body.error ?? `ZEROAI_HTTP_${response.status}`);
  return body;
}

async function login(){
  const config=requiredConfig(readConfig());
  const body=await request(config,"/api/v1/runtime/session",{
    method:"GET",
    headers:{"x-zeroai-workspace":config.workspaceId}
  });
  writeConfig({...config,authenticatedWorkspace:body.workspace?.id ?? config.workspaceId,authenticatedAt:new Date().toISOString()});
  console.log(`ZeroAI authenticated: ${body.workspace?.name ?? config.workspaceId}`);
}

function bind(args){
  const workspaceId=args[0];
  if(!workspaceId) throw new Error("Usage: zeroai bind <workspace-id> --api-url <url>");
  const urlIndex=args.indexOf("--api-url");
  const apiUrl=urlIndex>=0 ? args[urlIndex+1] : undefined;
  if(!apiUrl) throw new Error("ZEROAI_API_URL_REQUIRED");
  new URL(apiUrl);
  const current=readConfig();
  writeConfig({...current,workspaceId,apiUrl});
  console.log(`ZeroAI workspace bound: ${workspaceId}`);
}

function provider(args){
  const [providerId,model,credentialEnv]=args;
  if(!providerId || !model) throw new Error("Usage: zeroai provider <openai|anthropic|ollama|custom> <model> [credential-env]");
  if(!["openai","anthropic","ollama","custom"].includes(providerId)) throw new Error("ZEROAI_PROVIDER_UNSUPPORTED");
  if(providerId!=="ollama" && !credentialEnv) throw new Error("ZEROAI_CREDENTIAL_ENV_REQUIRED");
  const current=readConfig();
  writeConfig({
    ...current,
    provider:{
      provider:providerId,
      model,
      ...(credentialEnv ? {credentialRef:{type:"env",name:credentialEnv}} : {})
    }
  });
  console.log(`ZeroAI provider configured: ${providerId}/${model}`);
}

async function intercept(prompt){
  const config=requiredConfig(readConfig());
  const repo=repoContext();
  return request(config,"/api/v1/runtime/intercept",{
    method:"POST",
    body:JSON.stringify({
      workspaceId:config.workspaceId,
      prompt,
      provider:config.provider,
      repo
    })
  });
}

async function shell(){
  const config=requiredConfig(readConfig());
  repoContext();
  console.log(`ZeroAI R1 Control Plane | workspace=${config.workspaceId} | provider=${config.provider.provider}/${config.provider.model}`);
  console.log("Execution authority: disabled (R1 interception only)");
  const rl=readline.createInterface({input:process.stdin,output:process.stdout,prompt:"zeroai> "});
  rl.prompt();
  rl.on("line",async line=>{
    const value=line.trim();
    if(!value){rl.prompt();return;}
    if(["exit","quit","/exit"].includes(value)){rl.close();return;}
    try{
      const result=await intercept(value);
      console.log(JSON.stringify({
        intercepted:result.intercepted,
        providerDispatched:result.providerDispatched,
        intent:result.envelope?.intent,
        authority:result.envelope?.authority,
        provider:result.envelope?.providerRequest ? {
          provider:result.envelope.providerRequest.provider,
          model:result.envelope.providerRequest.model
        } : undefined
      },null,2));
    }catch(error){
      console.error(error instanceof Error ? error.message : String(error));
    }
    rl.prompt();
  });
}

async function main(){
  const [command,...args]=process.argv.slice(2);
  if(command==="bind") return bind(args);
  if(command==="provider") return provider(args);
  if(command==="login") return login();
  if(command==="intercept"){
    const prompt=args.join(" ").trim();
    if(!prompt) throw new Error("Usage: zeroai intercept <prompt>");
    console.log(JSON.stringify(await intercept(prompt),null,2));
    return;
  }
  if(command==="--help" || command==="-h" || command==="help"){
    console.log("zeroai [bind|provider|login|intercept]\nRun zeroai with no arguments inside a Git repository to start the interactive R1 shell.");
    return;
  }
  if(command) throw new Error(`UNKNOWN_COMMAND: ${command}`);
  await shell();
}

main().catch(error=>{
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode=1;
});
