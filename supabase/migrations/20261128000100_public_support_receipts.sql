-- Unverified public intake, separate from human-confirmed SUPPORT Event and Work.
create table factact.public_support_receipts (
 id uuid primary key,tenant_id uuid not null,service_id uuid not null,
 submission_id uuid not null,received_at timestamptz not null default now(),
 company_name text not null check(length(trim(company_name)) between 1 and 200),
 department text not null check(length(department)<=200),
 contact_name text not null check(length(trim(contact_name)) between 1 and 200),
 email text not null check(length(trim(email)) between 1 and 320),
 phone text not null check(length(trim(phone)) between 1 and 80),
 category text not null check(category in ('PC','NETWORK','PRINTER','PHONE','OTHER')),
 description text not null check(length(trim(description)) between 1 and 4000),
 privacy_notice_version text not null check(length(trim(privacy_notice_version)) between 1 and 100),
 unique(tenant_id,service_id,submission_id),
 foreign key(tenant_id,service_id) references factact.services(tenant_id,id)
);
create index public_support_receipts_recent on factact.public_support_receipts(tenant_id,service_id,received_at desc,id desc);
alter table factact.public_support_receipts enable row level security;
alter table factact.public_support_receipts force row level security;
create policy tenant_isolation on factact.public_support_receipts to factact_runtime
 using(tenant_id=factact.current_tenant_id()) with check(tenant_id=factact.current_tenant_id());
grant select,insert on factact.public_support_receipts to factact_runtime;
