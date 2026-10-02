import { z } from "zod";
import { evaluatePolicy } from "../../../../../lib/policy";

const Action=z.enum(["READ","WRITE","DELETE","DEPLOY","SEND_EMAIL","CHARGE_CARD","MERGE_PR","MODIFY_DATABASE","ROTATE_SECRET"]);
const Rule=z.object({
  agentId:z.string(),
  action:Action,
  resourcePattern:z.string(),
  environment:z.string(),
  effect:z.enum(["allow","deny","approval-required"])
});
const RequestSchema=z.object({
  rules:z.array(Rule),
  request:z.object({
    agentId:z.string(),
    action:Action,
    resource:z.string(),
    environment:z.string()
  })
});

export async function POST(request:Request) {
  const parsed=RequestSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({error:"INVALID_REQUEST",issues:parsed.error.issues},{status:422});
  return Response.json(evaluatePolicy(parsed.data.rules,parsed.data.request));
}
