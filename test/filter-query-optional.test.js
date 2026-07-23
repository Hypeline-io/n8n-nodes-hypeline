// Regression test: the Filter Query is OPTIONAL on both the Trigger (Create New)
// and the action node's Alert > Create. An empty filter_query is the engine's
// documented match-all (watch every new item from the alert's sources), so the
// node must never block a blank value with required:true. The Trigger also sends
// filter_query verbatim, so a blank field posts filter_query:"" as intended.
// Runs against the built dist output (npm test builds first).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { HypelineTrigger } = require('../dist/nodes/HypelineTrigger/HypelineTrigger.node.js');
const { Hypeline } = require('../dist/nodes/Hypeline/Hypeline.node.js');

function topLevelFilterQuery(desc) {
	const props = desc.properties.filter((p) => p.name === 'filterQuery');
	assert.equal(props.length, 1, 'expected exactly one top-level filterQuery property');
	return props[0];
}

test('Trigger Filter Query is not required (blank = watch everything)', () => {
	const prop = topLevelFilterQuery(new HypelineTrigger().description);
	assert.notEqual(prop.required, true);
});

test('Alert > Create Filter Query is not required (blank = match all)', () => {
	const prop = topLevelFilterQuery(new Hypeline().description);
	assert.notEqual(prop.required, true);
});
