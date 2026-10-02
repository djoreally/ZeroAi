import { createClient } from "@neondatabase/neon-js";
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

type Row=Record<string,any>;
type TokenProvider=()=>Promise<string>;

function fail(error:any):never {
  const message=error?.message ?? "NEON_DATA_API_ERROR";
  throw new Error(message);
}

function workspace(row:Row):Workspace {
  return {id:row.id,slug:row.slug,name:row.name,status:row.status,createdAt:row.created_at,updatedAt:row.updated_at};
}
function workspaceMembership(row:Row):WorkspaceMembership {
  return {workspaceId:row.workspace_id,authUserId:row.auth_user_id,role:row.role,status:row.status,createdAt:row.created_at,updatedAt:row.updated_at};
}
function apiKey(row:Row):ApiKeyRecord {
  return {id:row.id,workspaceId:row.workspace_id,name:row.name,prefix:row.prefix,secretHash:row.secret_hash,scopes:row.scopes ?? [],createdAt:row.created_at,lastUsedAt:row.last_used_at ?? undefined,revokedAt:row.revoked_at ?? undefined};
}
function state(row:Row):StateRecord {
  return {workspaceId:row.workspace_id,key:row.key,version:Number(row.version),value:row.value,valueHash:row.value_hash,updatedAt:row.updated_at};
}
function event(row:Row):EventRecord {
  return {id:row.id,workspaceId:row.workspace_id,stream:row.stream,sequence:Number(row.sequence),actor:row.actor,action:row.action,payload:row.payload,payloadHash:row.payload_hash,parentHash:row.parent_hash,eventHash:row.event_hash,signature:row.signature,evidenceRefs:row.evidence_refs ?? [],createdAt:row.created_at};
}
function memoryFact(row:Row):MemoryFactRecord {
  return {id:row.id,workspaceId:row.workspace_id,subject:row.subject,predicate:row.predicate,object:row.object,confidence:Number(row.confidence),salience:Number(row.salience),sourceEventId:row.source_event_id ?? undefined,validFrom:row.valid_from,invalidatedAt:row.invalidated_at ?? undefined,createdAt:row.created_at,updatedAt:row.updated_at};
}
function execution(row:Row):ExecutionRecord {
  return {id:row.id,workspaceId:row.workspace_id,intentHash:row.intent_hash,graphHash:row.graph_hash,status:row.status,currentTaskId:row.current_task_id ?? undefined,startedAt:row.started_at ?? undefined,completedAt:row.completed_at ?? undefined,createdAt:row.created_at};
}
function evidence(row:Row):EvidenceRecord {
  return {id:row.id,workspaceId:row.workspace_id,executionId:row.execution_id,type:row.type,state:row.state,artifactHash:row.artifact_hash ?? undefined,payload:row.payload,createdAt:row.created_at};
}
function certification(row:Row):CertificationRecord {
  return {id:row.id,workspaceId:row.workspace_id,executionId:row.execution_id,requirementId:row.requirement_id,state:row.state,evidenceIds:row.evidence_ids ?? [],createdAt:row.created_at};
}

export class NeonDataApiZeroStore implements ZeroStore {
  private client:any;

  constructor(dataApiUrl:string,getToken:TokenProvider){
    this.client=createClient({
      dataApi:{
        url:dataApiUrl,
        getToken
      }
    });
  }

  async createWorkspace(value:Workspace){
    const {error}=await this.client.from("zero_workspaces").insert({
      id:value.id,slug:value.slug,name:value.name,status:value.status,created_at:value.createdAt,updated_at:value.updatedAt
    });
    if(error) fail(error);
  }

  async getWorkspace(id:string){
    const {data,error}=await this.client.from("zero_workspaces").select("*").eq("id",id).maybeSingle();
    if(error) fail(error);
    return data ? workspace(data) : null;
  }

  async getWorkspaceBySlug(slug:string){
    const {data,error}=await this.client.from("zero_workspaces").select("*").eq("slug",slug).maybeSingle();
    if(error) fail(error);
    return data ? workspace(data) : null;
  }

  async listWorkspaceMembershipsForUser(authUserId:string){
    const {data,error}=await this.client.from("zero_workspace_memberships").select("*").eq("auth_user_id",authUserId).eq("status","active").order("created_at",{ascending:true});
    if(error) fail(error);
    return (data ?? []).map(workspaceMembership);
  }

  async getWorkspaceMembership(workspaceId:string,authUserId:string){
    const {data,error}=await this.client.from("zero_workspace_memberships").select("*").eq("workspace_id",workspaceId).eq("auth_user_id",authUserId).maybeSingle();
    if(error) fail(error);
    return data ? workspaceMembership(data) : null;
  }

  async createApiKey(value:ApiKeyRecord){
    const {error}=await this.client.from("zero_api_keys").insert({
      id:value.id,workspace_id:value.workspaceId,name:value.name,prefix:value.prefix,secret_hash:value.secretHash,scopes:value.scopes,created_at:value.createdAt,last_used_at:value.lastUsedAt ?? null,revoked_at:value.revokedAt ?? null
    });
    if(error) fail(error);
  }

  async findApiKeyByPrefix(prefix:string){
    const {data,error}=await this.client.from("zero_api_keys").select("*").eq("prefix",prefix).is("revoked_at",null).maybeSingle();
    if(error) fail(error);
    return data ? apiKey(data) : null;
  }

  async updateApiKeyLastUsed(id:string,at:string){
    const {error}=await this.client.from("zero_api_keys").update({last_used_at:at}).eq("id",id);
    if(error) fail(error);
  }

  async revokeApiKey(id:string,at:string){
    const {error}=await this.client.from("zero_api_keys").update({revoked_at:at}).eq("id",id);
    if(error) fail(error);
  }

  async putState(value:StateRecord,expectedVersion?:number){
    const {data,error}=await this.client.rpc("zero_put_state",{
      p_workspace_id:value.workspaceId,
      p_key:value.key,
      p_value:value.value,
      p_value_hash:value.valueHash,
      p_expected_version:expectedVersion ?? null,
      p_updated_at:value.updatedAt
    });
    if(error) {
      if(String(error.message ?? "").includes("STATE_VERSION_CONFLICT")) throw new Error("STATE_VERSION_CONFLICT");
      fail(error);
    }
    if(!data) throw new Error("ZERO_STATE_WRITE_FAILED");
  }

  async getState(workspaceId:string,key:string){
    const {data,error}=await this.client.from("zero_state").select("*").eq("workspace_id",workspaceId).eq("key",key).maybeSingle();
    if(error) fail(error);
    return data ? state(data) : null;
  }

  async appendEvent(value:EventRecord){
    const {error}=await this.client.from("zero_events").insert({
      id:value.id,workspace_id:value.workspaceId,stream:value.stream,sequence:value.sequence,actor:value.actor,action:value.action,payload:value.payload,payload_hash:value.payloadHash,parent_hash:value.parentHash,event_hash:value.eventHash,signature:value.signature,evidence_refs:value.evidenceRefs,created_at:value.createdAt
    });
    if(error) {
      if(error.code==="23505") throw new Error("EVENT_SEQUENCE_CONFLICT");
      fail(error);
    }
  }

  async getLatestEvent(workspaceId:string,stream:string){
    const {data,error}=await this.client.from("zero_events").select("*").eq("workspace_id",workspaceId).eq("stream",stream).order("sequence",{ascending:false}).limit(1).maybeSingle();
    if(error) fail(error);
    return data ? event(data) : null;
  }

  async listEvents(workspaceId:string,stream:string,limit=100){
    const {data,error}=await this.client.from("zero_events").select("*").eq("workspace_id",workspaceId).eq("stream",stream).order("sequence",{ascending:true}).limit(limit);
    if(error) fail(error);
    return (data ?? []).map(event);
  }

  async upsertMemoryFact(value:MemoryFactRecord){
    const {error}=await this.client.from("zero_memory_facts").upsert({
      id:value.id,workspace_id:value.workspaceId,subject:value.subject,predicate:value.predicate,object:value.object,confidence:value.confidence,salience:value.salience,source_event_id:value.sourceEventId ?? null,valid_from:value.validFrom,invalidated_at:value.invalidatedAt ?? null,created_at:value.createdAt,updated_at:value.updatedAt
    },{onConflict:"id"});
    if(error) fail(error);
  }

  async listMemoryFacts(workspaceId:string,limit=1000){
    const {data,error}=await this.client.from("zero_memory_facts").select("*").eq("workspace_id",workspaceId).is("invalidated_at",null).order("salience",{ascending:false}).limit(limit);
    if(error) fail(error);
    return (data ?? []).map(memoryFact);
  }

  async createExecution(value:ExecutionRecord){
    const {error}=await this.client.from("zero_executions").insert({
      id:value.id,workspace_id:value.workspaceId,intent_hash:value.intentHash,graph_hash:value.graphHash,status:value.status,current_task_id:value.currentTaskId ?? null,started_at:value.startedAt ?? null,completed_at:value.completedAt ?? null,created_at:value.createdAt
    });
    if(error) fail(error);
  }

  async updateExecution(value:ExecutionRecord){
    const {error}=await this.client.from("zero_executions").update({
      intent_hash:value.intentHash,graph_hash:value.graphHash,status:value.status,current_task_id:value.currentTaskId ?? null,started_at:value.startedAt ?? null,completed_at:value.completedAt ?? null
    }).eq("workspace_id",value.workspaceId).eq("id",value.id);
    if(error) fail(error);
  }

  async getExecution(workspaceId:string,id:string){
    const {data,error}=await this.client.from("zero_executions").select("*").eq("workspace_id",workspaceId).eq("id",id).maybeSingle();
    if(error) fail(error);
    return data ? execution(data) : null;
  }

  async createEvidence(value:EvidenceRecord){
    const {error}=await this.client.from("zero_evidence").insert({
      id:value.id,workspace_id:value.workspaceId,execution_id:value.executionId,type:value.type,state:value.state,artifact_hash:value.artifactHash ?? null,payload:value.payload,created_at:value.createdAt
    });
    if(error) fail(error);
  }

  async listEvidence(workspaceId:string,executionId:string){
    const {data,error}=await this.client.from("zero_evidence").select("*").eq("workspace_id",workspaceId).eq("execution_id",executionId).order("created_at",{ascending:true});
    if(error) fail(error);
    return (data ?? []).map(evidence);
  }

  async createCertification(value:CertificationRecord){
    const {error}=await this.client.from("zero_certifications").insert({
      id:value.id,workspace_id:value.workspaceId,execution_id:value.executionId,requirement_id:value.requirementId,state:value.state,evidence_ids:value.evidenceIds,created_at:value.createdAt
    });
    if(error) fail(error);
  }

  async listCertifications(workspaceId:string,executionId:string){
    const {data,error}=await this.client.from("zero_certifications").select("*").eq("workspace_id",workspaceId).eq("execution_id",executionId).order("created_at",{ascending:true});
    if(error) fail(error);
    return (data ?? []).map(certification);
  }
}
