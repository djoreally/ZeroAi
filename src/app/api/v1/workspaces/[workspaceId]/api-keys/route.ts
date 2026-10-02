import { z } from "zod";
import { createApiKey } from "../../../../../../lib/api-key";
import { getStore } from "../../../../../../lib/runtime-store";

const Body=z.object({
  name:z.string().min(1).max(80),
  scopes:z.array(z.string().min(1)).min(1)
});

export async function POST(request:Request,{params}:{params:Promise<{workspaceId:string}>}) {
  try {
    const {workspaceId}=await params;
    const parsed=Body.safeParse(await request.json());
    if(!parsed.success) return Response.json({error:"INVALID_REQUEST",issues:parsed.error.issues},{status:422});
    const salt=process.env.ZEROAI_API_KEY_SALT;
    if(!salt) return Response.json({error:"ZEROAI_API_KEY_SALT_NOT_CONFIGURED"},{status:503});
    const store=getStore();
    if(!await store.getWorkspace(workspaceId)) return Response.json({error:"WORKSPACE_NOT_FOUND"},{status:404});
    const {token,record}=createApiKey(workspaceId,parsed.data.name,parsed.data.scopes,salt);
    await store.createApiKey(record);
    return Response.json({
      apiKey:{id:record.id,name:record.name,prefix:record.prefix,scopes:record.scopes,createdAt:record.createdAt},
      token
    },{status:201});
  } catch(error) {
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}
