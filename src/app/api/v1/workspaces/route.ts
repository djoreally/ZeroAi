import { z } from "zod";
import { getStore } from "../../../../lib/runtime-store";
import { newWorkspace } from "../../../../lib/workspaces";

const Body=z.object({
  name:z.string().min(1).max(120),
  slug:z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/)
});

function isAdmin(request:Request){
  const expected=process.env.ZEROAI_ADMIN_TOKEN;
  const header=request.headers.get("authorization");
  return Boolean(expected && header===`Bearer ${expected}`);
}

export async function POST(request:Request) {
  try {
    if(!isAdmin(request)) return Response.json({error:"UNAUTHORIZED"},{status:401});
    const parsed=Body.safeParse(await request.json());
    if(!parsed.success) return Response.json({error:"INVALID_REQUEST",issues:parsed.error.issues},{status:422});
    const store=getStore();
    if(await store.getWorkspaceBySlug(parsed.data.slug)) return Response.json({error:"WORKSPACE_SLUG_EXISTS"},{status:409});
    const workspace=newWorkspace(parsed.data);
    await store.createWorkspace(workspace);
    return Response.json({workspace},{status:201});
  } catch(error) {
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}
