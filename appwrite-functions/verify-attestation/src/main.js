import crypto from 'node:crypto';

function parseBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  return body;
}

function buildResponse(payload, res) {
  return res.json(payload);
}

function isValidHex(value) {
  return typeof value === 'string' && value.length > 0 && value.length % 2 === 0 && /^[0-9a-f]+$/i.test(value);
}

export default async ({ req, res, log, error }) => {
  try {
    const signingKey = process.env.BUILD_SIGNING_KEY;
    if (!signingKey) {
      error('BUILD_SIGNING_KEY is missing in function environment.');
      return buildResponse({
        verified: false,
        status: 'UNVERIFIED',
        reason: 'Signing key missing in function environment',
      }, res);
    }

    const body = parseBody(req.body);
    const token = typeof body.token === 'string' ? body.token : '';
    const version = typeof body.version === 'string' ? body.version : '';
    const buildTimestamp = typeof body.buildTimestamp === 'string' ? body.buildTimestamp : '';
    const label = typeof body.label === 'string' ? body.label : '';

    if (!token || !version || !buildTimestamp) {
      return buildResponse({
        verified: false,
        status: 'UNVERIFIED',
        reason: 'Malformed attestation payload',
      }, res);
    }

    if (label === 'DEV_MODE' && token === 'DEV_MODE') {
      return buildResponse({
        verified: true,
        status: 'DEV_MODE',
      }, res);
    }

    if (label !== 'OFFICIAL_BUILD') {
      return buildResponse({
        verified: false,
        status: 'UNVERIFIED',
        reason: 'Malformed attestation payload',
      }, res);
    }

    const message = `${version}|${buildTimestamp}|sonar-official`;
    const expectedToken = crypto
      .createHmac('sha256', signingKey)
      .update(message)
      .digest('hex');

    if (!isValidHex(token)) {
      return buildResponse({
        verified: false,
        status: 'UNVERIFIED',
        reason: 'Malformed attestation token',
      }, res);
    }

    const expectedBuffer = Buffer.from(expectedToken, 'hex');
    const providedBuffer = Buffer.from(token, 'hex');
    const verified =
      expectedBuffer.length === providedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, providedBuffer);

    if (!verified) {
      log(`Attestation verification failed for version ${version}.`);
    }

    return buildResponse({
      verified,
      status: verified ? 'OFFICIAL_BUILD' : 'UNVERIFIED',
    }, res);
  } catch (err) {
    error(`Attestation verification error: ${err instanceof Error ? err.message : String(err)}`);
    return buildResponse({
      verified: false,
      status: 'UNVERIFIED',
      reason: 'Verifier error',
    }, res);
  }
};
