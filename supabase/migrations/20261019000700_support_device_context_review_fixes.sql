-- Context-01 review fixes. 00600 has not been applied to Production; this is additive
-- so an already-applied local/test database remains forward-migratable.
create function factact.assert_support_device_context_same_work() returns trigger language plpgsql as $$
begin
 if new.supersedes_context_id is not null and not exists (
   select 1 from factact.support_work_device_contexts previous
   where previous.tenant_id=new.tenant_id and previous.id=new.supersedes_context_id and previous.work_id=new.work_id
 ) then raise exception 'superseded context must belong to the same Work' using errcode='23514'; end if;
 return new;
end $$;
create trigger support_device_context_same_work before insert on factact.support_work_device_contexts
 for each row execute function factact.assert_support_device_context_same_work();
