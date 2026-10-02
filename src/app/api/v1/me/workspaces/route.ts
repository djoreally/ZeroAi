import { getSignedInUser } from "@/lib/user-session";
import { getStore } from "@/lib/runtime-store";

export async function GET(){
  try{
    const user=await getSignedInUser();
    if(!user) return Response.json({error:"UNAUTHORIZED"},{status:401});

    const store=getStore();
    const memberships=await store.listWorkspaceMembershipsForUser(user.id);
    const items=await Promise.all(memberships.map(async membership=>{
      const workspace=await store.getWorkspace(membership.workspaceId);
      return workspace ? {workspace,role:membership.role,status:membership.status} : null;
    }));

    return Response.json({
      user,
      workspaces:items.filter(Boolean)
    });
  }catch(error){
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}
