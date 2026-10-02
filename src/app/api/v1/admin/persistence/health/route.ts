import { getNeonDataApiToken, jwtPayload } from "../../../../../../lib/neon-service-token";
import { getStore } from "../../../../../../lib/runtime-store";

function isAdmin(request:Request){
  const expected=process.env.ZEROAI_ADMIN_TOKEN;
  return Boolean(expected && request.headers.get("authorization")===`Bearer ${expected}`);
}

export async function GET(request:Request){
  if(!isAdmin(request)) return Response.json({error:"UNAUTHORIZED"},{status:401});

  try {
    const token=await getNeonDataApiToken();
    const payload=jwtPayload(token);
    const role=payload?.role;

    if(role!=="zeroai_service"){
      return Response.json({ok:false,error:"NEON_SERVICE_ROLE_MISMATCH",role:role ?? null},{status:503});
    }

    const store=getStore();
    await store.getWorkspaceBySlug("__zeroai_healthcheck__");

    return Response.json({
      ok:true,
      persistence:"neon-data-api",
      auth:"neon-auth",
      role,
      projectId:process.env.NEON_PROJECT_ID ?? null,
      branchId:process.env.NEON_BRANCH_ID ?? null
    });
  } catch(error) {
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({ok:false,error:message},{status:503});
  }
}
