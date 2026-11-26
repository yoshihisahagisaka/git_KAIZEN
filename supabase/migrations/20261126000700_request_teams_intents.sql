-- Teams channel is configured separately from request access. No webhook URL in DB.
alter table factact.service_request_channels add column teams_enabled boolean not null default false;
create table factact.service_request_teams_recipients (
 id uuid primary key,tenant_id uuid not null,service_id uuid not null,contract_profile_id uuid not null,
 object_id uuid not null,display_name text not null check(length(trim(display_name)) between 1 and 100 and display_name !~ '[<>[:cntrl:]]'),
 enabled boolean not null default false,
 unique(tenant_id,service_id,contract_profile_id,object_id),
 foreign key(tenant_id,service_id,contract_profile_id) references factact.service_request_channels(tenant_id,service_id,contract_profile_id)
);
create trigger request_teams_recipient_lock before insert or update or delete on factact.service_request_teams_recipients
 for each row execute function factact.lock_service_request_configuration();
create table factact.service_request_teams_intents (
 id uuid primary key,tenant_id uuid not null,request_id uuid not null,
 selection text not null check(selection in ('ALL','SELECTED','NONE')),
 recipient_ids uuid[] not null check(cardinality(recipient_ids)<=20 and array_position(recipient_ids,null) is null),
 created_at timestamptz not null,
 unique(tenant_id,request_id),unique(tenant_id,id),
 check(selection<>'NONE' or cardinality(recipient_ids)=0),
 check(selection<>'SELECTED' or cardinality(recipient_ids)>0),
 foreign key(tenant_id,request_id) references factact.service_requests(tenant_id,id)
);
do $$
declare t text;
begin
 foreach t in array array['service_request_teams_recipients','service_request_teams_intents'] loop
 execute format('alter table factact.%I enable row level security',t);
 execute format('alter table factact.%I force row level security',t);
 execute format('create policy tenant_isolation on factact.%I to factact_runtime using (tenant_id=factact.current_tenant_id()) with check (tenant_id=factact.current_tenant_id())',t);
 end loop;
end $$;
grant select on factact.service_request_teams_recipients,factact.service_request_teams_intents to factact_runtime;
grant insert on factact.service_request_teams_intents to factact_runtime;
