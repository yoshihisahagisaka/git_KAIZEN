-- Runtime writes are append-only; no direct configuration mutation.
-- Serialize changes to channel/participant configuration with request commands.
create function factact.lock_service_request_context(p_tenant uuid,p_service uuid,p_contract uuid)
returns void language sql volatile set search_path=pg_catalog as $$
 select pg_advisory_xact_lock(hashtextextended('factact:request:'||p_tenant::text||':'||p_service::text||':'||p_contract::text,0))
$$;
revoke all on function factact.lock_service_request_context(uuid,uuid,uuid) from public;
grant execute on function factact.lock_service_request_context(uuid,uuid,uuid) to factact_runtime;
create function factact.lock_service_request_configuration()
returns trigger language plpgsql as $$
begin
 if tg_op='INSERT' then
  perform factact.lock_service_request_context(new.tenant_id,new.service_id,new.contract_profile_id);
  return new;
 end if;
 perform factact.lock_service_request_context(old.tenant_id,old.service_id,old.contract_profile_id);
 if tg_op='DELETE' then return old; end if;
 if (old.tenant_id,old.service_id,old.contract_profile_id) is distinct from
    (new.tenant_id,new.service_id,new.contract_profile_id) then
  raise exception 'request configuration context is immutable';
 end if;
 return new;
end $$;
create trigger request_channel_lock before insert or update or delete on factact.service_request_channels
 for each row execute function factact.lock_service_request_configuration();
create trigger request_participant_lock before insert or update or delete on factact.service_request_participants
 for each row execute function factact.lock_service_request_configuration();
grant insert on factact.service_requests,factact.service_request_updates to factact_runtime;
