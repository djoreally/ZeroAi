import { verifyLedgerChain, type LedgerEvent } from "@/lib/ledger";

export async function POST(request:Request) {
  const secret=process.env.ZEROAI_LEDGER_SECRET;
  if (!secret) return Response.json({error:"ZEROAI_LEDGER_SECRET is not configured"},{status:500});
  const body=await request.json() as {events:LedgerEvent[]};
  return Response.json({valid:verifyLedgerChain(body.events ?? [],secret)});
}
