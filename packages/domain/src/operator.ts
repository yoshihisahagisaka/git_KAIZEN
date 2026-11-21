export type OperatorRole = 'ADMIN' | 'OPERATOR' | 'REVIEWER';

export interface Operator {
  id: string;
  tenantId: string;
  displayName: string;
  tenantName: string;
  roles: OperatorRole[];
  // DB-derived read boundary. Optional only for legacy application/test callers;
  // browser access must fail closed when no explicit mode is supplied.
  readAuthorityMode?: 'SCOPED' | 'INTERNAL_V1';
}

// Authentication supplies identity, never implicit command/Contract Authority.
export function hasRole(operator: Operator, role: OperatorRole): boolean {
  return operator.roles.includes(role);
}
