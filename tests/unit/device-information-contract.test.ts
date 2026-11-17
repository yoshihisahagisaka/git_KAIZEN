import { describe, expect, it } from 'vitest';
import {
  classifyDeviceRow, commitDeviceInformationChange, deviceAssignmentEligibility,
  proposeDeviceFieldVerification, proposeDeviceInformationCorrection,
  proposeDeviceInitialInformation, requireDeviceRegistryGrant, verifyDeviceInformationChange,
} from '../../packages/application/src/device-information-contract.js';
import type {
  DeviceAuthorizedContext, DeviceInformationChange, DeviceInformationSource,
  DeviceRegistryOperation, DeviceScopedGrant, RegisteredDeviceInformation,
} from '../../packages/domain/src/device-information.js';

// Strictly synthetic: two customer Organizations share one Tenant and Service.
const now = '2026-11-17T09:00:00.000Z';
const tenant = 'synthetic-tenant';
const service = 'synthetic-service';
const contract = 'synthetic-contract';
const organizationA = 'synthetic-customer-A';
const organizationB = 'synthetic-customer-B';
const allOperations: DeviceRegistryOperation[] = ['READ','CREATE','UPDATE','REVIEW','APPROVE'];

function context(actorId: string, organizationId = organizationA, workId?: string): DeviceAuthorizedContext {
  return {actorId,tenantId:tenant,serviceId:service,contractProfileId:contract,
    serviceRecipientId:organizationId === organizationA ? 'recipient-A' : 'recipient-B',
    organizationId,...(workId ? {workId} : {}),actorActive:true,serviceActive:true,contractActive:true,recipientActive:true};
}

function grant(actor: DeviceAuthorizedContext, operations = allOperations,
  options: Partial<DeviceScopedGrant> = {}): DeviceScopedGrant {
  return {actorId:actor.actorId,tenantId:tenant,serviceId:service,contractProfileId:contract,
    serviceRecipientId:actor.serviceRecipientId,workId:null,scopeKind:'SERVICE_RECIPIENT',objectKind:'REGISTRY',
    operations,status:'ACTIVE',effectiveFrom:'2026-11-01T00:00:00.000Z',effectiveUntil:null,...options};
}

const sheet: DeviceInformationSource = {kind:'CUSTOMER_REGISTER',evidenceId:'evidence-sheet-sha256',
  locator:'sheet=Assets;row=3',observedAt:'2026-11-16T08:00:00.000Z'};
const support: DeviceInformationSource = {kind:'SUPPORT_WORK',evidenceId:'evidence-actual-label',
  locator:'observation-id=ob-01;field=assetTag',observedAt:'2026-11-17T08:00:00.000Z',workId:'work-A'};
const inventory: DeviceInformationSource = {kind:'PHYSICAL_INVENTORY',evidenceId:'evidence-inventory-01',
  locator:'inventory-check=01',observedAt:'2026-11-17T08:30:00.000Z'};

let next = 0;
function ids(deviceId = 'synthetic-device') {const n = ++next; return {id:`change-${n}`,requestId:`request-${n}`,deviceId};}

function firstDevice(organizationId = organizationA): RegisteredDeviceInformation {
  const proposer = context('operator',organizationId), reviewer = context('reviewer',organizationId);
  const proposed = proposeDeviceInitialInformation(proposer,[grant(proposer)],now,ids(),
    {assetTag:'PC-018',displayName:'営業部PC',serialNumber:'SN-991',source:sheet});
  const verified = verifyDeviceInformationChange(reviewer,[grant(reviewer)],now,proposed);
  return commitDeviceInformationChange(reviewer,[grant(reviewer)],now,verified,null).device;
}

function reviewed(change: DeviceInformationChange, reviewer: DeviceAuthorizedContext) {
  return verifyDeviceInformationChange(reviewer,[grant(reviewer)],now,change);
}

describe('Device initial information: independent synthetic Product contract', () => {
  it('acceptance A1: human-approved source registration is NOT real-world verification', () => {
    const device = firstDevice();
    expect(device).toMatchObject({tenantId:tenant,organizationId:organizationA,revision:1,
      operationalStatus:{value:'UNKNOWN',verification:null}});
    expect(device.fields.assetTag).toMatchObject({value:'PC-018',source:sheet,verification:null});
    expect(device.fields.serialNumber?.verification).toBeNull();
    expect(deviceAssignmentEligibility(device,tenant,organizationA,false)).toBe('DENIED');
  });

  it('A2: cannot infer operational AVAILABLE from customer sheet label 利用中', () => {
    const device = firstDevice();
    expect(device.operationalStatus.value).toBe('UNKNOWN');
    expect(() => proposeDeviceFieldVerification(context('operator'),[grant(context('operator'))],now,
      ids(device.id),device,'deviceStatus','利用中',inventory)).toThrowError(/業務状態/);
  });

  it('A3: same tag in different customer Organizations is not the same Device', () => {
    const device = firstDevice();
    expect(classifyDeviceRow({tenantId:tenant,organizationId:organizationB,assetTag:'PC-018',displayName:'別企業PC'},[device])).toBe('NEW');
    expect(classifyDeviceRow({tenantId:tenant,organizationId:organizationA,assetTag:'PC-018',displayName:'営業部PC',serialNumber:'SN-991'},[device])).toBe('UNCHANGED');
    expect(classifyDeviceRow({tenantId:tenant,organizationId:organizationA,assetTag:'PC-018',displayName:'営業部PC(更新)',serialNumber:'SN-991'},[device])).toBe('UPDATE');
  });

  it('A4: missing, duplicated, conflicting asset identity fails closed into review', () => {
    const device = firstDevice();
    expect(classifyDeviceRow({tenantId:tenant,organizationId:organizationA,assetTag:'',displayName:'Unknown'},[device])).toBe('REVIEW');
    expect(classifyDeviceRow({tenantId:tenant,organizationId:organizationA,assetTag:'PC-020',displayName:'Other',serialNumber:'SN-991'},[device])).toBe('REVIEW');
    expect(classifyDeviceRow({tenantId:tenant,organizationId:organizationA,assetTag:'PC-020',displayName:'Other'},[device],['PC-020','PC-020'])).toBe('REVIEW');
  });

  it('A5: cross-customer ID, grant, recipient, even within same Tenant/Service, cannot READ', () => {
    const a = context('operator',organizationA), b = context('operator',organizationB);
    expect(() => requireDeviceRegistryGrant(b,[grant(a)],'READ',now,tenant,organizationB)).toThrowError();
    expect(() => requireDeviceRegistryGrant(a,[grant(a)],'READ',now,'foreign-tenant',organizationA)).toThrowError();
    expect(() => requireDeviceRegistryGrant(a,[grant(a)],'READ',now,tenant,organizationB)).toThrowError();
  });

  it('A6: SERVICE-only broad grant, revoked grant, expired grant, inactive context all deny', () => {
    const a = context('operator');
    for (const options of [
      {scopeKind:'SERVICE' as const,serviceRecipientId:null},
      {status:'REVOKED' as const},
      {effectiveUntil:'2026-11-16T00:00:00.000Z'},
    ]) expect(() => requireDeviceRegistryGrant(a,[grant(a,allOperations,options)],'READ',now,tenant,organizationA)).toThrowError();
    expect(() => requireDeviceRegistryGrant({...a,recipientActive:false},[grant(a)],'READ',now,tenant,organizationA)).toThrowError();
  });

  it('A7: WORK grant requires exact real Work; absent Work cannot silently grant authority', () => {
    const a = context('operator',organizationA,'work-A');
    const workGrant = grant(a,['UPDATE'],{scopeKind:'WORK',workId:'work-A'});
    requireDeviceRegistryGrant(a,[workGrant],'UPDATE',now,tenant,organizationA);
    expect(() => requireDeviceRegistryGrant(context('operator'),[workGrant],'UPDATE',now,tenant,organizationA)).toThrowError();
  });

  it('A8: proposal, human review and commit are distinct; no early Registry mutation', () => {
    const a = context('operator'), b = context('reviewer');
    const proposed = proposeDeviceInitialInformation(a,[grant(a,['CREATE'])],now,ids(),
      {assetTag:'PC-018',displayName:'営業部PC',source:sheet});
    expect(proposed.status).toBe('PROPOSED');
    expect(() => commitDeviceInformationChange(b,[grant(b)],now,proposed,null)).toThrowError();
    const verified = verifyDeviceInformationChange(b,[grant(b,['REVIEW'])],now,proposed);
    expect(verified.status).toBe('VERIFIED');
    const result = commitDeviceInformationChange(b,[grant(b,['APPROVE'])],now,verified,null);
    expect(result.change.status).toBe('COMMITTED');
    expect(result.device.fields.assetTag.verification).toBeNull();
  });

  it('A9: two distinct human actors; roles or CREATE grant never substitute REVIEW/APPROVE', () => {
    const a = context('operator'), b = context('reviewer');
    const change = proposeDeviceInitialInformation(a,[grant(a,['CREATE'])],now,ids(),
      {assetTag:'PC-018',displayName:'営業部PC',source:sheet});
    expect(() => verifyDeviceInformationChange(a,[grant(a)],now,change)).toThrowError();
    expect(() => verifyDeviceInformationChange(b,[grant(b,['CREATE'])],now,change)).toThrowError();
    const verified = reviewed(change,b);
    expect(() => commitDeviceInformationChange(a,[grant(a)],now,verified,null)).toThrowError();
    expect(() => commitDeviceInformationChange(b,[grant(b,['REVIEW'])],now,verified,null)).toThrowError();
  });

  it('A10: stale device revision and mismatched Device ID must not overwrite', () => {
    const device = firstDevice(), a = context('operator'), b = context('reviewer');
    const proposed = proposeDeviceInformationCorrection(a,[grant(a)],now,ids(device.id),device,
      {displayName:{value:'営業一課PC',source:sheet}});
    const verified = reviewed(proposed,b);
    expect(() => commitDeviceInformationChange(b,[grant(b)],now,verified,{...device,revision:2})).toThrowError();
    expect(() => proposeDeviceInformationCorrection(a,[grant(a)],now,ids('forged-id'),device,
      {displayName:{value:'偽情報',source:sheet}})).toThrowError();
  });

  it('A11: corrections reset verification of changed field only and preserve other fields', () => {
    const base = firstDevice(), a = context('operator',organizationA,'work-A'), b = context('reviewer',organizationA,'work-A');
    const confirm = proposeDeviceFieldVerification(a,[grant(a)],now,ids(base.id),base,'assetTag','PC-018',support);
    const checked = commitDeviceInformationChange(b,[grant(b)],now,reviewed(confirm,b),base).device;
    const corrected = proposeDeviceInformationCorrection(context('operator'),[grant(context('operator'))],now,
      ids(checked.id),checked,{displayName:{value:'営業一課PC',source:sheet}});
    const next = commitDeviceInformationChange(context('reviewer'),[grant(context('reviewer'))],now,
      reviewed(corrected,context('reviewer')),checked).device;
    expect(next.fields.assetTag.verification).toBeTruthy();
    expect(next.fields.displayName).toMatchObject({value:'営業一課PC',verification:null});
    expect(next.fields.serialNumber?.verification).toBeNull();
    expect(next.operationalStatus.value).toBe('UNKNOWN');
  });

  it('A12: SUPPORT source checks only the observed field, not serial/user/location/Relation', () => {
    const device = firstDevice(), a = context('operator',organizationA,'work-A'), b = context('reviewer',organizationA,'work-A');
    const proposed = proposeDeviceFieldVerification(a,[grant(a)],now,ids(device.id),device,'assetTag','PC-018',support);
    const next = commitDeviceInformationChange(b,[grant(b)],now,reviewed(proposed,b),device).device;
    expect(next.fields.assetTag.verification?.source).toEqual(support);
    expect(next.fields.displayName.verification).toBeNull();
    expect(next.fields.serialNumber?.verification).toBeNull();
    expect(next.operationalStatus.verification).toBeNull();
  });

  it('A13: merely reading customer register or selecting Work target cannot verify reality', () => {
    const device = firstDevice(), a = context('operator',organizationA,'work-A');
    expect(() => proposeDeviceFieldVerification(a,[grant(a)],now,ids(device.id),device,'assetTag','PC-018',sheet)).toThrowError();
    expect(() => proposeDeviceFieldVerification(a,[grant(a)],now,ids(device.id),device,'assetTag','PC-018',
      {...support,workId:'other-work'})).toThrowError();
    expect(() => proposeDeviceFieldVerification(a,[grant(a)],now,ids(device.id),device,'assetTag','PC-018',
      {...support,evidenceId:''})).toThrowError();
  });

  it('A14: observation mismatch becomes correction, never auto verification', () => {
    const device = firstDevice(), a = context('operator',organizationA,'work-A');
    expect(() => proposeDeviceFieldVerification(a,[grant(a)],now,ids(device.id),device,'serialNumber','SN-992',support))
      .toThrowError();
    expect(device.fields.serialNumber?.verification).toBeNull();
  });

  it('A15: explicit verified AVAILABLE plus verified identity and no Relation is necessary for JOIN', () => {
    const initial = firstDevice(), a = context('operator',organizationA,'work-A'), b = context('reviewer',organizationA,'work-A');
    const identify = proposeDeviceFieldVerification(a,[grant(a)],now,ids(initial.id),initial,'assetTag','PC-018',support);
    const identified = commitDeviceInformationChange(b,[grant(b)],now,reviewed(identify,b),initial).device;
    expect(deviceAssignmentEligibility(identified,tenant,organizationA,false)).toBe('DENIED');
    const status = proposeDeviceFieldVerification(a,[grant(a)],now,ids(initial.id),identified,'deviceStatus','AVAILABLE',inventory);
    const available = commitDeviceInformationChange(b,[grant(b)],now,reviewed(status,b),identified).device;
    expect(deviceAssignmentEligibility(available,tenant,organizationA,false)).toBe('ELIGIBLE');
    expect(deviceAssignmentEligibility(available,tenant,organizationB,false)).toBe('DENIED');
    expect(deviceAssignmentEligibility(available,tenant,organizationA,true)).toBe('DENIED');
  });

  it('A16: no caller-supplied role or source may bypass revoked grant at Commit', () => {
    const a = context('operator'), b = context('reviewer');
    const p = proposeDeviceInitialInformation(a,[grant(a)],now,ids(),{assetTag:'PC-018',displayName:'営業部PC',source:sheet});
    const verified = reviewed(p,b);
    expect(() => commitDeviceInformationChange(b,[grant(b,allOperations,{status:'REVOKED'})],now,verified,null)).toThrowError();
  });

  it('A17: replay with stale expectedRevision is denied rather than creating a second update', () => {
    const base = firstDevice(), a=context('operator'), b=context('reviewer');
    const p=proposeDeviceInformationCorrection(a,[grant(a)],now,ids(base.id),base,
      {displayName:{value:'営業一課PC',source:sheet}});
    const v=reviewed(p,b), committed=commitDeviceInformationChange(b,[grant(b)],now,v,base);
    expect(() => commitDeviceInformationChange(b,[grant(b)],now,v,committed.device)).toThrowError();
  });

  it('A18: forged REVIEWED status cannot omit second actor or verification timestamp', () => {
    const a=context('operator'),b=context('reviewer');
    const p=proposeDeviceInitialInformation(a,[grant(a)],now,ids(),
      {assetTag:'PC-018',displayName:'営業部PC',source:sheet});
    const forged={...p,status:'VERIFIED' as const,verifiedByActorId:a.actorId,verifiedAt:now};
    expect(() => commitDeviceInformationChange(b,[grant(b)],now,forged,null)).toThrowError();
    expect(() => commitDeviceInformationChange(b,[grant(b)],now,
      {...forged,verifiedByActorId:b.actorId,verifiedAt:null},null)).toThrowError();
  });

  it('A19: existing Device in customer A must not be corrected under customer B scope', () => {
    const device=firstDevice(), b=context('operator',organizationB);
    expect(() => proposeDeviceInformationCorrection(b,[grant(b)],now,ids(device.id),device,
      {displayName:{value:'別会社PC',source:sheet}})).toThrowError();
  });
});
