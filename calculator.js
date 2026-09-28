(function (root) {
  'use strict';
  // Largest remainder allocation keeps every category exact to the fils.
  function allocate(amount, weights) {
    const cents = Math.round(amount * 100), total = weights.reduce((a, b) => a + b, 0);
    if (!total) return weights.map(() => 0);
    const raw = weights.map(w => cents * w / total), result = raw.map(Math.floor);
    const order = raw.map((v, i) => ({ i, fraction: v - result[i] })).sort((a, b) => b.fraction - a.fraction || a.i - b.i);
    const remainder = cents - result.reduce((a, b) => a + b, 0);
    for (let i = 0; i < remainder; i++) result[order[i].i]++;
    return result;
  }
  function calculate(s) {
    const errors = [], number = v => v !== '' && v !== null && Number.isFinite(Number(v));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.start) || !/^\d{4}-\d{2}-\d{2}$/.test(s.end) || s.start > s.end) errors.push('Choose a valid billing period with the end on or after the start.');
    for (const key of ['mainUsage', 'electricity', 'water', 'gas', 'tanker']) {
      if ((key === 'gas' || key === 'tanker') && s[key] === '') continue;
      if (!number(s[key]) || Number(s[key]) < 0 || Number(s[key]) > 100000000) errors.push(`${key}: enter a number from 0 to 100,000,000.`);
      else if (key !== 'mainUsage' && Math.abs(Number(s[key]) * 100 - Math.round(Number(s[key]) * 100)) > 0.00001) errors.push(`${key}: use at most two decimal places for AED.`);
    }
    if (!['people', 'equal'].includes(s.gasRule)) errors.push('Select how to split gas.');
    if (!s.families.length) errors.push('Add at least one family.');
    const usage = s.families.map((f, i) => {
      if (!f.name.trim()) errors.push(`Family ${i + 1}: enter a name.`);
      if (!number(f.people) || !Number.isInteger(Number(f.people)) || +f.people < 1 || +f.people > 10000) errors.push(`Family ${i + 1}: enter a whole number of people from 1 to 10,000.`);
      return f.meters.reduce((sum, m, j) => {
        if (!number(m.previous) || !number(m.current) || +m.previous < 0 || +m.current < +m.previous || +m.current > 100000000) errors.push(`Family ${i + 1}, meter ${j + 1}: enter valid readings; current must be at least previous (maximum 100,000,000).`);
        return sum + (+m.current - +m.previous);
      }, 0);
    });
    const ac = usage.reduce((a, b) => a + b, 0), main = +s.mainUsage;
    if (ac > main + 0.0000001) errors.push('Total AC usage exceeds main electricity consumption. Check the readings and billing period.');
    if (!main && +s.electricity > 0) errors.push('Main electricity consumption must be greater than zero when electricity charges are entered.');
    if (errors.length) return { errors };
    const common = Math.max(0, main - ac), people = s.families.map(f => +f.people), equal = people.map(() => 1);
    const electricity = allocate(+s.electricity, usage.map(u => u + common / people.length));
    const water = allocate(+s.water, people), gas = allocate(+s.gas, s.gasRule === 'people' ? people : equal), tanker = allocate(+s.tanker, people);
    return { errors: [], ac, common, rate: main ? +s.electricity / main : 0, people: people.reduce((a, b) => a + b, 0),
      rows: s.families.map((f, i) => ({ name: f.name, people: people[i], usage: usage[i], electricity: electricity[i], water: water[i], gas: gas[i], tanker: tanker[i], total: electricity[i] + water[i] + gas[i] + tanker[i] })),
      total: ['electricity', 'water', 'gas', 'tanker'].reduce((sum, k) => sum + Math.round(+s[k] * 100), 0) };
  }
  root.BillCalculator = { calculate, allocate };
  if (typeof module !== 'undefined') module.exports = root.BillCalculator;
})(typeof window !== 'undefined' ? window : globalThis);
