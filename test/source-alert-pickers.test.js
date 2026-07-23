// Regression: the Trigger's Sources / Alert fields are loadOptions-backed pickers
// (choose by name), not raw id text inputs. Guards the UX so a future edit can't
// silently revert them to free-text GUID fields, and confirms the loadOptions
// methods that populate them still exist. Runs against the built dist output.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { HypelineTrigger } = require('../dist/nodes/HypelineTrigger/HypelineTrigger.node.js');

const node = new HypelineTrigger();
const props = node.description.properties;
const byName = (name) => props.find((p) => p.name === name);

test('Sources is a multiOptions picker loaded via getSources', () => {
	const p = byName('sourceIds');
	assert.equal(p.type, 'multiOptions');
	assert.equal(p.typeOptions.loadOptionsMethod, 'getSources');
});

test('Alert (Attach Existing) is an options picker loaded via getAlerts', () => {
	const p = byName('alertId');
	assert.equal(p.type, 'options');
	assert.equal(p.typeOptions.loadOptionsMethod, 'getAlerts');
});

test('the loadOptions methods that back the pickers exist', () => {
	assert.equal(typeof node.methods.loadOptions.getSources, 'function');
	assert.equal(typeof node.methods.loadOptions.getAlerts, 'function');
});
