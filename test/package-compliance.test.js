// Asserts (does not assume) the n8n community-node verification bar: the two
// hardest automated gates are zero runtime dependencies and an MIT license.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const pkg = require('../package.json');

test('has zero runtime dependencies', () => {
	const deps = pkg.dependencies;
	assert.ok(deps === undefined || Object.keys(deps).length === 0);
});

test('is MIT licensed', () => {
	assert.equal(pkg.license, 'MIT');
});

test('declares the community-node keyword', () => {
	assert.ok(pkg.keywords.includes('n8n-community-node-package'));
});

test('is named n8n-nodes-hypeline', () => {
	assert.equal(pkg.name, 'n8n-nodes-hypeline');
});

test('points at the public Hypeline-io repo', () => {
	assert.ok(pkg.repository.url.includes('github.com/Hypeline-io/n8n-nodes-hypeline'));
});

test('declares one credential and both nodes', () => {
	assert.ok(pkg.n8n.credentials.includes('dist/credentials/HypelineApi.credentials.js'));
	assert.ok(pkg.n8n.nodes.includes('dist/nodes/Hypeline/Hypeline.node.js'));
	assert.ok(pkg.n8n.nodes.includes('dist/nodes/HypelineTrigger/HypelineTrigger.node.js'));
});
