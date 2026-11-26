-- Explicit portal-only account restriction, independent of request participation.
-- Revoking a request grant must not restore access to other business APIs.
alter table factact.operators add column request_portal_only boolean not null default false;
alter table factact.operators add constraint request_portal_only_scoped
 check(not request_portal_only or read_authority_mode='SCOPED');
