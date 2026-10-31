export type OperatorRole = 'ADMIN' | 'OPERATOR' | 'REVIEWER';

export interface Operator {
  id: string;
  tenantId: string;
  displayName: string;
  tenantName: string;
  roles: OperatorRole[];
}

// Authentication supplies identity, never implicit command/Contract Authority.
export function hasRole(operator: Operator, role: OperatorRole): boolean {
  return operator.roles.includes(role);
}
