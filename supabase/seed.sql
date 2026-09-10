-- Deterministic synthetic development prerequisites. No Event, Work, Change or Relation outcomes.
-- Run only against a disposable development database, through `supabase db reset --local`.
insert into factact.tenants (id,name,status,created_at,updated_at) values
('10000000-0000-4000-8000-000000000001','atLIB Development','ACTIVE','2026-09-09Z','2026-09-09Z');
insert into factact.operators (id,tenant_id,email,display_name,status,created_at,updated_at) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','operator@example.invalid','開発オペレーター','ACTIVE','2026-09-09Z','2026-09-09Z');
insert into factact.operator_roles values
('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','ADMIN'),
('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','OPERATOR'),
('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','REVIEWER');
insert into factact_private.operator_identities values
('https://seed.example.invalid','development-operator','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001');
insert into factact.organizations (id,tenant_id,name,status,created_at,updated_at) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Example株式会社','ACTIVE','2026-09-09Z','2026-09-09Z');
insert into factact.people (id,tenant_id,organization_id,display_name,lifecycle_status,created_at,updated_at) values
('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','田中 一郎','JOINING','2026-09-09Z','2026-09-09Z');
insert into factact.devices (id,tenant_id,asset_tag,display_name,device_status,created_at,updated_at) values
('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','PC-0073','標準会社PC','AVAILABLE','2026-09-09Z','2026-09-09Z');
insert into factact.services (id,tenant_id,organization_id,service_model_code,name,status,created_at,updated_at) values
('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','JOSYS_KAIZEN','情シスKAIZEN','ACTIVE','2026-09-09Z','2026-09-09Z');
insert into factact.contract_profiles (id,tenant_id,service_id,version,effective_from,status,configuration_json,created_at) values
('70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001',1,'2026-09-09Z','ACTIVE',
'{"support":{"enabled":true,"executeRoles":["OPERATOR"]},"requirements":{"COMPANY_PC":{"policy":"REQUIRED","basis":"契約範囲として会社PCの準備・割当を必要とする"}},"deviceAssignment":{"executeRoles":["OPERATOR"],"reviewRoles":["REVIEWER"],"allowSelfReview":true}}', '2026-09-09Z');
