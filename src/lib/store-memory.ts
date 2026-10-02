import type {
  ApiKeyRecord,
  CertificationRecord,
  EventRecord,
  EvidenceRecord,
  ExecutionRecord,
  MemoryFactRecord,
  StateRecord,
  Workspace,
  WorkspaceMembership
} from "./domain";
import type { ZeroStore } from "./store";

export class MemoryZeroStore implements ZeroStore {
  private workspaces=new Map<string,Workspace>();
  private apiKeys=new Map<string,ApiKeyRecord>();
  private workspaceMemberships=new Map<string,WorkspaceMembership>();
  private state=new Map<string,StateRecord>();
  private events:EventRecord[]=[];
  private memoryFacts=new Map<string,MemoryFactRecord>();
  private executions=new Map<string,ExecutionRecord>();
  private evidence:EvidenceRecord[]=[];
  private certifications:CertificationRecord[]=[];

  async createWorkspace(workspace:Workspace){this.workspaces.set(workspace.id,workspace);}
  async getWorkspace(id:string){return this.workspaces.get(id) ?? null;}
  async getWorkspaceBySlug(slug:string){return [...this.workspaces.values()].find(w=>w.slug===slug) ?? null;}
  async listWorkspaceMembershipsForUser(authUserId:string){
    return [...this.workspaceMemberships.values()].filter(m=>m.authUserId===authUserId && m.status==="active");
  }
  async getWorkspaceMembership(workspaceId:string,authUserId:string){
    return this.workspaceMemberships.get(`${workspaceId}:${authUserId}`) ?? null;
  }
  async createWorkspaceMembership(membership:WorkspaceMembership){
    this.workspaceMemberships.set(`${membership.workspaceId}:${membership.authUserId}`,membership);
  }

  async createApiKey(record:ApiKeyRecord){this.apiKeys.set(record.id,record);}
  async findApiKeyByPrefix(prefix:string){return [...this.apiKeys.values()].find(k=>k.prefix===prefix && !k.revokedAt) ?? null;}
  async updateApiKeyLastUsed(id:string,at:string){const record=this.apiKeys.get(id); if(record)this.apiKeys.set(id,{...record,lastUsedAt:at});}
  async revokeApiKey(id:string,at:string){const record=this.apiKeys.get(id); if(record)this.apiKeys.set(id,{...record,revokedAt:at});}

  async putState(record:StateRecord,expectedVersion?:number){
    const key=`${record.workspaceId}:${record.key}`;
    const current=this.state.get(key);
    if (expectedVersion!==undefined && (current?.version ?? 0)!==expectedVersion) throw new Error("STATE_VERSION_CONFLICT");
    this.state.set(key,record);
  }
  async getState(workspaceId:string,key:string){return this.state.get(`${workspaceId}:${key}`) ?? null;}

  async appendEvent(record:EventRecord){
    const duplicate=this.events.some(e=>e.workspaceId===record.workspaceId && e.stream===record.stream && e.sequence===record.sequence);
    if(duplicate) throw new Error("EVENT_SEQUENCE_CONFLICT");
    this.events.push(record);
  }
  async getLatestEvent(workspaceId:string,stream:string){
    return this.events.filter(e=>e.workspaceId===workspaceId && e.stream===stream).sort((a,b)=>b.sequence-a.sequence)[0] ?? null;
  }
  async listEvents(workspaceId:string,stream:string,limit=100){
    return this.events.filter(e=>e.workspaceId===workspaceId && e.stream===stream).sort((a,b)=>a.sequence-b.sequence).slice(-limit);
  }

  async upsertMemoryFact(record:MemoryFactRecord){this.memoryFacts.set(`${record.workspaceId}:${record.id}`,record);}
  async listMemoryFacts(workspaceId:string,limit=1000){
    return [...this.memoryFacts.values()].filter(f=>f.workspaceId===workspaceId && !f.invalidatedAt).sort((a,b)=>(b.salience*b.confidence)-(a.salience*a.confidence)).slice(0,limit);
  }

  async createExecution(record:ExecutionRecord){this.executions.set(`${record.workspaceId}:${record.id}`,record);}
  async updateExecution(record:ExecutionRecord){this.executions.set(`${record.workspaceId}:${record.id}`,record);}
  async getExecution(workspaceId:string,id:string){return this.executions.get(`${workspaceId}:${id}`) ?? null;}

  async createEvidence(record:EvidenceRecord){this.evidence.push(record);}
  async listEvidence(workspaceId:string,executionId:string){return this.evidence.filter(e=>e.workspaceId===workspaceId && e.executionId===executionId);}

  async createCertification(record:CertificationRecord){this.certifications.push(record);}
  async listCertifications(workspaceId:string,executionId:string){return this.certifications.filter(c=>c.workspaceId===workspaceId && c.executionId===executionId);}
}
