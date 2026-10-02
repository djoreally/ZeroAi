import { IntentContractSchema } from "@/lib/contracts";

export async function POST(request:Request) {
  const body=await request.json();
  const result=IntentContractSchema.safeParse(body);
  return Response.json(
    result.success ? {valid:true,contract:result.data} : {valid:false,issues:result.error.issues},
    {status:result.success ? 200 : 422}
  );
}
