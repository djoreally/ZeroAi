import { InterceptRequestSchema, compileIntercept } from "@/lib/runtime-r1";
import { ProviderBindingRecordSchema, PROVIDER_BINDING_STATE_KEY } from "@/lib/provider-binding";
import { authenticateWorkspaceRequest } from "@/lib/workspace-auth";
import { getStore } from "@/lib/runtime-store";

export async function POST(request:Request){
  let body:unknown;
  try {
    body=await request.json();
  } catch {
    return Response.json({error:"INVALID_JSON"},{status:400});
  }

  const parsed=InterceptRequestSchema.safeParse(body);
  if(!parsed.success){
    return Response.json({error:"INVALID_REQUEST",issues:parsed.error.issues},{status:422});
  }

  try {
    const auth=await authenticateWorkspaceRequest(request,parsed.data.workspaceId,"runtime:intercept");
    if(!auth.ok) return Response.json({error:auth.error},{status:auth.status});

    const store=getStore();
    const workspace=await store.getWorkspace(parsed.data.workspaceId);
    if(!workspace || workspace.status!=="active"){
      return Response.json({error:"WORKSPACE_NOT_FOUND"},{status:404});
    }

    const providerState=await store.getState(parsed.data.workspaceId,PROVIDER_BINDING_STATE_KEY);
    const providerParsed=ProviderBindingRecordSchema.safeParse(providerState?.value);
    if(!providerParsed.success){
      return Response.json({error:"PROVIDER_NOT_CONNECTED"},{status:409});
    }

    const envelope=compileIntercept(parsed.data,providerParsed.data);
    return Response.json({
      intercepted:true,
      providerDispatched:false,
      envelope
    });
  } catch(error) {
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json(
      {error:message},
      {status:message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500}
    );
  }
}
