import { newWorkspace } from "@/lib/workspaces";
import { getStore } from "@/lib/runtime-store";
import { getSignedInUser } from "@/lib/user-session";

function personalSlug(userId:string){
  return `user-${userId.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,24)}`;
}

export async function POST(){
  try{
    const user=await getSignedInUser();
    if(!user) return Response.json({error:"UNAUTHORIZED"},{status:401});

    const store=getStore();
    const existing=await store.listWorkspaceMembershipsForUser(user.id);
    if(existing.length){
      const membership=existing[0];
      const workspace=await store.getWorkspace(membership.workspaceId);
      return Response.json({created:false,workspace,membership});
    }

    const slug=personalSlug(user.id);
    let workspace=await store.getWorkspaceBySlug(slug);
    if(!workspace){
      workspace=newWorkspace({
        name:user.name ? `${user.name}'s Workspace` : "My ZeroAI Workspace",
        slug
      });
      await store.createWorkspace(workspace);
    }

    const now=new Date().toISOString();
    const membership={
      workspaceId:workspace.id,
      authUserId:user.id,
      role:"owner" as const,
      status:"active" as const,
      createdAt:now,
      updatedAt:now
    };

    const current=await store.getWorkspaceMembership(workspace.id,user.id);
    if(!current) await store.createWorkspaceMembership(membership);

    return Response.json({created:!current,workspace,membership:current ?? membership});
  }catch(error){
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}
