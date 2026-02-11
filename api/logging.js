import crypto from 'crypto';

export function getRequestId(req) {
  const headerRequestId = req.headers['x-request-id'] || req.headers['x-vercel-id'];
  if (headerRequestId && typeof headerRequestId === 'string') {
    return headerRequestId;
  }
  return crypto.randomUUID();
}

export function logPolicyDecision({ requestId, endpoint, actorId = null, decision, reason, metadata = {} }) {
  const payload = {
    requestId,
    endpoint,
    actorId,
    decision,
    reason,
    ...metadata
  };

  console.log(`[policy] ${JSON.stringify(payload)}`);
}
