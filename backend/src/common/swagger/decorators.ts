/**
 * Reusable Swagger decorators for common response patterns.
 *
 * Usage:
 *   @ApiAuth()           — adds Bearer auth + 401 response
 *   @ApiForbidden()      — adds 403 response
 *   @ApiNotFound('Group')— adds 404 response
 *   @ApiConflict(...)    — adds 409 response
 *   @ApiErrors(...codes) — adds multiple error responses at once
 */

import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

// ─── Individual error responses ──────────────────────────────────────────────

export function ApiUnauthorized() {
  return ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' });
}

export function ApiForbiddenResponse(description = 'Insufficient permissions or not a group member') {
  return ApiResponse({ status: 403, description });
}

export function ApiNotFoundResponse(entity = 'Resource') {
  return ApiResponse({ status: 404, description: `${entity} not found` });
}

export function ApiConflictResponse(description = 'Resource already exists') {
  return ApiResponse({ status: 409, description });
}

export function ApiValidationResponse() {
  return ApiResponse({ status: 422, description: 'Validation failed — check request body' });
}

// ─── Composite decorators ─────────────────────────────────────────────────────

/**
 * Marks an endpoint as requiring Bearer JWT authentication.
 * Adds @ApiBearerAuth + 401 response automatically.
 */
export function ApiAuth() {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiUnauthorized(),
  );
}

/**
 * Shorthand for common group-scoped endpoint errors.
 * Adds 401 (unauth) + 403 (not a member) + 404 (group not found).
 */
export function ApiGroupErrors() {
  return applyDecorators(
    ApiUnauthorized(),
    ApiForbiddenResponse('Not a member of this group'),
    ApiNotFoundResponse('Group'),
  );
}

/**
 * Generic 200 OK response description.
 */
export function ApiOk(description: string) {
  return ApiResponse({ status: 200, description });
}

/**
 * Generic 201 Created response description.
 */
export function ApiCreated(description: string) {
  return ApiResponse({ status: 201, description });
}
