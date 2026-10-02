import { describe, expect, it } from "vitest";
import { ProviderBindingRecordSchema } from "./provider-binding";

describe("R1 provider binding",()=>{
  it("accepts an OpenAI binding using only a credential reference",()=>{
    const result=ProviderBindingRecordSchema.safeParse({
      provider:"openai",
      model:"gpt-test",
      credentialRef:{type:"env",name:"OPENAI_API_KEY"}
    });
    expect(result.success).toBe(true);
  });

  it("rejects hosted providers without a credential reference",()=>{
    const result=ProviderBindingRecordSchema.safeParse({
      provider:"anthropic",
      model:"claude-test"
    });
    expect(result.success).toBe(false);
  });

  it("does not define any field for a raw API secret",()=>{
    const result=ProviderBindingRecordSchema.parse({
      provider:"openai",
      model:"gpt-test",
      credentialRef:{type:"env",name:"OPENAI_API_KEY"},
      apiKey:"sk-secret"
    });
    expect("apiKey" in result).toBe(false);
  });

  it("rejects custom base URLs for first-party hosted providers",()=>{
    const result=ProviderBindingRecordSchema.safeParse({
      provider:"openai",
      model:"gpt-test",
      credentialRef:{type:"env",name:"OPENAI_API_KEY"},
      baseUrl:"https://example.com"
    });
    expect(result.success).toBe(false);
  });

  it("allows Ollama without a credential",()=>{
    const result=ProviderBindingRecordSchema.safeParse({
      provider:"ollama",
      model:"qwen-local",
      baseUrl:"http://127.0.0.1:11434"
    });
    expect(result.success).toBe(true);
  });
});
