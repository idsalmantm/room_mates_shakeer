const assert = require('node:assert/strict');
const { calculate, allocate } = require('./calculator');
const sample = { start: '2026-08-01', end: '2026-08-31', mainUsage: '1000', electricity: '2000', water: '500', gas: '', tanker: '', gasRule: 'people', families: [
  { name: 'Shakeer', people: '4', meters: [{ previous: '1000', current: '1300' }, { previous: '500', current: '600' }] },
  { name: 'Family 2', people: '3', meters: [{ previous: '1000', current: '1200' }] },
  { name: 'Family 3', people: '3', meters: [{ previous: '2000', current: '2200' }] }
] };
const r = calculate(sample);
assert.deepEqual(r.errors, []);
assert.equal(r.ac, 800); assert.equal(r.common, 200);
assert.deepEqual(r.rows.map(r => r.water), [20000, 15000, 15000]);
assert.deepEqual(r.rows.map(r => r.total), [113334, 68333, 68333]);
assert.equal(r.rows.reduce((s, r) => s + r.total, 0), 250000);
assert.deepEqual(allocate(0.02, [1, 1, 1]), [1, 1, 0]);
assert.deepEqual(allocate(10, [0, 1, 0]), [0, 1000, 0]);
const extra = calculate({ ...sample, gas: '100', tanker: '200', gasRule: 'equal' });
assert.deepEqual(extra.rows.map(r => r.tanker), [8000, 6000, 6000]);
assert.deepEqual(extra.rows.map(r => r.gas), [3334, 3333, 3333]);
assert.ok(calculate({ ...sample, mainUsage: '700' }).errors.length);
assert.ok(calculate({ ...sample, end: '2026-07-01' }).errors.length);
assert.ok(calculate({ ...sample, water: '-1' }).errors.length);
assert.ok(calculate({ ...sample, water: '0.001' }).errors.length);
assert.ok(calculate({ ...sample, families: [{ name: 'A', people: '0', meters: [] }] }).errors.length);
assert.ok(calculate({ ...sample, families: [{ name: 'A', people: '2', meters: [{ previous: '9', current: '8' }] }] }).errors.length);
const zero = calculate({ ...sample, mainUsage: '0', electricity: '0', families: [{ name: 'A', people: '2', meters: [] }] });
assert.deepEqual(zero.errors, []); assert.equal(zero.rows[0].electricity, 0);
for (let cents = 0; cents < 1000; cents++) assert.equal(allocate(cents / 100, [4, 3, 3]).reduce((s, n) => s + n, 0), cents);
console.log('All calculation checks passed.');
