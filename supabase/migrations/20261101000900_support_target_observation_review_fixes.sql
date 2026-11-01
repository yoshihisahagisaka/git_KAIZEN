-- Review fix: an Observation supersession never crosses Target Contexts.
create or replace function factact.assert_support_target_observation_same_work() returns trigger language plpgsql as $$
begin
 if not exists(select 1 from factact.support_work_device_contexts c where c.tenant_id=new.tenant_id and c.id=new.target_context_id and c.work_id=new.work_id) then
  raise exception 'target context must belong to the same Work' using errcode='23514';
 end if;
 if new.supersedes_observation_id is not null and not exists(
   select 1 from factact.support_work_target_observations p
   where p.tenant_id=new.tenant_id and p.id=new.supersedes_observation_id
     and p.work_id=new.work_id and p.target_context_id=new.target_context_id
 ) then raise exception 'superseded observation must belong to the same Target Context' using errcode='23514'; end if;
 return new;
end $$;
