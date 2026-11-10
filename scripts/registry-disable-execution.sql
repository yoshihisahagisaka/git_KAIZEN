-- FACTACT Registry fail-closed disablement ONLY. DO NOT EXECUTE without
-- explicit production authorization and a verified backup/maintenance plan.
-- This is NOT a destructive schema rollback: it retains the role, RLS,
-- Change, Registry source and Audit history. It disables runtime RPC entry.
-- Migration/owner management privileges are mandatory; a failure rolls back.

begin;

do $preflight$
begin
  if not exists(select 1 from pg_roles
    where rolname='factact_registry_executor' and not rolcanlogin
      and not rolsuper and not rolbypassrls)
   or (select count(*) from pg_proc p
     where p.proowner='factact_registry_executor'::regrole
       and p.oid=any(array[
         'factact.registry_propose_display_name(uuid,uuid,uuid,uuid,uuid,uuid,text,text,bigint)'::regprocedure,
         'factact.registry_verify_display_name(uuid,uuid,uuid,text)'::regprocedure,
         'factact.registry_commit_display_name(uuid,uuid,uuid)'::regprocedure
       ]))<>3
   or (to_regprocedure('factact.registry_return_display_name(uuid,uuid,uuid,text)') is not null
     and not exists(select 1 from pg_proc p
       where p.oid=to_regprocedure('factact.registry_return_display_name(uuid,uuid,uuid,text)')
         and p.proowner='factact_registry_executor'::regrole)) then
    raise exception 'Registry executor ownership preflight failed' using errcode='42501';
  end if;
end $preflight$;

-- Temporary membership is never committed; no owner transfer is required.
grant factact_registry_executor to current_user;
set local role factact_registry_executor;

revoke execute on function
  factact.registry_propose_display_name(uuid,uuid,uuid,uuid,uuid,uuid,text,text,bigint),
  factact.registry_verify_display_name(uuid,uuid,uuid,text),
  factact.registry_commit_display_name(uuid,uuid,uuid)
from factact_runtime,public;

-- A partially installed or older base Registry needs the same fail-closed
-- escape hatch. Disable the return RPC if its separate Gate was installed.
do $return_disable$
begin
  if to_regprocedure('factact.registry_return_display_name(uuid,uuid,uuid,text)') is not null then
    execute 'revoke execute on function factact.registry_return_display_name(uuid,uuid,uuid,text) from factact_runtime,public';
  end if;
end $return_disable$;

do $verify$
begin
  if has_function_privilege('factact_runtime',
      'factact.registry_propose_display_name(uuid,uuid,uuid,uuid,uuid,uuid,text,text,bigint)','EXECUTE')
    or has_function_privilege('factact_runtime',
      'factact.registry_verify_display_name(uuid,uuid,uuid,text)','EXECUTE')
    or has_function_privilege('factact_runtime',
      'factact.registry_commit_display_name(uuid,uuid,uuid)','EXECUTE')
    or (to_regprocedure('factact.registry_return_display_name(uuid,uuid,uuid,text)') is not null
      and has_function_privilege('factact_runtime',
        to_regprocedure('factact.registry_return_display_name(uuid,uuid,uuid,text)'),
        'EXECUTE')) then
    raise exception 'Registry runtime entry remains enabled' using errcode='42501';
  end if;
end $verify$;

reset role;
revoke factact_registry_executor from current_user;
commit;

-- Operator must separately read back role membership, function ACL and
-- live traffic after this COMMIT. No automatic retry if result is unknown.
