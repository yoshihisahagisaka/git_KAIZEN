// Device initial information is a source-backed Registry claim, not a verified
// real-world FACT. This bounded contract intentionally adds no generic Fact type.

export type DeviceInformationField = 'assetTag' | 'displayName' | 'serialNumber';
export type DeviceOperationalStatus = 'UNKNOWN' | 'AVAILABLE' | 'UNAVAILABLE' | 'RETIRED';
export type DeviceChangeKind = 'INITIAL_INFORMATION' | 'INFORMATION_CORRECTION' | 'FIELD_VERIFICATION';
export type DeviceChangeStatus = 'PROPOSED' | 'VERIFIED' | 'COMMITTED' | 'REJECTED';
export type DeviceSourceKind = 'CUSTOMER_REGISTER' | 'SUPPORT_WORK' | 'PHYSICAL_INVENTORY' | 'TRUSTED_SYSTEM';

export interface DeviceInformationSource {
  kind: DeviceSourceKind;
  evidenceId: string;
  // Opaque source row or observation reference; do not retain a whole spreadsheet here.
  locator: string;
  observedAt: string;
  workId?: string;
}

export interface DeviceFieldVerification {
  actorId: string;
  verifiedAt: string;
  source: DeviceInformationSource;
}

export interface DeviceFieldInformation {
  value: string;
  source: DeviceInformationSource;
  verification: DeviceFieldVerification | null;
}

export interface RegisteredDeviceInformation {
  id: string;
  tenantId: string;
  organizationId: string;
  revision: number;
  fields: {
    assetTag: DeviceFieldInformation;
    displayName: DeviceFieldInformation;
    serialNumber?: DeviceFieldInformation;
  };
  operationalStatus: {
    value: DeviceOperationalStatus;
    verification: DeviceFieldVerification | null;
  };
}

export interface DeviceFieldInput {
  value: string;
  source: DeviceInformationSource;
}

// These are scoped, server-resolved authorization inputs, not claims from the
// browser. The persistence adapter must resolve them from live grants/relations.
export interface DeviceAuthorizedContext {
  actorId: string;
  tenantId: string;
  serviceId: string;
  contractProfileId: string;
  serviceRecipientId: string;
  organizationId: string;
  workId?: string;
  actorActive: boolean;
  serviceActive: boolean;
  contractActive: boolean;
  recipientActive: boolean;
}

export type DeviceRegistryOperation = 'READ' | 'CREATE' | 'UPDATE' | 'REVIEW' | 'APPROVE';
export interface DeviceScopedGrant {
  actorId: string;
  tenantId: string;
  serviceId: string;
  contractProfileId: string;
  serviceRecipientId: string | null;
  workId: string | null;
  scopeKind: 'SERVICE' | 'SERVICE_RECIPIENT' | 'WORK';
  objectKind: 'REGISTRY';
  operations: DeviceRegistryOperation[];
  status: 'ACTIVE' | 'REVOKED';
  effectiveFrom: string;
  effectiveUntil: string | null;
}

export interface DeviceChangeBase {
  id: string;
  requestId: string;
  kind: DeviceChangeKind;
  status: DeviceChangeStatus;
  tenantId: string;
  organizationId: string;
  serviceId: string;
  contractProfileId: string;
  serviceRecipientId: string;
  workId: string | null;
  deviceId: string;
  expectedRevision: number;
  proposedByActorId: string;
  proposedAt: string;
  verifiedByActorId: string | null;
  verifiedAt: string | null;
  committedByActorId: string | null;
  committedAt: string | null;
}

export type DeviceInformationChange = DeviceChangeBase & (
  | { kind: 'INITIAL_INFORMATION'; effect: { assetTag: DeviceFieldInput; displayName: DeviceFieldInput; serialNumber?: DeviceFieldInput } }
  | { kind: 'INFORMATION_CORRECTION'; effect: { changes: Partial<Record<DeviceInformationField, DeviceFieldInput>> } }
  | { kind: 'FIELD_VERIFICATION'; effect: { field: DeviceInformationField | 'deviceStatus'; observedValue: string; verificationSource: DeviceInformationSource } }
);
