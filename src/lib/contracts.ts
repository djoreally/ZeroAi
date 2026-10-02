import { z } from "zod";

export const EvidenceState = z.enum(["VERIFIED","PARTIAL","UNKNOWN","FAILED","BLOCKED_INFRASTRUCTURE"]);
export const RiskLevel = z.enum(["low","medium","high"]);

export const PermissionSchema = z.object({
  action: z.enum(["READ","WRITE","DELETE","DEPLOY","SEND_EMAIL","CHARGE_CARD","MERGE_PR","MODIFY_DATABASE","ROTATE_SECRET"]),
  resource: z.string().min(1),
  environment: z.string().default("development")
});

export const AcceptanceCriterionSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  requiredEvidenceTypes: z.array(z.string()).default([])
});

export const IntentContractSchema = z.object({
  goal: z.string().min(1),
  constraints: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(AcceptanceCriterionSchema).default([]),
  permissions: z.array(PermissionSchema).default([]),
  resources: z.array(z.object({type:z.string(),id:z.string(),uri:z.string().optional()})).default([]),
  riskLevel: RiskLevel
});

export type IntentContract = z.infer<typeof IntentContractSchema>;

export const TaskNodeSchema = z.object({
  id: z.string().min(1),
  dependencies: z.array(z.string()).default([]),
  owner: z.string().min(1),
  inputs: z.record(z.string(),z.unknown()).default({}),
  expectedOutputs: z.array(z.string()).default([]),
  timeoutMs: z.number().int().positive().default(60000),
  retryPolicy: z.object({
    maxAttempts:z.number().int().min(1).max(10).default(1),
    backoffMs:z.number().int().nonnegative().default(0)
  }),
  permissions: z.array(PermissionSchema).default([]),
  acceptanceGate: z.string().optional()
});

export const AgentDefinitionSchema = z.object({
  id:z.string().min(1),
  version:z.string().min(1),
  responsibilities:z.array(z.string()).min(1),
  allowedTools:z.array(z.string()).default([]),
  forbiddenActions:z.array(z.string()).default([]),
  inputSchemaRef:z.string().min(1),
  outputSchemaRef:z.string().min(1),
  instructionSet:z.string().min(1)
});
