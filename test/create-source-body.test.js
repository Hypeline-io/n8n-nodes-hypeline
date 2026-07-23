// Regression test for the Create Source request shape. POST /v1/sources takes a
// batch envelope { sources: [ { url, ... } ] } and rejects a flat single-source
// body with 422; tags must be an array, not the comma-separated string the node
// collects. The wrapCreateSourceBody preSend bridges the flat form fields to that
// contract. Runs against the built dist output (npm test builds first).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { wrapCreateSourceBody } = require('../dist/nodes/Hypeline/Hypeline.node.js');

async function wrap(body) {
	const out = await wrapCreateSourceBody.call({}, { body });
	return out.body;
}

test('wraps a flat single-source body into the sources[] batch envelope', async () => {
	assert.deepEqual(await wrap({ url: 'https://example.com/' }), {
		sources: [{ url: 'https://example.com/' }],
	});
});

test('splits comma-separated tags into an array inside the item', async () => {
	assert.deepEqual(await wrap({ url: 'https://example.com/', tags: 'news, blog ,,release' }), {
		sources: [{ url: 'https://example.com/', tags: ['news', 'blog', 'release'] }],
	});
});

test('carries the optional item fields through unchanged', async () => {
	assert.deepEqual(
		await wrap({ url: 'https://x.test/', locale_hint: 'en', schedule: '1h', selector: 'main' }),
		{ sources: [{ url: 'https://x.test/', locale_hint: 'en', schedule: '1h', selector: 'main' }] },
	);
});

test('leaves a missing tags field absent (no empty array)', async () => {
	const item = (await wrap({ url: 'https://x.test/' })).sources[0];
	assert.ok(!('tags' in item));
});
