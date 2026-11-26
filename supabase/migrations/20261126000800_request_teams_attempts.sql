-- One durable claim before outbound I/O. No background retry of ambiguous claims.
create table factact.service_request_teams_attempts (
 id uuid primary key,tenant_id uuid not null,intent_id uuid not null,
 attempt_no integer not null check(attempt_no>0),command_id uuid not null,
 actor_operator_id uuid not null,started_at timestamptz not null,
 finished_at timestamptz,state text not null check(state in ('SENDING','ACCEPTED','REJECTED','UNKNOWN')),
 http_status integer check(http_status between 100 and 599),
 unique(tenant_id,intent_id,attempt_no),unique(tenant_id,intent_id,command_id),
 check((state='SENDING')=(finished_at is null)),
 check(finished_at is null or finished_at>=started_at),
 foreign key(tenant_id,intent_id) references factact.service_request_teams_intents(tenant_id,id),
 foreign key(tenant_id,actor_operator_id) references factact.operators(tenant_id,id)
);
alter table factact.service_request_teams_attempts enable row level security;
alter table factact.service_request_teams_attempts force row level security;
create policy tenant_isolation on factact.service_request_teams_attempts to factact_runtime
 using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select,insert,update(finished_at,state,http_status) on factact.service_request_teams_attempts to factact_runtime;
