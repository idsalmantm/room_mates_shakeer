'use strict';
const $ = id => document.getElementById(id);
const draftKey = 'roommates-shakeer-draft-v1';
const historyKey = 'roommates-shakeer-history-v1';
const householdKey = 'roommates-shakeer-household-v1';
const fields = ['villa', 'start', 'end', 'mainUsage', 'electricity', 'water', 'gas', 'tanker', 'gasRule'];
const freshFamily = () => ({ name: '', people: '', meters: [{ name: 'AC 1', previous: '', current: '' }] });
const blankBill = () => ({ villa: '', start: '', end: '', mainUsage: '', electricity: '', water: '', gas: '', tanker: '', gasRule: 'people' });
const blank = () => ({ ...blankBill(), families: Array.from({ length: 3 }, freshFamily) });
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = cents => (cents / 100).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = n => Number(n).toLocaleString('en-AE', { maximumFractionDigits: 3 });
const stamp = () => new Date().toLocaleString('en-AE', { dateStyle: 'medium', timeStyle: 'short' });
const periodLabel = s => (s.start && s.end) ? `${s.start} → ${s.end}` : 'No period set';
const validFamilies = families => Array.isArray(families) && families.every(f => f && typeof f.name === 'string' && Array.isArray(f.meters));
const validDraft = saved => saved && validFamilies(saved.families);
const validHousehold = saved => saved && validFamilies(saved.families);
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}
function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function serializeHousehold(s) {
  return {
    villa: s.villa || '',
    gasRule: s.gasRule === 'equal' ? 'equal' : 'people',
    families: s.families.map(f => ({
      name: f.name || '',
      people: f.people || '',
      meters: f.meters.map((m, j) => ({
        name: m.name || `AC ${j + 1}`,
        lastReading: String(m.current).trim() !== '' ? m.current : (m.previous || '')
      }))
    }))
  };
}
function familiesFromHousehold(household) {
  if (!validHousehold(household) || !household.families.length) {
    return Array.from({ length: 3 }, freshFamily);
  }
  return household.families.map(f => ({
    name: f.name || '',
    people: f.people || '',
    meters: f.meters.length
      ? f.meters.map((m, j) => ({
        name: m.name || `AC ${j + 1}`,
        previous: m.lastReading || '',
        current: ''
      }))
      : []
  }));
}
function stateFromHousehold(household) {
  const next = blank();
  if (!validHousehold(household)) return next;
  next.villa = household.villa || '';
  next.gasRule = household.gasRule === 'equal' ? 'equal' : 'people';
  next.families = familiesFromHousehold(household);
  return next;
}
function householdSummary(household) {
  if (!validHousehold(household) || !household.families.some(f => f.name.trim() || String(f.people).trim())) {
    return 'No saved household yet';
  }
  const named = household.families.filter(f => f.name.trim()).map(f => f.name.trim());
  const people = household.families.reduce((n, f) => n + (+f.people || 0), 0);
  const label = named.length ? named.join(', ') : `${household.families.length} families`;
  return `${label} · ${people || '—'} people · kept on this phone`;
}
const hasDraftData = s => fields.some(k => k !== 'gasRule' && String(s[k] || '').trim()) || s.families.some(f => f.name.trim() || String(f.people).trim() || f.meters.some(m => String(m.previous).trim() || String(m.current).trim() || (m.name && m.name !== 'AC 1')));
let state = blank();
let history = [];
let household = null;
let storageOk = true;
try {
  const probe = '__roommates_probe__';
  localStorage.setItem(probe, '1');
  localStorage.removeItem(probe);
  household = readJSON(householdKey, null);
  if (!validHousehold(household)) household = null;
  let saved = readJSON(draftKey, null);
  if (!validDraft(saved)) {
    try {
      const legacy = JSON.parse(sessionStorage.getItem('roommates-shakeer-session-v1'));
      if (validDraft(legacy)) {
        saved = legacy;
        writeJSON(draftKey, legacy);
        sessionStorage.removeItem('roommates-shakeer-session-v1');
      }
    } catch (_) {}
  }
  if (validDraft(saved)) state = { ...blank(), ...saved };
  else if (household) state = stateFromHousehold(household);
  if (!household && validDraft(state) && state.families.some(f => f.name.trim() || String(f.people).trim())) {
    household = serializeHousehold(state);
    writeJSON(householdKey, household);
  }
  const savedHistory = readJSON(historyKey, []);
  history = Array.isArray(savedHistory) ? savedHistory.filter(item => item && item.id && validDraft(item.state)) : [];
} catch (_) {
  storageOk = false;
  $('save-status').textContent = 'Local storage unavailable — keep this page open and export your report.';
}
function saveHousehold() {
  if (!storageOk) return;
  try {
    household = serializeHousehold(state);
    writeJSON(householdKey, household);
    $('household-status').textContent = householdSummary(household);
  } catch (_) {
    storageOk = false;
    $('save-status').textContent = 'Unable to save household — storage may be full.';
  }
}
function saveDraft() {
  if (!storageOk) {
    $('save-status').textContent = 'Unable to save — keep this page open and export your report.';
    $('report').hidden = true;
    return;
  }
  try {
    writeJSON(draftKey, state);
    saveHousehold();
    $('save-status').textContent = `Saved on this phone · ${stamp()}`;
  } catch (_) {
    storageOk = false;
    $('save-status').textContent = 'Unable to save — storage may be full. Delete old bills below.';
  }
  $('report').hidden = true;
}
function saveHistory() {
  if (!storageOk) return;
  try {
    writeJSON(historyKey, history);
  } catch (_) {
    storageOk = false;
    $('save-status').textContent = 'Unable to save history — storage may be full. Delete old bills.';
  }
}
function historyTitle(item) {
  const villa = (item.state.villa || '').trim() || 'Shared villa';
  return `${villa} · ${periodLabel(item.state)}`;
}
function renderHistory() {
  const list = $('history-list');
  const empty = $('history-empty');
  const clearAll = $('clear-history');
  if (!history.length) {
    list.innerHTML = '';
    empty.hidden = false;
    clearAll.hidden = true;
    return;
  }
  empty.hidden = true;
  clearAll.hidden = false;
  list.innerHTML = history.map(item => {
    const people = item.state.families.reduce((n, f) => n + (+f.people || 0), 0);
    const total = item.result ? money(item.result.total) : '—';
    return `<article class="history-item" data-history-id="${esc(item.id)}">
      <div class="history-copy">
        <strong>${esc(historyTitle(item))}</strong>
        <span>${esc(item.savedAt)} · ${item.state.families.length} families · ${people} people · AED ${total}</span>
      </div>
      <div class="history-actions">
        <button type="button" class="text-button" data-action="load-history">Open</button>
        <button type="button" class="text-button danger" data-action="delete-history">Delete</button>
      </div>
    </article>`;
  }).join('');
}
function render() {
  fields.forEach(k => { $(k).value = state[k]; });
  $('families').innerHTML = state.families.map((f, i) => `<article class="family" data-family="${i}"><div class="family-head"><h3>Family ${String(i + 1).padStart(2, '0')}</h3><button type="button" class="text-button danger" data-action="remove-family">Remove family</button></div><div class="grid family-info"><label>Family / room name<input data-field="name" maxlength="80" value="${esc(f.name)}" placeholder="e.g. Shakeer"></label><label>People, including kids<input data-field="people" type="number" min="1" step="1" value="${esc(f.people)}" placeholder="4"></label></div><div class="meters">${f.meters.map((m, j) => `<div class="meter" data-meter="${j}"><label>Meter name<input data-field="name" maxlength="80" value="${esc(m.name)}" placeholder="AC ${j + 1}"></label><label>Previous (kWh)<input data-field="previous" type="number" min="0" step="0.001" value="${esc(m.previous)}" placeholder="0"></label><label>Current (kWh)<input data-field="current" type="number" min="0" step="0.001" value="${esc(m.current)}" placeholder="0"></label><button type="button" class="remove-meter" data-action="remove-meter" aria-label="Remove meter ${j + 1} from family ${i + 1}">×</button></div>`).join('')}</div>${!f.meters.length ? '<p class="hint">No AC meters. This family shares common electricity only.</p>' : ''}<button type="button" class="text-button" data-action="add-meter">+ Add AC meter</button></article>`).join('');
  $('household-status').textContent = householdSummary(household || serializeHousehold(state));
  renderHistory();
}
function showReport(r) {
  $('report').innerHTML = `<div class="section-title"><div><span class="step">03</span><h2>Your shared bill</h2></div><button type="button" id="print" class="secondary">Save as PDF / Print</button></div><h3>${esc(state.villa || 'Shared villa')}</h3><p class="muted">${esc(state.start)} to ${esc(state.end)} · ${r.rows.length} families · ${r.people} people</p><div class="total-banner"><div><span>Total to share</span><strong><small>AED</small> ${money(r.total)}</strong></div><span>Every fils accounted for ✓</span></div><div class="table-scroll"><table><caption>Family contributions · AED</caption><thead><tr><th>Family</th><th>People</th><th>AC kWh</th><th>Electricity</th><th>Water</th><th>Gas</th><th>Tanker</th><th>Total AED</th></tr></thead><tbody>${r.rows.map(row => `<tr><th>${esc(row.name)}</th><td>${row.people}</td><td>${qty(row.usage)}</td>${['electricity', 'water', 'gas', 'tanker', 'total'].map(k => `<td>${money(row[k])}</td>`).join('')}</tr>`).join('')}</tbody><tfoot><tr><th>Total</th><td>${r.people}</td><td>${qty(r.ac)}</td>${['electricity', 'water', 'gas', 'tanker'].map(k => `<td>${money(Math.round(+state[k] * 100))}</td>`).join('')}<td>${money(r.total)}</td></tr></tfoot></table></div><h3>How this bill was calculated</h3><div class="calculation-notes"><p>Main electricity: <b>${qty(+state.mainUsage)} kWh</b> for <b>AED ${money(Math.round(+state.electricity * 100))}</b>. Blended rate: <b>AED ${r.rate.toFixed(6)} / kWh</b>.</p><p>AC usage: ${qty(r.ac)} kWh. Common usage: ${qty(+state.mainUsage)} − ${qty(r.ac)} = <b>${qty(r.common)} kWh</b>, shared equally: <b>${qty(r.common / r.rows.length)} kWh per family</b>.</p><p>Each family’s electricity = (its AC usage + common usage ÷ ${r.rows.length}) × blended rate.</p><p>Water: AED ${(+state.water / r.people).toFixed(6)} per person. Tanker: AED ${(+state.tanker / r.people).toFixed(6)} per person${+state.tanker ? '' : ' (no charge this period)'}. Gas: split ${state.gasRule === 'people' ? 'by number of people' : 'equally per family'}.</p><p>Final amounts are rounded to fils, with remaining fils assigned by largest fractional remainder; ties follow family order. Displayed rates are rounded for readability.</p></div><h3>Meter readings</h3><div class="table-scroll"><table><caption>AC readings for ${esc(state.start)} to ${esc(state.end)} · kWh</caption><thead><tr><th>Family</th><th>Meter</th><th>Previous</th><th>Current</th><th>Used</th></tr></thead><tbody>${state.families.map(f => f.meters.length ? f.meters.map((m, j) => `<tr><th>${esc(f.name)}</th><td>${esc(m.name || `AC ${j + 1}`)}</td><td>${qty(+m.previous)}</td><td>${qty(+m.current)}</td><td>${qty(+m.current - +m.previous)}</td></tr>`).join('') : `<tr><th>${esc(f.name)}</th><td colspan="4">No AC meters</td></tr>`).join('')}</tbody></table></div><p class="hint print-help">Choose “Save as PDF” in the print window to download and share this report. On mobile, use your browser’s print or share options.</p>`;
  $('report').hidden = false;
  $('print').onclick = () => window.print();
  $('report').scrollIntoView({ behavior: 'smooth' });
}
function archiveBill(result) {
  if (!storageOk) return;
  const fingerprint = `${state.villa}|${state.start}|${state.end}|${JSON.stringify(state.families)}|${state.electricity}|${state.water}|${state.gas}|${state.tanker}|${state.mainUsage}|${state.gasRule}`;
  const existing = history.findIndex(item => item.fingerprint === fingerprint);
  const entry = {
    id: existing >= 0 ? history[existing].id : `bill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: stamp(),
    fingerprint,
    state: JSON.parse(JSON.stringify(state)),
    result: { total: result.total, people: result.people, ac: result.ac }
  };
  if (existing >= 0) history.splice(existing, 1);
  history.unshift(entry);
  if (history.length > 36) history = history.slice(0, 36);
  saveHistory();
  renderHistory();
}
function startNewMonth() {
  saveHousehold();
  state = stateFromHousehold(household || serializeHousehold(state));
  saveDraft();
  render();
  $('errors').hidden = true;
  $('report').hidden = true;
  $('save-status').textContent = `New month started · families kept · ${stamp()}`;
}
$('bill-form').addEventListener('input', e => {
  const el = e.target;
  if (fields.includes(el.id)) state[el.id] = el.value;
  else if (el.dataset.field) {
    const f = state.families[el.closest('[data-family]').dataset.family];
    const m = el.closest('[data-meter]');
    (m ? f.meters[m.dataset.meter] : f)[el.dataset.field] = el.value;
  }
  saveDraft();
});
$('families').addEventListener('click', e => {
  const button = e.target.closest('[data-action]');
  if (!button) return;
  const i = +button.closest('[data-family]').dataset.family;
  const f = state.families[i];
  if (button.dataset.action === 'add-meter') f.meters.push({ name: `AC ${f.meters.length + 1}`, previous: '', current: '' });
  if (button.dataset.action === 'remove-meter') {
    if (!confirm('Remove this AC meter and its readings?')) return;
    f.meters.splice(+button.closest('[data-meter]').dataset.meter, 1);
  }
  if (button.dataset.action === 'remove-family') {
    if (!confirm('Remove this family and all its meter readings?')) return;
    state.families.splice(i, 1);
  }
  saveDraft();
  render();
});
$('history-list').addEventListener('click', e => {
  const button = e.target.closest('[data-action]');
  if (!button) return;
  const id = button.closest('[data-history-id]').dataset.historyId;
  const index = history.findIndex(item => item.id === id);
  if (index < 0) return;
  if (button.dataset.action === 'delete-history') {
    if (!confirm('Delete this saved bill from this phone?')) return;
    history.splice(index, 1);
    saveHistory();
    renderHistory();
    $('save-status').textContent = 'Old bill deleted';
    return;
  }
  if (button.dataset.action === 'load-history') {
    if (!confirm('Replace the current form with this saved bill?')) return;
    state = { ...blank(), ...JSON.parse(JSON.stringify(history[index].state)) };
    saveDraft();
    render();
    $('errors').hidden = true;
    const r = BillCalculator.calculate(state);
    if (!r.errors.length) showReport(r);
    else {
      $('report').hidden = true;
      $('errors').hidden = false;
      $('errors').innerHTML = `<strong>Please check these details</strong><ul>${r.errors.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
    }
    $('save-status').textContent = `Opened saved bill · ${stamp()}`;
  }
});
$('add-family').onclick = () => {
  state.families.push(freshFamily());
  saveDraft();
  render();
  $('families').lastElementChild.querySelector('input').focus();
};
$('new-month').onclick = () => {
  if (!confirm('Start a new month? Bill charges and dates are cleared. Families stay, and last meter readings become the new “previous”.')) return;
  startNewMonth();
};
$('reset').onclick = () => {
  if (!confirm('Clear this month’s bill draft? Family names, people counts, and meter names stay saved on this phone.')) return;
  startNewMonth();
};
$('clear-household').onclick = () => {
  if (!confirm('Delete the saved household (all family names, people counts, and meter names) on this phone?')) return;
  household = null;
  try { localStorage.removeItem(householdKey); } catch (_) {}
  state = { ...blankBill(), families: Array.from({ length: 3 }, freshFamily), villa: state.villa, gasRule: state.gasRule, start: state.start, end: state.end, mainUsage: state.mainUsage, electricity: state.electricity, water: state.water, gas: state.gas, tanker: state.tanker };
  try { writeJSON(draftKey, state); } catch (_) {}
  render();
  $('save-status').textContent = 'Saved household deleted';
};
$('clear-history').onclick = () => {
  if (!confirm('Delete all saved bill history on this phone? This cannot be undone.')) return;
  history = [];
  saveHistory();
  try { localStorage.removeItem(historyKey); } catch (_) {}
  renderHistory();
  $('save-status').textContent = 'All old bills deleted';
};
$('clear-all-data').onclick = () => {
  if (!confirm('Delete the household, current draft, and all saved bill history on this phone?')) return;
  state = blank();
  history = [];
  household = null;
  try {
    localStorage.removeItem(draftKey);
    localStorage.removeItem(historyKey);
    localStorage.removeItem(householdKey);
  } catch (_) {}
  render();
  $('errors').hidden = true;
  $('report').hidden = true;
  $('save-status').textContent = 'All local data deleted';
};
$('example').onclick = () => {
  if (!confirm('Replace the current entries with the sample bill?')) return;
  state = {
    villa: 'Our shared villa',
    start: '2026-08-01',
    end: '2026-08-31',
    mainUsage: '1000',
    electricity: '2000',
    water: '500',
    gas: '0',
    tanker: '',
    gasRule: 'people',
    families: [
      { name: 'Shakeer', people: '4', meters: [{ name: 'Bedroom AC', previous: '1000', current: '1300' }, { name: 'Living room AC', previous: '500', current: '600' }] },
      { name: 'Family 2', people: '3', meters: [{ name: 'AC 1', previous: '1000', current: '1200' }] },
      { name: 'Family 3', people: '3', meters: [{ name: 'AC 1', previous: '2000', current: '2200' }] }
    ]
  };
  saveDraft();
  render();
  $('errors').hidden = true;
};
$('bill-form').onsubmit = e => {
  e.preventDefault();
  const r = BillCalculator.calculate(state);
  $('errors').hidden = !r.errors.length;
  $('errors').innerHTML = `<strong>Please check these details</strong><ul>${r.errors.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
  if (r.errors.length) {
    $('report').hidden = true;
    $('errors').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  archiveBill(r);
  saveDraft();
  if (storageOk) $('save-status').textContent = `Bill & household saved on this phone · ${stamp()}`;
  showReport(r);
};
if (storageOk) {
  $('save-status').textContent = (hasDraftData(state) || history.length || household)
    ? `Restored from this phone · ${stamp()}`
    : 'Ready · families stay saved on this phone';
}
render();
