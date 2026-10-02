export type PolicyAction = "READ"|"WRITE"|"DELETE"|"DEPLOY"|"SEND_EMAIL"|"CHARGE_CARD"|"MERGE_PR"|"MODIFY_DATABASE"|"ROTATE_SECRET";
export type PolicyRule = {
  agentId:string;
  action:PolicyAction;
  resourcePattern:string;
  environment:string;
  effect:"allow"|"deny"|"approval-required";
};

export type PolicyDecision = {
  decision:"ALLOW"|"DENY"|"APPROVAL_REQUIRED";
  reason:string;
  matchedRule?:PolicyRule;
};

function matches(pattern:string,value:string):boolean {
  return pattern==="*" || (pattern.endsWith("*") ? value.startsWith(pattern.slice(0,-1)) : pattern===value);
}

export function evaluatePolicy(rules:PolicyRule[],request:{agentId:string;action:PolicyAction;resource:string;environment:string}):PolicyDecision {
  const matchesFound = rules.filter(rule =>
    (rule.agentId==="*" || rule.agentId===request.agentId) &&
    rule.action===request.action &&
    matches(rule.resourcePattern,request.resource) &&
    (rule.environment==="*" || rule.environment===request.environment)
  );

  if (matchesFound.some(r=>r.effect==="deny")) return {decision:"DENY",reason:"Explicit deny rule matched",matchedRule:matchesFound.find(r=>r.effect==="deny")};
  if (matchesFound.some(r=>r.effect==="approval-required")) return {decision:"APPROVAL_REQUIRED",reason:"Human approval required",matchedRule:matchesFound.find(r=>r.effect==="approval-required")};
  if (matchesFound.some(r=>r.effect==="allow")) return {decision:"ALLOW",reason:"Explicit allow rule matched",matchedRule:matchesFound.find(r=>r.effect==="allow")};
  return {decision:"DENY",reason:"No policy grants this action"};
}
