import { z } from "zod";
import type { ProviderBindingRecord } from "./provider-binding";

export const RepoContextSchema=z.object({
  root:z.string().min(1),
  headSha:z.string().regex(/^[0-9a-f]{7,64}$/i),
  branch:z.string().min(1),
  dirty:z.boolean(),
  changedFiles:z.array(z.string().min(1)).max(500).default([])
});

export const InterceptRequestSchema=z.object({
  workspaceId:z.string().min(1),
  prompt:z.string().trim().min(1).max(20000),
  repo:RepoContextSchema
});

export type InterceptRequest=z.infer<typeof InterceptRequestSchema>;

export type IntentMode="READ"|"MUTATE"|"EXECUTE";

function classify(prompt:string):IntentMode {
  const value=prompt.toLowerCase();
  if(/\b(run|test|build|execute|deploy|install|start|launch)\b/.test(value)) return "EXECUTE";
  if(/\b(fix|change|update|edit|write|add|remove|delete|refactor|implement|create)\b/.test(value)) return "MUTATE";
  return "READ";
}

export function compileIntercept(input:InterceptRequest,provider:ProviderBindingRecord){
  const mode=classify(input.prompt);
  const requestedCapabilities=
    mode==="READ" ? ["repo.read","repo.search"] :
    mode==="MUTATE" ? ["repo.read","repo.search","file.patch"] :
    ["repo.read","repo.search","process.request"];

  return {
    version:1,
    workspaceId:input.workspaceId,
    rawPrompt:input.prompt,
    intent:{
      mode,
      goal:input.prompt,
      requestedCapabilities
    },
    authorizedContext:{
      repository:{
        root:input.repo.root,
        headSha:input.repo.headSha,
        branch:input.repo.branch,
        dirty:input.repo.dirty,
        changedFiles:input.repo.changedFiles
      },
      disclosure:{
        includes:["repository_identity","git_head","branch","working_tree_status"],
        excludes:["environment_values","provider_secret_values","unrequested_memory","unrequested_files"]
      }
    },
    providerRequest:{
      provider:provider.provider,
      model:provider.model,
      baseUrl:provider.baseUrl ?? null,
      credentialRef:provider.credentialRef ?? null,
      prompt:input.prompt,
      context:{
        repository:{
          headSha:input.repo.headSha,
          branch:input.repo.branch,
          dirty:input.repo.dirty,
          changedFiles:input.repo.changedFiles
        }
      }
    },
    authority:{
      phase:"R1",
      executionAllowed:false,
      directToolExecutionAllowed:false,
      proposedActionsOnly:true
    }
  };
}
