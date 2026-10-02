import { IntentContractSchema } from "@/lib/contracts";

export async function POST(request:Request) {
  let body:unknown;
  try {
    body=await request.json();
  } catch {
    return Response.json({valid:false,error:"INVALID_JSON"},{status:400});
  }

  const result=IntentContractSchema.safeParse(body);
  return Response.json(
    result.success ? {valid:true,contract:result.data} : {valid:false,issues:result.error.issues},
    {status:result.success ? 200 : 422}
  );
}
