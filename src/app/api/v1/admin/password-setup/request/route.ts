export async function POST(request:Request){
  const expected=(
    process.env.ZEROAI_PLATFORM_ADMIN_EMAIL ??
    process.env.ZEROAI_PLATFORM_ADMIN
  )?.trim().toLowerCase();
  const baseUrl=process.env.NEON_AUTH_BASE_URL;
  const appUrl=process.env.ZEROAI_APP_URL;

  if(!expected || !baseUrl || !appUrl){
    return Response.json({error:"ADMIN_SETUP_NOT_CONFIGURED"},{status:503});
  }

  let email="";
  try{
    const body=await request.json() as {email?:string};
    email=(body.email ?? "").trim().toLowerCase();
  }catch{
    return Response.json({error:"INVALID_JSON"},{status:400});
  }

  const generic={message:"If this is the configured platform administrator, a secure setup link has been sent."};
  if(email!==expected) return Response.json(generic);

  const response=await fetch(`${baseUrl.replace(/\/$/,"")}/request-password-reset`,{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({
      email,
      redirectTo:`${appUrl.replace(/\/$/,"")}/admin/reset-password`
    })
  });

  if(!response.ok){
    return Response.json({error:"ADMIN_SETUP_REQUEST_FAILED"},{status:502});
  }

  return Response.json(generic);
}
