import { randomUUID } from "node:crypto";
import { certify } from "../../../../../../lib/cert";
import { appendWorkspaceEvent } from "../../../../../../lib/event-service";
import { hashObject } from "../../../../../../lib/hash";
import { getStore } from "../../../../../../lib/runtime-store";
import { newWorkspace } from "../../../../../../lib/workspaces";

function isAdmin(request:Request){
  const expected=process.env.ZEROAI_ADMIN_TOKEN;
  return Boolean(expected && request.headers.get("authorization")===`Bearer ${expected}`);
}

export async function POST(request:Request){
  if(!isAdmin(request)) return Response.json({error:"UNAUTHORIZED"},{status:401});

  const ledgerSecret=process.env.ZEROAI_LEDGER_SECRET;
  if(!ledgerSecret) return Response.json({error:"ZEROAI_LEDGER_SECRET_NOT_CONFIGURED"},{status:503});

  try {
    const store=getStore();

    let workspace=await store.getWorkspaceBySlug("__zeroai_e2e__");
    if(!workspace){
      workspace=newWorkspace({name:"ZeroAI E2E Verification",slug:"__zeroai_e2e__"});
      await store.createWorkspace(workspace);
    }

    const stateKey="verification.last_run";
    const currentState=await store.getState(workspace.id,stateKey);
    const runId=randomUUID();
    const now=new Date().toISOString();
    const stateValue={runId,status:"started",at:now};
    await store.putState({
      workspaceId:workspace.id,
      key:stateKey,
      version:(currentState?.version ?? 0)+1,
      value:stateValue,
      valueHash:hashObject(stateValue),
      updatedAt:now
    },currentState?.version ?? 0);

    const persistedState=await store.getState(workspace.id,stateKey);
    if(!persistedState || (persistedState.value as {runId?:string})?.runId!==runId){
      throw new Error("E2E_STATE_ROUNDTRIP_FAILED");
    }

    const event=await appendWorkspaceEvent({
      store,
      workspaceId:workspace.id,
      stream:"e2e",
      actor:"zeroai-e2e",
      action:"persistence.verified",
      payload:{runId},
      evidenceRefs:[],
      secret:ledgerSecret,
      anchor:process.env.ZEROAI_LEDGER_ANCHOR ?? "GENESIS"
    });

    const eventReadback=await store.getLatestEvent(workspace.id,"e2e");
    if(!eventReadback || eventReadback.eventHash!==event.eventHash){
      throw new Error("E2E_LEDGER_ROUNDTRIP_FAILED");
    }

    const execution={
      id:randomUUID(),
      workspaceId:workspace.id,
      intentHash:hashObject({runId,intent:"verify-managed-persistence"}),
      graphHash:hashObject({nodes:["state","ledger","evidence","certification"]}),
      status:"succeeded" as const,
      startedAt:now,
      completedAt:new Date().toISOString(),
      createdAt:now
    };
    await store.createExecution(execution);

    const executionReadback=await store.getExecution(workspace.id,execution.id);
    if(!executionReadback || executionReadback.status!=="succeeded"){
      throw new Error("E2E_EXECUTION_ROUNDTRIP_FAILED");
    }

    const evidence={
      id:randomUUID(),
      workspaceId:workspace.id,
      executionId:execution.id,
      type:"managed_persistence_e2e",
      state:"VERIFIED" as const,
      artifactHash:hashObject({runId,eventHash:event.eventHash,stateHash:persistedState.valueHash}),
      payload:{runId,eventHash:event.eventHash,stateVersion:persistedState.version},
      createdAt:new Date().toISOString()
    };
    await store.createEvidence(evidence);

    const storedEvidence=await store.listEvidence(workspace.id,execution.id);
    const certificationResult=certify(
      {id:"managed-persistence",requiredEvidenceTypes:["managed_persistence_e2e"]},
      storedEvidence.map(item=>({id:item.id,type:item.type,state:item.state,artifactHash:item.artifactHash}))
    );

    if(certificationResult.state!=="VERIFIED"){
      throw new Error(`E2E_CERTIFICATION_FAILED:${certificationResult.state}`);
    }

    const certification={
      id:randomUUID(),
      workspaceId:workspace.id,
      executionId:execution.id,
      requirementId:"managed-persistence",
      state:"VERIFIED" as const,
      evidenceIds:certificationResult.evidence.map(item=>item.id),
      createdAt:new Date().toISOString()
    };
    await store.createCertification(certification);

    const storedCertifications=await store.listCertifications(workspace.id,execution.id);
    if(!storedCertifications.some(item=>item.id===certification.id && item.state==="VERIFIED")){
      throw new Error("E2E_CERTIFICATION_ROUNDTRIP_FAILED");
    }

    return Response.json({
      ok:true,
      state:"VERIFIED",
      runId,
      workspaceId:workspace.id,
      executionId:execution.id,
      checks:{
        workspace:"VERIFIED",
        state:"VERIFIED",
        ledger:"VERIFIED",
        execution:"VERIFIED",
        evidence:"VERIFIED",
        certification:"VERIFIED"
      }
    });
  } catch(error) {
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({ok:false,state:"FAILED",error:message},{status:503});
  }
}
