import { z } from "zod";
import { authenticateRequest,hasScope } from "../../../../../lib/auth";
import { evaluatePolicy } from "../../../../../lib/policy";
import { getStore } from "../../../../../lib/runtime-store";

const Action=z.enum(["READ","WRITE","DELETE","DEPLOY","SEND_EMAIL","CHARGE_CARD","MERGE_PR","MODIFY_DATABASE","ROTATE_SECRET"]);
const Rule=z.object({
  agentId:z.string(),
  action:Action,
  resourcePattern:z.string(),
  environment:z.string(),
  effect:z.enum(["allow","deny","approval-required"])
});
const RequestSchema=z.object({
  request:z.object({
    agentId:z.string(),
    action:Action,
    resource:z.string(),
    environment:z.string()
  })
});

export async function POST(request:Request) {
  try {
    const store=getStore();
    const auth=await authenticateRequest(request,store);
    if(!auth) return Response.json({error:"UNAUTHORIZED"},{status:401});
    if(!hasScope(auth,"policy:evaluate")) return Response.json({error:"FORBIDDEN"},{status:403});

    let body:unknown;
    try {
      body=await request.json();
    } catch {
      return Response.json({error:"INVALID_JSON"},{status:400});
    }

    const parsed=RequestSchema.safeParse(body);
    if (!parsed.success) return Response.json({error:"INVALID_REQUEST",issues:parsed.error.issues},{status:422});

    const policyState=await store.getState(auth.workspaceId,"zero.policy.rules");
    const rulesResult=Rule.array().safeParse(policyState?.value ?? []);
    if(!rulesResult.success) return Response.json({error:"POLICY_STATE_INVALID"},{status:500});

    return Response.json({
      authoritative:true,
      decision:evaluatePolicy(rulesResult.data,parsed.data.request)
    });
  } catch(error) {
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}
