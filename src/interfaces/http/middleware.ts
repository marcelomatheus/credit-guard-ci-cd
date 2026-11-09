import { timingSafeEqual, createHash } from 'node:crypto';
import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import type { Logger } from 'pino';
import { ZodError } from 'zod';
import { ApplicationError } from '../../shared/application-error.js';
import { publicUser } from '../../modules/identity/domain/user.js';
import type { PublicUser, TokenService, UserRepository } from '../../modules/identity/domain/user.js';

export function requireDemoAccessKey(expected: string): RequestHandler {
  const expectedHash = createHash('sha256').update(expected).digest();
  return (request, _response, next) => {
    const supplied = request.get('x-demo-access-key') ?? '';
    if (!timingSafeEqual(createHash('sha256').update(supplied).digest(), expectedHash)) {
      throw new ApplicationError('INVALID_DEMO_ACCESS_KEY', 'A valid demo access key is required', 401);
    }
    next();
  };
}

export function requireAuthentication(tokens: TokenService, users: UserRepository): RequestHandler {
  return async (request, response, next) => {
    const header = request.get('authorization');
    if (!header?.startsWith('Bearer ') || header.length > 4096) {
      throw new ApplicationError('AUTHENTICATION_REQUIRED', 'A bearer token is required', 401);
    }
    const id = await tokens.verify(header.slice(7));
    const user = users.findById(id);
    if (!user) throw new ApplicationError('INVALID_TOKEN', 'Invalid or expired access token', 401);
    response.locals.user = publicUser(user);
    next();
  };
}

export function authenticatedUser(response: Response): PublicUser {
  return response.locals.user as PublicUser;
}

export const requireAnalyst: RequestHandler = (_request, response, next) => {
  if (authenticatedUser(response).role !== 'ANALYST') {
    throw new ApplicationError('FORBIDDEN', 'The analyst role is required', 403);
  }
  next();
};

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, request, response, _next) => {
    if (response.headersSent) { _next(error); return; }
    const requestId = String(request.id);
    if (error instanceof ZodError) {
      response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })), requestId } });
      return;
    }
    if (error instanceof ApplicationError) {
      response.status(error.status).json({ error: { code: error.code, message: error.message, requestId } });
      return;
    }
    const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
    if (status === 400 || status === 413 || status === 415) {
      const code = status === 413 ? 'PAYLOAD_TOO_LARGE' : status === 415 ? 'UNSUPPORTED_MEDIA_TYPE' : 'INVALID_JSON';
      response.status(status).json({ error: { code, message: 'Invalid request body', requestId } });
      return;
    }
    logger.error({ err: error, requestId }, 'Unhandled request error');
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', requestId } });
  };
}
