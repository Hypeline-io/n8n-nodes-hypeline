import { createHmac, timingSafeEqual } from 'node:crypto';

// Standard-Webhooks HMAC-SHA256 verification, reimplemented with node:crypto
// only so the package carries zero runtime dependencies (the n8n verification
// bar forbids the standardwebhooks library). The engine signs deliveries with
// the same scheme (internal/delivery/sign.go): the signed string is
// `${id}.${timestamp}.${rawBody}`, the secret is "whsec_<base64>", and the
// webhook-signature header is a space-delimited list of "v1,<base64sig>" entries.
const TOLERANCE_S = 300; // 5 minute freshness window (replay protection)

export function verifySignature(
	secret: string,
	id: string,
	timestamp: string,
	rawBody: string,
	signatureHeader: string,
): boolean {
	const now = Math.floor(Date.now() / 1000);
	const ts = Number(timestamp);
	if (!Number.isFinite(ts) || Math.abs(now - ts) > TOLERANCE_S) return false;

	const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
	const signed = `${id}.${timestamp}.${rawBody}`;
	const expected = createHmac('sha256', key).update(signed).digest('base64');
	const expBuf = Buffer.from(expected);

	return signatureHeader.split(' ').some((part) => {
		const sig = part.startsWith('v1,') ? part.slice(3) : part;
		const sigBuf = Buffer.from(sig);
		return sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);
	});
}
