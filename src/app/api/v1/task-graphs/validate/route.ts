import { TaskGraphSchema, topologicalOrder } from "../../../../../lib/task-graph";

export async function POST(request:Request) {
  const parsed=TaskGraphSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({valid:false,issues:parsed.error.issues},{status:422});
  try {
    const ordered=topologicalOrder(parsed.data.nodes);
    return Response.json({valid:true,order:ordered.map(node=>node.id),graph:parsed.data});
  } catch (error) {
    return Response.json({valid:false,issues:[{message:error instanceof Error ? error.message : "Invalid task graph"}]},{status:422});
  }
}
