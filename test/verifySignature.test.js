// Runs on the built output with the node:test runner, so the package keeps zero
// dependencies of any kind, including for tests. Run with `npm test` (which
// builds first). Vectors are generated in-test with node:crypto so they are
// self-consistent with the verifier under test.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { verifySignature } = require('../dist/utils/verifySignature.js');

const KEY_B64 = Buffer.from('super-secret-signing-key-0123456789').toString('base64');
const SECRET = `whsec_${KEY_B64}`;
const ID = 'msg_2abc';
const BODY = JSON.stringify({ event: 'content.new', id: 'evt_1', title: 'Something new' });

function sign(secret, id, ts, body) {
	const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
	const digest = createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64');
	return `v1,${digest}`;
}

const nowTs = () => Math.floor(Date.now() / 1000).toString();

test('accepts a known-good signature', () => {
	const ts = nowTs();
	const header = sign(SECRET, ID, ts, BODY);
	assert.equal(verifySignature(SECRET, ID, ts, BODY, header), true);
});

test('rejects a tampered body', () => {
	const ts = nowTs();
	const header = sign(SECRET, ID, ts, BODY);
	const tampered = BODY.replace('Something new', 'Something else');
	assert.equal(verifySignature(SECRET, ID, ts, tampered, header), false);
});

test('rejects a stale or replayed timestamp', () => {
	const staleTs = (Math.floor(Date.now() / 1000) - 4000).toString();
	const header = sign(SECRET, ID, staleTs, BODY);
	assert.equal(verifySignature(SECRET, ID, staleTs, BODY, header), false);
});

test('rejects a signature made with the wrong key', () => {
	const ts = nowTs();
	const wrongSecret = `whsec_${Buffer.from('a-different-key-000000000000000000').toString('base64')}`;
	const header = sign(wrongSecret, ID, ts, BODY);
	assert.equal(verifySignature(SECRET, ID, ts, BODY, header), false);
});

test('accepts when any entry in a multi-version header is valid', () => {
	const ts = nowTs();
	const good = sign(SECRET, ID, ts, BODY);
	const header = `v1,YmFkc2lnbmF0dXJl ${good}`;
	assert.equal(verifySignature(SECRET, ID, ts, BODY, header), true);
});
