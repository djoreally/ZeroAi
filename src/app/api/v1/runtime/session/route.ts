import { authenticateWorkspaceRequest } from "@/lib/workspace-auth";
import { getStore } from "@/lib/runtime-store";

export async function GET(request:Request){
  const workspaceId=request.headers.get("x-zeroai-workspace")?.trim();
  if(!workspaceId) return Response.json({error:"WORKSPACE_REQUIRED"},{status:400});

  try {
    const auth=await authenticateWorkspaceRequest(request,workspaceId,"runtime:intercept");
    if(!auth.ok) return Response.json({error:auth.error},{status:auth.status});

    const workspace=await getStore().getWorkspace(workspaceId);
    if(!workspace || workspace.status!=="active"){
      return Response.json({error:"WORKSPACE_NOT_FOUND"},{status:404});
    }

    return Response.json({
      authenticated:true,
      workspace:{id:workspace.id,slug:workspace.slug,name:workspace.name,status:workspace.status}
    });
  } catch(error) {
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}
