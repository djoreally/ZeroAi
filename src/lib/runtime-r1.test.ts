import { describe, expect, it } from "vitest";
import { InterceptRequestSchema, compileIntercept } from "./runtime-r1";

describe("R1 ZeroIntercept",()=>{
  const request={
    workspaceId:"ws_123",
    prompt:"fix this bug",
    repo:{
      root:"/repo",
      headSha:"abcdef1234567",
      branch:"main",
      dirty:false,
      changedFiles:[]
    }
  };

  const provider={
    provider:"openai" as const,
    model:"gpt-test",
    credentialRef:{type:"env" as const,name:"OPENAI_API_KEY"}
  };

  it("intercepts mutation intent without granting execution",()=>{
    const parsed=InterceptRequestSchema.parse(request);
    const envelope=compileIntercept(parsed,provider);
    expect(envelope.intent.mode).toBe("MUTATE");
    expect(envelope.authority.executionAllowed).toBe(false);
    expect(envelope.authority.directToolExecutionAllowed).toBe(false);
    expect(envelope.authority.proposedActionsOnly).toBe(true);
  });

  it("uses the server-selected provider binding and exposes no secret value",()=>{
    const parsed=InterceptRequestSchema.parse({...request,prompt:"inspect the repository"});
    const envelope=compileIntercept(parsed,provider);
    const serialized=JSON.stringify(envelope);
    expect(serialized).not.toContain("sk-");
    expect(envelope.providerRequest.provider).toBe("openai");
    expect(envelope.providerRequest.credentialRef).toEqual({type:"env",name:"OPENAI_API_KEY"});
    expect(envelope.authorizedContext.disclosure.excludes).toContain("environment_values");
    expect(envelope.authorizedContext.disclosure.excludes).toContain("provider_secret_values");
  });

  it("does not accept a provider override from the CLI request",()=>{
    const parsed=InterceptRequestSchema.safeParse({
      ...request,
      provider:{provider:"anthropic",model:"override",credentialRef:{type:"env",name:"ANTHROPIC_API_KEY"}}
    });
    expect(parsed.success).toBe(true);
    if(parsed.success){
      expect("provider" in parsed.data).toBe(false);
    }
  });
});
