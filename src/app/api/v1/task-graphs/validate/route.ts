import { TaskGraphSchema, topologicalOrder } from "../../../../../lib/task-graph";

export async function POST(request:Request) {
  let body:unknown;
  try {
    body=await request.json();
  } catch {
    return Response.json({valid:false,error:"INVALID_JSON"},{status:400});
  }

  const parsed=TaskGraphSchema.safeParse(body);
  if (!parsed.success) return Response.json({valid:false,issues:parsed.error.issues},{status:422});

  const ordered=topologicalOrder(parsed.data.nodes);
  return Response.json({valid:true,order:ordered.map(node=>node.id),graph:parsed.data});
}
