import indiaGeoData from '../data/geo/india.json';

export interface DistrictEntry {
  code: string;
  name: string;
}

export interface StateEntry {
  code: string;
  name: string;
  type: 'state' | 'union_territory';
  districts: DistrictEntry[];
}

export interface IndiaGeoContract {
  version: string;
  lastUpdated: string;
  source: string;
  states: StateEntry[];
}

export const LGD_INDIA_GEO: IndiaGeoContract = indiaGeoData as IndiaGeoContract;

/**
 * Get all available states and union territories.
 */
export function getLGDStates(): { code: string; name: string; type: string }[] {
  return LGD_INDIA_GEO.states.map((s) => ({
    code: s.code,
    name: s.name,
    type: s.type,
  }));
}

/**
 * Get all districts for a given state code.
 */
export function getLGDDistrictsByState(stateCode: string): DistrictEntry[] {
  const state = LGD_INDIA_GEO.states.find((s) => s.code.toUpperCase() === stateCode.toUpperCase());
  return state ? state.districts : [];
}

export interface GeoValidationResult {
  valid: boolean;
  errors: string[];
  resolvedStateName: string;
  resolvedDistrictName: string;
}

/**
 * Validates stateCode and districtCode according to official LGD catalog.
 * Supports "OTHER" with free-text fallback so candidates are never blocked.
 */
export function validateGeoLocation(
  stateCode: string,
  districtCode: string,
  otherStateText?: string,
  otherDistrictText?: string
): GeoValidationResult {
  const errors: string[] = [];
  let resolvedStateName = '';
  let resolvedDistrictName = '';

  const cleanStateCode = (stateCode || '').trim().toUpperCase();
  const cleanDistrictCode = (districtCode || '').trim().toUpperCase();

  // 1. State Validation
  if (!cleanStateCode) {
    errors.push('State code is required.');
  } else if (cleanStateCode === 'OTHER') {
    if (!otherStateText || otherStateText.trim().length < 2) {
      errors.push('Please specify your state name (minimum 2 characters).');
    } else {
      resolvedStateName = otherStateText.trim();
    }
  } else {
    const matchedState = LGD_INDIA_GEO.states.find((s) => s.code === cleanStateCode);
    if (!matchedState) {
      errors.push(`Invalid state code '${cleanStateCode}'. Must match official LGD code or 'OTHER'.`);
    } else {
      resolvedStateName = matchedState.name;
    }
  }

  // 2. District Validation
  if (!cleanDistrictCode) {
    errors.push('District code is required.');
  } else if (cleanDistrictCode === 'OTHER') {
    if (!otherDistrictText || otherDistrictText.trim().length < 2) {
      errors.push('Please specify your district name (minimum 2 characters).');
    } else {
      resolvedDistrictName = otherDistrictText.trim();
    }
  } else {
    if (cleanStateCode && cleanStateCode !== 'OTHER') {
      const stateDistricts = getLGDDistrictsByState(cleanStateCode);
      const matchedDistrict = stateDistricts.find((d) => d.code === cleanDistrictCode);
      if (!matchedDistrict) {
        errors.push(`District code '${cleanDistrictCode}' is not valid for state '${cleanStateCode}'.`);
      } else {
        resolvedDistrictName = matchedDistrict.name;
      }
    } else if (cleanStateCode === 'OTHER') {
      resolvedDistrictName = otherDistrictText || cleanDistrictCode;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    resolvedStateName,
    resolvedDistrictName,
  };
}
