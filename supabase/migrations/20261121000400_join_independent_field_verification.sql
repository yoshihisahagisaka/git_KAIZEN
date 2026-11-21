-- S3b acceptance fix: JOIN evaluates the latest effective verification for
-- each Device field independently. A later revision of an unrelated field
-- must not erase an earlier current verification.
begin;

do $$ begin
  execute format('grant factact_device_executor to %I with set true, inherit false',current_user);
end $$;
grant create on schema factact to factact_device_executor;
set local role factact_device_executor;

create or replace function factact.join_assignable_devices(
  p_tenant uuid,p_work uuid,p_device uuid,p_lock boolean
) returns table(id uuid,tenant_id uuid,asset_tag text,display_name text,device_status text)
language plpgsql security definer set search_path=pg_catalog as $$
begin
  if p_tenant is distinct from factact.current_tenant_id()
    or p_work is null or (p_lock and p_device is null) then
    raise exception 'invalid JOIN Device scope' using errcode='22023';
  end if;
  if p_lock then
    return query
      select d.id,d.tenant_id,d.asset_tag,d.display_name,d.device_status
      from factact.work w
      join factact.join_events j on j.tenant_id=w.tenant_id and j.id=w.source_event_id
        and j.service_id=w.service_id and j.contract_profile_id=w.contract_profile_id
        and j.service_recipient_id=w.service_recipient_id
      join factact.service_recipients r on r.tenant_id=w.tenant_id
        and r.id=w.service_recipient_id and r.recipient_type='PERSON'
        and r.status='ACTIVE'
      join factact.people p on p.tenant_id=r.tenant_id and p.id=r.recipient_id
      join factact.devices d on d.tenant_id=p.tenant_id and d.organization_id=p.organization_id
      join lateral(select e.event_kind,e.field_value from factact.device_field_events e
        where e.tenant_id=d.tenant_id and e.device_id=d.id
          and e.device_revision<=d.registry_revision and e.field_key='assetTag'
        order by e.device_revision desc,e.recorded_at desc,e.id desc limit 1) asset on true
      join lateral(select e.event_kind,e.field_value from factact.device_field_events e
        where e.tenant_id=d.tenant_id and e.device_id=d.id
          and e.device_revision<=d.registry_revision and e.field_key='deviceStatus'
        order by e.device_revision desc,e.recorded_at desc,e.id desc limit 1) status on true
      where w.tenant_id=p_tenant and w.id=p_work and w.lane='CHANGE'
        and d.id=p_device and d.device_status='AVAILABLE'
        and asset.event_kind='FIELD_VERIFIED' and asset.field_value=d.asset_tag
        and status.event_kind='FIELD_VERIFIED' and status.field_value=d.device_status
        and not exists(select 1 from factact.relations x where x.tenant_id=d.tenant_id
          and x.to_entity_id=d.id and x.status='ACTIVE')
      for update of d;
  else
    return query
      select d.id,d.tenant_id,d.asset_tag,d.display_name,d.device_status
      from factact.work w
      join factact.join_events j on j.tenant_id=w.tenant_id and j.id=w.source_event_id
        and j.service_id=w.service_id and j.contract_profile_id=w.contract_profile_id
        and j.service_recipient_id=w.service_recipient_id
      join factact.service_recipients r on r.tenant_id=w.tenant_id
        and r.id=w.service_recipient_id and r.recipient_type='PERSON'
        and r.status='ACTIVE'
      join factact.people p on p.tenant_id=r.tenant_id and p.id=r.recipient_id
      join factact.devices d on d.tenant_id=p.tenant_id and d.organization_id=p.organization_id
      join lateral(select e.event_kind,e.field_value from factact.device_field_events e
        where e.tenant_id=d.tenant_id and e.device_id=d.id
          and e.device_revision<=d.registry_revision and e.field_key='assetTag'
        order by e.device_revision desc,e.recorded_at desc,e.id desc limit 1) asset on true
      join lateral(select e.event_kind,e.field_value from factact.device_field_events e
        where e.tenant_id=d.tenant_id and e.device_id=d.id
          and e.device_revision<=d.registry_revision and e.field_key='deviceStatus'
        order by e.device_revision desc,e.recorded_at desc,e.id desc limit 1) status on true
      where w.tenant_id=p_tenant and w.id=p_work and w.lane='CHANGE'
        and (p_device is null or d.id=p_device) and d.device_status='AVAILABLE'
        and asset.event_kind='FIELD_VERIFIED' and asset.field_value=d.asset_tag
        and status.event_kind='FIELD_VERIFIED' and status.field_value=d.device_status
        and not exists(select 1 from factact.relations x where x.tenant_id=d.tenant_id
          and x.to_entity_id=d.id and x.status='ACTIVE')
      order by d.asset_tag,d.id;
  end if;
end $$;

reset role;
revoke create on schema factact from factact_device_executor;

do $$ begin
  if (select rolsuper from pg_roles where rolname=current_user) then
    execute format('grant factact_device_executor to %I with admin true, set false, inherit false',current_user);
  else
    execute format('revoke factact_device_executor from %I granted by %I',current_user,current_user);
  end if;
end $$;

commit;
