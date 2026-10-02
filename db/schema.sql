create table if not exists zero_workspaces (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  status text not null check (status in ('active','suspended')),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists zero_api_keys (
  id uuid primary key,
  workspace_id uuid not null references zero_workspaces(id) on delete cascade,
  name text not null,
  prefix text not null unique,
  secret_hash text not null,
  scopes jsonb not null,
  created_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz
);

create table if not exists zero_state (
  workspace_id uuid not null references zero_workspaces(id) on delete cascade,
  key text not null,
  version bigint not null,
  value jsonb not null,
  value_hash text not null,
  updated_at timestamptz not null,
  primary key (workspace_id,key)
);

create table if not exists zero_events (
  id uuid primary key,
  workspace_id uuid not null references zero_workspaces(id) on delete cascade,
  stream text not null,
  sequence bigint not null,
  actor text not null,
  action text not null,
  payload jsonb not null,
  payload_hash text not null,
  parent_hash text not null,
  event_hash text not null,
  signature text not null,
  evidence_refs jsonb not null,
  created_at timestamptz not null,
  unique (workspace_id,stream,sequence),
  unique (workspace_id,event_hash)
);

create table if not exists zero_memory_facts (
  id uuid primary key,
  workspace_id uuid not null references zero_workspaces(id) on delete cascade,
  subject text not null,
  predicate text not null,
  object text not null,
  confidence double precision not null check (confidence between 0 and 1),
  salience double precision not null check (salience between 0 and 1),
  source_event_id uuid,
  valid_from timestamptz not null,
  invalidated_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists zero_memory_facts_active_idx
  on zero_memory_facts(workspace_id,subject,predicate)
  where invalidated_at is null;

create table if not exists zero_executions (
  id uuid primary key,
  workspace_id uuid not null references zero_workspaces(id) on delete cascade,
  intent_hash text not null,
  graph_hash text not null,
  status text not null,
  current_task_id text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null
);

create table if not exists zero_evidence (
  id uuid primary key,
  workspace_id uuid not null references zero_workspaces(id) on delete cascade,
  execution_id uuid not null references zero_executions(id) on delete cascade,
  type text not null,
  state text not null check (state in ('VERIFIED','PARTIAL','UNKNOWN','FAILED')),
  artifact_hash text,
  payload jsonb not null,
  created_at timestamptz not null
);

create table if not exists zero_certifications (
  id uuid primary key,
  workspace_id uuid not null references zero_workspaces(id) on delete cascade,
  execution_id uuid not null references zero_executions(id) on delete cascade,
  requirement_id text not null,
  state text not null check (state in ('VERIFIED','PARTIAL','UNKNOWN','FAILED')),
  evidence_ids jsonb not null,
  created_at timestamptz not null
);
