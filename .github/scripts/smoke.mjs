// Live smoke check for the shapes the node depends on. Creates a source, lists
// it, and deletes it against https://api.hypeline.io/v1. No-op (soft pass) when
// HYPELINE_SMOKE_TOKEN is absent, so the workflow is committable before the
// operator provisions the secret.
import { request } from 'node:https';

const TOKEN = process.env.HYPELINE_SMOKE_TOKEN;
if (!TOKEN) {
	console.log('HYPELINE_SMOKE_TOKEN not set, skipping live smoke check.');
	process.exit(0);
}

const BASE = 'api.hypeline.io';

function api(method, path, body) {
	return new Promise((resolve, reject) => {
		const payload = body ? JSON.stringify(body) : undefined;
		const req = request(
			{
				host: BASE,
				path,
				method,
				headers: {
					Authorization: `Bearer ${TOKEN}`,
					Accept: 'application/json',
					...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
				},
			},
			(res) => {
				let data = '';
				res.on('data', (c) => (data += c));
				res.on('end', () => resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }));
			},
		);
		req.on('error', reject);
		if (payload) req.write(payload);
		req.end();
	});
}

function assert(cond, message) {
	if (!cond) {
		console.error(`SMOKE FAIL: ${message}`);
		process.exit(1);
	}
}

// POST /v1/sources takes the batch envelope { sources: [ { url } ] } and returns
// { results: [ { status, detected_type, source } ] }; a flat single-source body is
// rejected 422. This mirrors the shape the node's Create Source operation sends.
const created = await api('POST', '/v1/sources', { sources: [{ url: 'https://example.com/' }] });
assert(created.status >= 200 && created.status < 300, `create source returned ${created.status}`);
const id = created.body?.results?.[0]?.source?.id;
assert(typeof id === 'string' && id.length > 0, 'created source has no id');

const list = await api('GET', '/v1/sources');
assert(list.status === 200, `list sources returned ${list.status}`);

const deleted = await api('DELETE', `/v1/sources/${id}`);
assert(deleted.status >= 200 && deleted.status < 300, `delete source returned ${deleted.status}`);

console.log('SMOKE OK');
