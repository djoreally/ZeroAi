import { z } from "zod";
import { ProviderId } from "./provider-registry";

export const ProviderBindingRecordSchema=z.object({
  provider:ProviderId,
  model:z.string().min(1).max(200),
  credentialRef:z.object({
    type:z.literal("env"),
    name:z.string().regex(/^[A-Z][A-Z0-9_]*$/)
  }).optional(),
  baseUrl:z.string().url().optional()
}).superRefine((value,ctx)=>{
  if(value.provider!=="ollama" && !value.credentialRef){
    ctx.addIssue({code:"custom",message:"CREDENTIAL_REFERENCE_REQUIRED"});
  }
  if((value.provider==="openai" || value.provider==="anthropic") && value.baseUrl){
    ctx.addIssue({code:"custom",message:"BASE_URL_NOT_ALLOWED_FOR_PROVIDER"});
  }
});

export type ProviderBindingRecord=z.infer<typeof ProviderBindingRecordSchema>;

export const PROVIDER_BINDING_STATE_KEY="runtime.provider.binding";
