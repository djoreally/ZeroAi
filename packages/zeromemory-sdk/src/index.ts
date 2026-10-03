export type BrainScope={
  userId:string;
  agentId?:string;
  sessionId?:string;
  projectId?:string;
};

export type MemoryKind="fact"|"preference"|"decision"|"goal"|"constraint"|"episode";

export type ContextMemory={
  id:string;
  kind:MemoryKind;
  key:string;
  value:string;
  confidence:number;
  salience:number;
  score:number;
  decay:number;
  updatedAt:string;
};

export type ContextResponse={
  capsuleId:string;
  workspaceId:string;
  scope:BrainScope;
  memories:ContextMemory[];
  workingMemory:string;
  count:number;
  pipe:{
    scanned:number;
    active:number;
    scopeMatched:number;
    supersededCollapsed:number;
    ranked:number;
    returned:number;
  };
};

export type ExplicitMemory={
  kind:MemoryKind;
  key:string;
  value:string;
  confidence?:number;
  salience?:number;
};

export type ObserveResponse={
  workspaceId:string;
  scope:BrainScope;
  stored:Array<{
    id:string;
    kind:MemoryKind;
    key:string;
    value:string;
    confidence:number;
    salience:number;
  }>;
  storedCount:number;
  supersededCount:number;
  inferredCount:number;
  ignored:boolean;
};

export type MaintainResponse={
  workspaceId:string;
  scope:BrainScope;
  dryRun:boolean;
  scoped:number;
  episodes:number;
  consolidations:number;
  invalidations:number;
  nextRunAfterSeconds:number;
  nextSuggestedRunAt:string;
};

export type ZeroMemoryClientOptions={
  baseUrl:string;
  apiKey:string;
  fetch?:typeof globalThis.fetch;
};

export class ZeroMemoryError extends Error{
  readonly status:number;
  readonly payload:unknown;

  constructor(status:number,payload:unknown){
    super(`ZeroMemory request failed with status ${status}`);
    this.name="ZeroMemoryError";
    this.status=status;
    this.payload=payload;
  }
}

export class ZeroMemoryClient{
  private readonly baseUrl:string;
  private readonly apiKey:string;
  private readonly fetcher:typeof globalThis.fetch;

  constructor(options:ZeroMemoryClientOptions){
    this.baseUrl=options.baseUrl.replace(/\/+$/,"");
    this.apiKey=options.apiKey;
    this.fetcher=options.fetch ?? globalThis.fetch;
    if(!this.fetcher) throw new Error("ZeroMemory requires a fetch implementation");
  }

  private async request<T>(path:string,body:unknown):Promise<T>{
    const response=await this.fetcher(`${this.baseUrl}${path}`,{
      method:"POST",
      headers:{
        authorization:`Bearer ${this.apiKey}`,
        "content-type":"application/json"
      },
      body:JSON.stringify(body)
    });
    const payload=await response.json().catch(()=>null);
    if(!response.ok) throw new ZeroMemoryError(response.status,payload);
    return payload as T;
  }

  context(input:{scope:BrainScope;input:string;maxFacts?:number}){
    return this.request<ContextResponse>("/api/v1/brain/context",input);
  }

  observe(input:{scope:BrainScope;input?:string;output?:string;memories?:ExplicitMemory[]}){
    return this.request<ObserveResponse>("/api/v1/brain/observe",input);
  }

  consolidate(input:{scope:BrainScope;minOccurrences?:number}){
    return this.request<{workspaceId:string;scope:BrainScope;consolidatedCount:number;stored:Array<{id:string;kind:string;key:string;value:string}>}>("/api/v1/brain/consolidate",input);
  }

  maintain(input:{scope:BrainScope;minOccurrences?:number;decayThreshold?:number;dryRun?:boolean}){
    return this.request<MaintainResponse>("/api/v1/brain/maintain",input);
  }

  async runTurn<T>(input:{
    scope:BrainScope;
    message:string;
    maxFacts?:number;
    run:(args:{message:string;workingMemory:string;context:ContextResponse})=>Promise<T>;
    serializeOutput?:(value:T)=>string;
  }){
    const context=await this.context({scope:input.scope,input:input.message,maxFacts:input.maxFacts});
    const output=await input.run({message:input.message,workingMemory:context.workingMemory,context});
    const serialized=input.serializeOutput ? input.serializeOutput(output) : typeof output==="string" ? output : JSON.stringify(output);
    await this.observe({scope:input.scope,input:input.message,output:serialized});
    return {output,context};
  }
}

export function createZeroMemory(options:ZeroMemoryClientOptions){
  return new ZeroMemoryClient(options);
}
