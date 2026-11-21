-- Serialize scoped Work mutations with all privileged Grant changes for the
-- same Tenant/Actor, including direct SQL changes. The runtime retains SELECT
-- ONLY on Grant rows and never acquires a Grant-table row UPDATE lock.

create function factact.lock_scoped_actor_authority(p_tenant uuid,p_actor uuid)
returns void language plpgsql volatile as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(
  'factact:scoped-authority:' || p_tenant::text || ':' || p_actor::text,0));
end $$;
revoke all on function factact.lock_scoped_actor_authority(uuid,uuid) from public;
grant execute on function factact.lock_scoped_actor_authority(uuid,uuid) to factact_runtime;

create function factact.lock_scoped_actor_grant_change()
returns trigger language plpgsql as $$
declare old_key text;new_key text;
begin
 if tg_op='INSERT' then
  perform factact.lock_scoped_actor_authority(new.tenant_id,new.actor_operator_id);
  return new;
 elsif tg_op='DELETE' then
  perform factact.lock_scoped_actor_authority(old.tenant_id,old.actor_operator_id);
  return old;
 end if;

 -- Defensive ordering even if a future privileged management operation
 -- changes a Grant's Actor/Tenant rather than revoking/reissuing it.
 old_key:=old.tenant_id::text || ':' || old.actor_operator_id::text;
 new_key:=new.tenant_id::text || ':' || new.actor_operator_id::text;
 if old_key<=new_key then
  perform factact.lock_scoped_actor_authority(old.tenant_id,old.actor_operator_id);
  if old_key<>new_key then
   perform factact.lock_scoped_actor_authority(new.tenant_id,new.actor_operator_id);
  end if;
 else
  perform factact.lock_scoped_actor_authority(new.tenant_id,new.actor_operator_id);
  perform factact.lock_scoped_actor_authority(old.tenant_id,old.actor_operator_id);
 end if;
 return new;
end $$;

create trigger scoped_actor_grant_authority_lock
 before insert or update or delete on factact.scoped_actor_grants
 for each row execute function factact.lock_scoped_actor_grant_change();

-- An Actor can also be deactivated while its existing Grant remains active.
-- Preserve the same commit boundary for this revocation-equivalent operation.
create function factact.lock_scoped_actor_status_change()
returns trigger language plpgsql as $$
begin
 perform factact.lock_scoped_actor_authority(old.tenant_id,old.id);
 return new;
end $$;
create trigger scoped_actor_status_authority_lock
 before update of status on factact.operators
 for each row when (old.status is distinct from new.status)
 execute function factact.lock_scoped_actor_status_change();
