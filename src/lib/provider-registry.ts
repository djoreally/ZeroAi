import { z } from "zod";

export const ProviderId=z.enum(["openai","anthropic","ollama","custom"]);
export type ProviderId=z.infer<typeof ProviderId>;

export type ProviderDescriptor={
  id:ProviderId;
  displayName:string;
  requiresCredential:boolean;
  supportsCustomBaseUrl:boolean;
  executionAuthority:"none";
};

export const PROVIDERS:Record<ProviderId,ProviderDescriptor>={
  openai:{
    id:"openai",
    displayName:"OpenAI",
    requiresCredential:true,
    supportsCustomBaseUrl:false,
    executionAuthority:"none"
  },
  anthropic:{
    id:"anthropic",
    displayName:"Anthropic",
    requiresCredential:true,
    supportsCustomBaseUrl:false,
    executionAuthority:"none"
  },
  ollama:{
    id:"ollama",
    displayName:"Ollama",
    requiresCredential:false,
    supportsCustomBaseUrl:true,
    executionAuthority:"none"
  },
  custom:{
    id:"custom",
    displayName:"Custom OpenAI-compatible endpoint",
    requiresCredential:true,
    supportsCustomBaseUrl:true,
    executionAuthority:"none"
  }
};

export function getProvider(id:string):ProviderDescriptor|null {
  const parsed=ProviderId.safeParse(id);
  return parsed.success ? PROVIDERS[parsed.data] : null;
}
