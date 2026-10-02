import { describe, expect, it } from "vitest";
import { InterceptRequestSchema, compileIntercept } from "./runtime-r1";

describe("R1 ZeroIntercept",()=>{
  const base={
    workspaceId:"ws_123",
    provider:{
      provider:"openai" as const,
      model:"gpt-test",
      credentialRef:{type:"env" as const,name:"OPENAI_API_KEY"}
    },
    repo:{
      root:"/repo",
      headSha:"abcdef1234567",
      branch:"main",
      dirty:false,
      changedFiles:[]
    }
  };

  it("intercepts mutation intent without granting execution",()=>{
    const parsed=InterceptRequestSchema.parse({...base,prompt:"fix this bug"});
    const envelope=compileIntercept(parsed);
    expect(envelope.intent.mode).toBe("MUTATE");
    expect(envelope.authority.executionAllowed).toBe(false);
    expect(envelope.authority.directToolExecutionAllowed).toBe(false);
    expect(envelope.authority.proposedActionsOnly).toBe(true);
  });

  it("does not disclose secret values in provider envelope",()=>{
    const parsed=InterceptRequestSchema.parse({...base,prompt:"inspect the repository"});
    const envelope=compileIntercept(parsed);
    const serialized=JSON.stringify(envelope);
    expect(serialized).not.toContain("sk-");
    expect(envelope.providerRequest.credentialRef).toEqual({type:"env",name:"OPENAI_API_KEY"});
    expect(envelope.authorizedContext.disclosure.excludes).toContain("environment_values");
    expect(envelope.authorizedContext.disclosure.excludes).toContain("provider_secret_values");
  });

  it("requires a credential reference for hosted providers",()=>{
    const result=InterceptRequestSchema.safeParse({
      ...base,
      prompt:"read this",
      provider:{provider:"anthropic",model:"claude-test"}
    });
    expect(result.success).toBe(false);
  });

  it("allows local Ollama without a credential reference",()=>{
    const result=InterceptRequestSchema.safeParse({
      ...base,
      prompt:"read this",
      provider:{provider:"ollama",model:"qwen-local",baseUrl:"http://127.0.0.1:11434"}
    });
    expect(result.success).toBe(true);
  });
});
