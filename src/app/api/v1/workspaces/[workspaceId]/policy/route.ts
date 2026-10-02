import { z } from "zod";
import { hashObject } from "../../../../../../lib/hash";
import { getStore } from "../../../../../../lib/runtime-store";

const Action=z.enum(["READ","WRITE","DELETE","DEPLOY","SEND_EMAIL","CHARGE_CARD","MERGE_PR","MODIFY_DATABASE","ROTATE_SECRET"]);
const Rule=z.object({
  agentId:z.string().min(1),
  action:Action,
  resourcePattern:z.string().min(1),
  environment:z.string().min(1),
  effect:z.enum(["allow","deny","approval-required"])
});
const Body=z.object({
  rules:z.array(Rule),
  expectedVersion:z.number().int().nonnegative().optional()
});

function isAdmin(request:Request){
  const expected=process.env.ZEROAI_ADMIN_TOKEN;
  return Boolean(expected && request.headers.get("authorization")===`Bearer ${expected}`);
}

export async function PUT(request:Request,{params}:{params:Promise<{workspaceId:string}>}) {
  try {
    if(!isAdmin(request)) return Response.json({error:"UNAUTHORIZED"},{status:401});
    const {workspaceId}=await params;
    const store=getStore();
    if(!await store.getWorkspace(workspaceId)) return Response.json({error:"WORKSPACE_NOT_FOUND"},{status:404});

    let body:unknown;
    try {
      body=await request.json();
    } catch {
      return Response.json({error:"INVALID_JSON"},{status:400});
    }

    const parsed=Body.safeParse(body);
    if(!parsed.success) return Response.json({error:"INVALID_REQUEST",issues:parsed.error.issues},{status:422});

    const key="zero.policy.rules";
    const current=await store.getState(workspaceId,key);
    const record={
      workspaceId,
      key,
      version:(current?.version ?? 0)+1,
      value:parsed.data.rules,
      valueHash:hashObject(parsed.data.rules),
      updatedAt:new Date().toISOString()
    };
    await store.putState(record,parsed.data.expectedVersion);
    return Response.json({policy:{workspaceId,version:record.version,rules:parsed.data.rules}});
  } catch(error) {
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="STATE_VERSION_CONFLICT" ? 409 : message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}
