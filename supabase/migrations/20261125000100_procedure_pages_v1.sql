-- P0-C: simple service/common procedure pages, never Knowledge Candidates or Registry Facts.
-- Forward-only, no document store/CMS and no publication by migration.
begin;

create table factact.procedure_pages (
 id uuid primary key,
 tenant_id uuid not null references factact.tenants(id),
 scope_kind text not null check (scope_kind in ('COMMON','SERVICE')),
 service_id uuid,
 category text not null check (category in ('SCRIPT','PROCEDURE','FAQ')),
 title text not null check (length(trim(title)) between 1 and 160),
 body_text text not null check (length(trim(body_text))>0 and octet_length(body_text)<=12288),
 status text not null default 'DRAFT' check (status in ('DRAFT','PUBLISHED','HIDDEN')),
 sort_order integer not null default 0,
 revision integer not null default 1 check (revision>=1),
 created_at timestamptz not null default now(),
 created_by_operator_id uuid not null,
 updated_at timestamptz not null default now(),
 updated_by_operator_id uuid not null,
 unique(tenant_id,id),
 constraint procedure_pages_scope check (
   (scope_kind='COMMON' and service_id is null)
    or (scope_kind='SERVICE' and service_id is not null)
 ),
 foreign key (tenant_id,service_id) references factact.services(tenant_id,id),
 foreign key (tenant_id,created_by_operator_id) references factact.operators(tenant_id,id),
 foreign key (tenant_id,updated_by_operator_id) references factact.operators(tenant_id,id)
);

create index procedure_pages_service_listing
 on factact.procedure_pages(tenant_id,service_id,status,category,sort_order,id);
create index procedure_pages_common_listing
 on factact.procedure_pages(tenant_id,status,category,sort_order,id)
 where scope_kind='COMMON';

-- Immutable audit source, NOT a document version-management UI.
create table factact.procedure_page_edits (
 id uuid primary key,
 tenant_id uuid not null,
 page_id uuid not null,
 request_id uuid not null,
 command_hash text not null check(command_hash ~ '^[0-9a-f]{64}$'),
 actor_operator_id uuid not null,
 occurred_at timestamptz not null default now(),
 kind text not null check(kind in ('CREATED','UPDATED','PUBLISHED','HIDDEN')),
 previous_title text,
 previous_body_text text,
 previous_status text,
 revision integer not null check(revision>=1),
 reason text not null check(length(trim(reason)) between 1 and 1000),
 unique(tenant_id,id),
 unique(tenant_id,request_id),
 foreign key(tenant_id,page_id) references factact.procedure_pages(tenant_id,id),
 foreign key(tenant_id,actor_operator_id) references factact.operators(tenant_id,id)
);

create index procedure_page_edits_page_history
 on factact.procedure_page_edits(tenant_id,page_id,revision);

alter table factact.procedure_pages enable row level security;
alter table factact.procedure_pages force row level security;
create policy tenant_isolation on factact.procedure_pages to factact_runtime
 using(tenant_id=factact.current_tenant_id())
 with check(tenant_id=factact.current_tenant_id());

alter table factact.procedure_page_edits enable row level security;
alter table factact.procedure_page_edits force row level security;
create policy tenant_isolation on factact.procedure_page_edits to factact_runtime
 using(tenant_id=factact.current_tenant_id())
 with check(tenant_id=factact.current_tenant_id());

-- No DELETE, no broad default future-table grant. Runtime must additionally
-- enforce active DB actor/contract/grants before each use in one transaction.
grant select,insert,update(title,body_text,category,sort_order,status,revision,updated_at,updated_by_operator_id)
 on factact.procedure_pages to factact_runtime;
grant select,insert on factact.procedure_page_edits to factact_runtime;

commit;
