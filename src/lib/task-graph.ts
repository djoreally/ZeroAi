import { TaskNodeSchema } from "@/lib/contracts";
import { z } from "zod";

export const TaskGraphSchema = z.object({
  nodes:z.array(TaskNodeSchema).min(1)
}).superRefine(({nodes},ctx)=>{
  const ids=new Set(nodes.map(n=>n.id));
  for (const node of nodes) {
    for (const dep of node.dependencies) {
      if (!ids.has(dep)) ctx.addIssue({code:"custom",message:`Unknown dependency ${dep} for ${node.id}`});
    }
  }
});

export function topologicalOrder(nodes:z.infer<typeof TaskNodeSchema>[]) {
  const byId=new Map(nodes.map(node=>[node.id,node]));
  const visiting=new Set<string>();
  const visited=new Set<string>();
  const result:typeof nodes=[];

  function visit(id:string) {
    if (visiting.has(id)) throw new Error("Task graph contains a cycle");
    if (visited.has(id)) return;
    const node=byId.get(id);
    if (!node) throw new Error(`Unknown task ${id}`);
    visiting.add(id);
    node.dependencies.forEach(visit);
    visiting.delete(id);
    visited.add(id);
    result.push(node);
  }

  nodes.forEach(node=>visit(node.id));
  return result;
}
