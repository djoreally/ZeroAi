import { z } from "zod";
import { verifyLedgerChain } from "@/lib/ledger";

const Event=z.object({
  eventId:z.string().min(1),
  workspaceId:z.string().min(1),
  actor:z.string().min(1),
  action:z.string().min(1),
  timestamp:z.string().min(1),
  inputHash:z.string().min(1),
  outputHash:z.string().optional(),
  parentHash:z.string().min(1),
  evidenceRefs:z.array(z.string()),
  eventHash:z.string().min(1),
  signature:z.string().min(1)
});
const Body=z.object({events:z.array(Event).min(1)});

export async function POST(request:Request) {
  const secret=process.env.ZEROAI_LEDGER_SECRET;
  if (!secret) return Response.json({error:"ZEROAI_LEDGER_SECRET is not configured"},{status:500});

  let body:unknown;
  try {
    body=await request.json();
  } catch {
    return Response.json({error:"INVALID_JSON"},{status:400});
  }

  const parsed=Body.safeParse(body);
  if(!parsed.success) return Response.json({error:"INVALID_REQUEST",issues:parsed.error.issues},{status:422});

  const expectedAnchor=process.env.ZEROAI_LEDGER_ANCHOR ?? "GENESIS";
  return Response.json({valid:verifyLedgerChain(parsed.data.events,secret,expectedAnchor)});
}
