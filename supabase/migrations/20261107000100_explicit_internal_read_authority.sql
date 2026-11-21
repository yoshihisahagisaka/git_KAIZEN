-- Read Authority v1 is an INTERNAL-only, tenant-wide legacy permission model.
-- It must never follow a new Actor from Tenant membership or assigned Role alone.
-- New Operators default to explicit scoped authority, independent of employer type.
alter table factact.operators
  add column read_authority_mode text not null default 'SCOPED'
    check (read_authority_mode in ('SCOPED','INTERNAL_V1'));

-- All existing Role-bearing Operators were already in the internal-only v1
-- authorization model. Preserve that existing behavior, with an explicit marker.
-- Production cutover must inventory these pre-existing Operators before approval.
update factact.operators o
  set read_authority_mode='INTERNAL_V1'
  where exists (
    select 1 from factact.operator_roles r
    where r.tenant_id=o.tenant_id and r.operator_id=o.id
  );

comment on column factact.operators.read_authority_mode is
  'INTERNAL_V1 enables the existing tenant-wide Role authorization for reviewed Operators only; SCOPED requires explicit Service/Recipient/Work grants. Not inferred from employer, Caller, or Tenant membership.';
