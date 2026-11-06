-- Add Organization as a Service Recipient without reinterpreting Person recipients.
-- A Caller Person, actual Service Recipient, and authorized Actor remain distinct.
-- Preserve the existing recipient_id Person FK and JOIN/SUPPORT links.

alter table factact.service_recipients
  add column recipient_organization_id uuid;

alter table factact.service_recipients
  alter column recipient_id drop not null;

alter table factact.service_recipients
  drop constraint service_recipients_recipient_type_check;

alter table factact.service_recipients
  add constraint service_recipients_kind_exactly_one_check check (
    (recipient_type = 'PERSON' and recipient_id is not null and recipient_organization_id is null)
    or
    (recipient_type = 'ORGANIZATION' and recipient_id is null and recipient_organization_id is not null)
  );

alter table factact.service_recipients
  add constraint service_recipients_organization_tenant_fk
  foreign key (tenant_id, recipient_organization_id)
  references factact.organizations (tenant_id, id);

create unique index service_recipients_one_organization_per_service
  on factact.service_recipients (tenant_id, service_id, recipient_organization_id)
  where recipient_type = 'ORGANIZATION';

-- Existing FORCE RLS, tenant policies, Service FKs and runtime privileges stay intact.
