-- Application-level request exchange; not a new Work lane or generic workflow engine.
-- Party configuration and Actor binding are provisioned by a reviewed administrator,
-- never by a caller, mention roster, or ordinary SUPPORT UPDATE.
create table factact.service_request_channels (
 tenant_id uuid not null,
 service_id uuid not null,
 contract_profile_id uuid not null,
 provider_party_id uuid not null,
 partner_party_id uuid not null,
 enabled boolean not null default false,
 primary key(tenant_id,service_id,contract_profile_id),
 unique(tenant_id,service_id,contract_profile_id,provider_party_id,partner_party_id),
 check(provider_party_id<>partner_party_id),
 foreign key(tenant_id,contract_profile_id,service_id) references factact.contract_profiles(tenant_id,id,service_id),
 foreign key(tenant_id,provider_party_id) references factact.organizations(tenant_id,id),
 foreign key(tenant_id,partner_party_id) references factact.organizations(tenant_id,id)
);
create table factact.service_request_participants (
 tenant_id uuid not null,
 service_id uuid not null,
 contract_profile_id uuid not null,
 actor_operator_id uuid not null,
 party_role text not null check(party_role in ('PROVIDER','PARTNER')),
 can_create boolean not null default false,
 can_read boolean not null default false,
 can_respond boolean not null default false,
 enabled boolean not null default false,
 primary key(tenant_id,service_id,contract_profile_id,actor_operator_id),
 foreign key(tenant_id,service_id,contract_profile_id) references factact.service_request_channels(tenant_id,service_id,contract_profile_id),
 foreign key(tenant_id,actor_operator_id) references factact.operators(tenant_id,id),
 check(not can_respond or can_read)
);
create table factact.service_requests (
 id uuid primary key,
 tenant_id uuid not null,
 service_id uuid not null,
 contract_profile_id uuid not null,
 provider_party_id uuid not null,
 partner_party_id uuid not null,
 direction text not null check(direction in ('PROVIDER_TO_PARTNER','PARTNER_TO_PROVIDER')),
 request_type text not null check(request_type in ('CALL_REQUEST','SUPPORT_REQUEST','INVESTIGATION_REQUEST','INQUIRY','ONSITE_REQUEST','OTHER')),
 content text not null check(length(trim(content)) between 1 and 4000),
 customer_name text not null default '' check(length(customer_name)<=200),
 contact_name text not null default '' check(length(contact_name)<=200),
 desired_at timestamptz,
 parent_work_id uuid,
 created_by_operator_id uuid not null,
 created_at timestamptz not null,
 unique(tenant_id,id),
 check(request_type<>'ONSITE_REQUEST' or direction='PROVIDER_TO_PARTNER'),
 foreign key(tenant_id,service_id,contract_profile_id,provider_party_id,partner_party_id)
 references factact.service_request_channels(tenant_id,service_id,contract_profile_id,provider_party_id,partner_party_id),
 foreign key(tenant_id,parent_work_id,service_id,contract_profile_id)
 references factact.work(tenant_id,id,service_id,contract_profile_id),
 foreign key(tenant_id,created_by_operator_id) references factact.operators(tenant_id,id)
);
create table factact.service_request_updates (
 id uuid primary key,
 tenant_id uuid not null,
 request_id uuid not null,
 command_id uuid not null,
 revision integer not null check(revision>0),
 previous_status text not null check(previous_status in ('PENDING','IN_PROGRESS')),
 status text not null check(status in ('IN_PROGRESS','COMPLETED')),
 comment text not null check(length(comment)<=4000),
 actor_operator_id uuid not null,
 recorded_at timestamptz not null,
 unique(tenant_id,id),
 unique(tenant_id,request_id,revision),
 unique(tenant_id,request_id,command_id),
 check(status<>'COMPLETED' or length(trim(comment))>0),
 check(status<>previous_status or length(trim(comment))>0),
 foreign key(tenant_id,request_id) references factact.service_requests(tenant_id,id),
 foreign key(tenant_id,actor_operator_id) references factact.operators(tenant_id,id)
);
create index service_requests_listing on factact.service_requests(tenant_id,service_id,contract_profile_id,created_at desc,id desc);
do $$
declare table_name text;
begin
 foreach table_name in array array['service_request_channels','service_request_participants','service_requests','service_request_updates'] loop
  execute format('alter table factact.%I enable row level security',table_name);
  execute format('alter table factact.%I force row level security',table_name);
  execute format('create policy tenant_isolation on factact.%I to factact_runtime using (tenant_id=factact.current_tenant_id()) with check (tenant_id=factact.current_tenant_id())',table_name);
 end loop;
end $$;
-- Foundation only: runtime read access; no publication/update HTTP commands yet.
-- Enable insert only with narrow actor-side transaction adapter in next migration.
grant select on factact.service_request_channels,factact.service_request_participants,
 factact.service_requests,factact.service_request_updates to factact_runtime;
