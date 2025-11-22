import { Request } from 'express';

/**
 * Extract Cognito Identity ID from request context
 */
export function getCognitoIdentityId(req: Request): string {
  const cognitoIdentityId =
    req.headers['x-cognito-identity-id'] ||
    (req as any).apiGateway?.event?.requestContext?.identity?.cognitoIdentityId;

  if (!cognitoIdentityId) {
    throw new Error('Cognito Identity ID not found in request');
  }

  return cognitoIdentityId as string;
}

/**
 * Extract Cognito User ID (sub) from request context
 */
export function getCognitoUserId(req: Request): string {
  const claims = (req as any).apiGateway?.event?.requestContext?.authorizer?.claims;

  if (!claims || !claims.sub) {
    throw new Error('Cognito User ID not found in request');
  }

  return claims.sub;
}

/**
 * Check if user is in admin group
 */
export function isAdmin(req: Request): boolean {
  const groups =
    (req as any).apiGateway?.event?.requestContext?.authorizer?.claims?.['cognito:groups'];

  if (!groups) {
    return false;
  }

  const groupArray = Array.isArray(groups) ? groups : [groups];
  return groupArray.includes('Admins');
}

/**
 * Extract user groups from request
 */
export function getUserGroups(req: Request): string[] {
  const groups =
    (req as any).apiGateway?.event?.requestContext?.authorizer?.claims?.['cognito:groups'];

  if (!groups) {
    return [];
  }

  return Array.isArray(groups) ? groups : [groups];
}
