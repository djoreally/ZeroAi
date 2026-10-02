import { afterEach, describe, expect, it } from "vitest";
import { decryptProviderSecret, encryptProviderSecret } from "./provider-secret";

const original=process.env.ZEROAI_PROVIDER_SECRET_KEY;

afterEach(()=>{
  if(original===undefined) delete process.env.ZEROAI_PROVIDER_SECRET_KEY;
  else process.env.ZEROAI_PROVIDER_SECRET_KEY=original;
});

describe("provider secret encryption",()=>{
  it("round-trips a provider secret without persisting plaintext",()=>{
    process.env.ZEROAI_PROVIDER_SECRET_KEY=Buffer.alloc(32,7).toString("base64");
    const encrypted=encryptProviderSecret("sk-example-secret");
    expect(JSON.stringify(encrypted)).not.toContain("sk-example-secret");
    expect(decryptProviderSecret(encrypted)).toBe("sk-example-secret");
  });

  it("fails closed without a valid encryption key",()=>{
    delete process.env.ZEROAI_PROVIDER_SECRET_KEY;
    expect(()=>encryptProviderSecret("secret-value")).toThrow("ZEROAI_PROVIDER_SECRET_KEY_NOT_CONFIGURED");

    process.env.ZEROAI_PROVIDER_SECRET_KEY=Buffer.alloc(16,1).toString("base64");
    expect(()=>encryptProviderSecret("secret-value")).toThrow("ZEROAI_PROVIDER_SECRET_KEY_INVALID");
  });
});
