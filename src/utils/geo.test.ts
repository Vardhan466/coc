import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLGDStates,
  getLGDDistrictsByState,
  validateGeoLocation,
} from './geoValidation';

test('getLGDStates returns all 28 states and 8 union territories', () => {
  const states = getLGDStates();
  assert.ok(states.length >= 35, 'Should have at least 35 states and UTs');
  
  const ap = states.find((s) => s.code === 'AP');
  assert.ok(ap, 'Andhra Pradesh should exist');
  assert.equal(ap?.name, 'Andhra Pradesh');

  const dl = states.find((s) => s.code === 'DL');
  assert.ok(dl, 'Delhi should exist');
  assert.equal(dl?.type, 'union_territory');
});

test('getLGDDistrictsByState returns correct districts for state', () => {
  const apDistricts = getLGDDistrictsByState('AP');
  assert.ok(apDistricts.length >= 20, 'AP should have 26 districts in 2026 reorganization');
  
  const kurnool = apDistricts.find((d) => d.code === 'AP-KRN');
  assert.ok(kurnool, 'Kurnool district should exist in AP');
  assert.equal(kurnool?.name, 'Kurnool');

  const tsDistricts = getLGDDistrictsByState('TS');
  const hyd = tsDistricts.find((d) => d.code === 'TS-HYD');
  assert.ok(hyd, 'Hyderabad should exist in TS');
});

test('validateGeoLocation accepts valid state and matching district', () => {
  const result = validateGeoLocation('AP', 'AP-KRN');
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.resolvedStateName, 'Andhra Pradesh');
  assert.equal(result.resolvedDistrictName, 'Kurnool');
});

test('validateGeoLocation rejects district belonging to a different state (cascade validation)', () => {
  // AP-KRN belongs to AP, not TS
  const result = validateGeoLocation('TS', 'AP-KRN');
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('not valid for state')));
});

test('validateGeoLocation rejects invalid/unknown state codes', () => {
  const result = validateGeoLocation('XYZ_UNKNOWN', 'DIST_1');
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('Invalid state code')));
});

test('validateGeoLocation handles "OTHER" with free text correctly', () => {
  const result = validateGeoLocation('OTHER', 'OTHER', 'New Border State', 'Newly Carved District');
  assert.equal(result.valid, true);
  assert.equal(result.resolvedStateName, 'New Border State');
  assert.equal(result.resolvedDistrictName, 'Newly Carved District');
});

test('validateGeoLocation rejects "OTHER" if free text is missing or too short', () => {
  const result = validateGeoLocation('OTHER', 'OTHER', '', 'A');
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 2);
});
