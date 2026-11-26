-- Shared phone contact hints, never authentication or automatic beneficiary confirmation.
-- Provisioning remains controlled; runtime has read-only access in this slice.
create table factact.contact_points (
 id uuid primary key, tenant_id uuid not null,
 organization_id uuid, person_id uuid,
 display_phone text not null check(length(trim(display_phone)) between 1 and 80),
 normalized_phone text not null check(normalized_phone ~ '^0[1-9][0-9]{8,9}$'),
 source text not null check(length(trim(source)) between 1 and 200),
 observed_at timestamptz not null,
 verification_state text not null check(verification_state in ('UNVERIFIED','VERIFIED')),
 verified_at timestamptz,
 check((organization_id is null) <> (person_id is null)),
 check((verification_state='VERIFIED')=(verified_at is not null)),
 check(verified_at is null or verified_at>=observed_at),
 foreign key(tenant_id,organization_id) references factact.organizations(tenant_id,id),
 foreign key(tenant_id,person_id) references factact.people(tenant_id,id)
);
create unique index contact_points_org_phone on factact.contact_points(tenant_id,organization_id,normalized_phone) where organization_id is not null;
create unique index contact_points_person_phone on factact.contact_points(tenant_id,person_id,normalized_phone) where person_id is not null;
create index contact_points_phone_lookup on factact.contact_points(tenant_id,normalized_phone);
alter table factact.contact_points enable row level security;
alter table factact.contact_points force row level security;
create policy tenant_isolation on factact.contact_points to factact_runtime
 using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select on factact.contact_points to factact_runtime;
