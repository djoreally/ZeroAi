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
  requiredEvidenceTypes:z.array(z.string())
});
const Body=z.object({
  requirement:Requirement,
  evidence:z.array(Evidence)
});

export async function POST(request:Request) {
  const parsed=Body.safeParse(await request.json());
  if (!parsed.success) return Response.json({error:"INVALID_REQUEST",issues:parsed.error.issues},{status:422});
  return Response.json(certify(parsed.data.requirement,parsed.data.evidence));
}
