import { z } from "zod";
import { certify } from "../../../../lib/cert";

const Evidence=z.object({
  id:z.string(),
  type:z.string(),
  state:z.enum(["VERIFIED","PARTIAL","UNKNOWN","FAILED"]),
  artifactHash:z.string().optional()
});
const Requirement=z.object({
  id:z.string(),
  requiredEvidenceTypes:z.array(z.string()).min(1)
});
const Body=z.object({
  requirement:Requirement,
  evidence:z.array(Evidence)
});

export async function POST(request:Request) {
  let body:unknown;
  try {
    body=await request.json();
  } catch {
    return Response.json({error:"INVALID_JSON"},{status:400});
  }

  const parsed=Body.safeParse(body);
  if (!parsed.success) return Response.json({error:"INVALID_REQUEST",issues:parsed.error.issues},{status:422});

  return Response.json({
    authoritative:false,
    result:certify(parsed.data.requirement,parsed.data.evidence)
  });
}
