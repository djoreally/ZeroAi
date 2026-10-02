import type {
  ApiKeyRecord,
  CertificationRecord,
  EventRecord,
  EvidenceRecord,
  ExecutionRecord,
  MemoryFactRecord,
  StateRecord,
  Workspace
} from "./domain";

export interface ZeroStore {
  createWorkspace(workspace:Workspace):Promise<void>;
  getWorkspace(id:string):Promise<Workspace|null>;
  getWorkspaceBySlug(slug:string):Promise<Workspace|null>;

  createApiKey(record:ApiKeyRecord):Promise<void>;
  findApiKeyByPrefix(prefix:string):Promise<ApiKeyRecord|null>;
  updateApiKeyLastUsed(id:string,at:string):Promise<void>;
  revokeApiKey(id:string,at:string):Promise<void>;

  putState(record:StateRecord,expectedVersion?:number):Promise<void>;
  getState(workspaceId:string,key:string):Promise<StateRecord|null>;

  appendEvent(record:EventRecord):Promise<void>;
  getLatestEvent(workspaceId:string,stream:string):Promise<EventRecord|null>;
  listEvents(workspaceId:string,stream:string,limit?:number):Promise<EventRecord[]>;

  upsertMemoryFact(record:MemoryFactRecord):Promise<void>;
  listMemoryFacts(workspaceId:string,limit?:number):Promise<MemoryFactRecord[]>;

  createExecution(record:ExecutionRecord):Promise<void>;
  updateExecution(record:ExecutionRecord):Promise<void>;
  getExecution(workspaceId:string,id:string):Promise<ExecutionRecord|null>;

  createEvidence(record:EvidenceRecord):Promise<void>;
  listEvidence(workspaceId:string,executionId:string):Promise<EvidenceRecord[]>;

  createCertification(record:CertificationRecord):Promise<void>;
  listCertifications(workspaceId:string,executionId:string):Promise<CertificationRecord[]>;
}
