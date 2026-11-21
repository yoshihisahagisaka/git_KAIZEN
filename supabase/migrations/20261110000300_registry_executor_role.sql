-- G3 A2: Registry function definitions must exist before the restricted
-- executor is created and receives ownership. Finalization is deferred to
-- 20261110001100_registry_executor_finalization.sql so role creation,
-- temporary authority, ownership transfer, ACLs and cleanup are atomic.
--
-- This Draft Migration has never been approved for Hosted execution. A
-- database that recorded the former 00300 content must be rebuilt or follow a
-- separately reviewed state-aware transition; timestamp repair is forbidden.

do $$
begin
  if to_regrole('factact_registry_executor') is not null then
    raise exception 'Registry executor must not exist before atomic finalization'
      using errcode='55000';
  end if;
end $$;
