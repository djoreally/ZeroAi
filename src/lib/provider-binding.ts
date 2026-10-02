import { z } from "zod";
import { ProviderId } from "./provider-registry";

const EnvCredentialRef=z.object({
  type:z.literal("env"),
  name:z.string().regex(/^[A-Z][A-Z0-9_]*$/)
});

const VaultCredentialRef=z.object({
  type:z.literal("vault"),
  id:z.literal("primary")
});

export const ProviderBindingRecordSchema=z.object({
  provider:ProviderId,
  model:z.string().min(1).max(200),
  credentialRef:z.union([EnvCredentialRef,VaultCredentialRef]).optional(),
  baseUrl:z.string().url().optional()
}).superRefine((value,ctx)=>{
  if(value.provider!=="ollama" && !value.credentialRef){
    ctx.addIssue({code:"custom",message:"CREDENTIAL_REFERENCE_REQUIRED"});
  }
  if((value.provider==="openai" || value.provider==="anthropic") && value.baseUrl){
    ctx.addIssue({code:"custom",message:"BASE_URL_NOT_ALLOWED_FOR_PROVIDER"});
  }
});

export const ConnectProviderRequestSchema=z.object({
  provider:ProviderId,
  model:z.string().min(1).max(200),
  mode:z.enum(["local","cloud"]),
  credentialEnv:z.string().regex(/^[A-Z][A-Z0-9_]*$/).optional(),
  apiKey:z.string().min(8).max(10000).optional(),
  baseUrl:z.string().url().optional()
}).superRefine((value,ctx)=>{
  if(value.provider==="ollama") return;
  if(value.mode==="local" && !value.credentialEnv){
    ctx.addIssue({code:"custom",message:"CREDENTIAL_ENV_REQUIRED"});
  }
  if(value.mode==="cloud" && !value.apiKey){
    ctx.addIssue({code:"custom",message:"API_KEY_REQUIRED"});
  }
});

export type ProviderBindingRecord=z.infer<typeof ProviderBindingRecordSchema>;

export const PROVIDER_BINDING_STATE_KEY="runtime.provider.binding";
export const PROVIDER_SECRET_STATE_KEY="runtime.provider.secret";
