import React, { useState, useEffect, useMemo } from 'react';
import {
  getLGDStates,
  getLGDDistrictsByState,
  DistrictEntry,
} from '../utils/geoValidation';
import { Search, MapPin, ChevronDown } from 'lucide-react';

interface CascadingGeoSelectProps {
  selectedStateCode: string;
  selectedDistrictCode: string;
  otherStateText?: string;
  otherDistrictText?: string;
  onChange: (geo: {
    stateCode: string;
    stateName: string;
    districtCode: string;
    districtName: string;
    otherStateText?: string;
    otherDistrictText?: string;
  }) => void;
  className?: string;
  disabled?: boolean;
}

export const CascadingGeoSelect: React.FC<CascadingGeoSelectProps> = ({
  selectedStateCode,
  selectedDistrictCode,
  otherStateText = '',
  otherDistrictText = '',
  onChange,
  className = '',
  disabled = false,
}) => {
  const [statesList, setStatesList] = useState<{ code: string; name: string; type: string }[]>([]);
  const [stateSearch, setStateSearch] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');
  const [isStateOpen, setIsStateOpen] = useState(false);
  const [isDistrictOpen, setIsDistrictOpen] = useState(false);

  useEffect(() => {
    const list = getLGDStates();
    setStatesList(list);
  }, []);

  const availableDistricts: DistrictEntry[] = useMemo(() => {
    if (!selectedStateCode || selectedStateCode === 'OTHER') return [];
    return getLGDDistrictsByState(selectedStateCode);
  }, [selectedStateCode]);

  const filteredStates = useMemo(() => {
    const q = stateSearch.toLowerCase().trim();
    if (!q) return statesList;
    return statesList.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  }, [statesList, stateSearch]);

  const filteredDistricts = useMemo(() => {
    const q = districtSearch.toLowerCase().trim();
    if (!q) return availableDistricts;
    return availableDistricts.filter(
      (d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)
    );
  }, [availableDistricts, districtSearch]);

  const currentStateName = useMemo(() => {
    if (selectedStateCode === 'OTHER') return otherStateText || 'Other / Not Listed';
    const match = statesList.find((s) => s.code === selectedStateCode);
    return match ? match.name : 'Select State / UT';
  }, [selectedStateCode, statesList, otherStateText]);

  const currentDistrictName = useMemo(() => {
    if (selectedDistrictCode === 'OTHER') return otherDistrictText || 'Other / Not Listed';
    const match = availableDistricts.find((d) => d.code === selectedDistrictCode);
    return match ? match.name : 'Select District';
  }, [selectedDistrictCode, availableDistricts, otherDistrictText]);

  const handleStatePick = (code: string, name: string) => {
    setIsStateOpen(false);
    setStateSearch('');

    if (code === 'OTHER') {
      onChange({
        stateCode: 'OTHER',
        stateName: otherStateText || 'Other',
        districtCode: 'OTHER',
        districtName: otherDistrictText || 'Other',
        otherStateText,
        otherDistrictText,
      });
      return;
    }

    const newDistricts = getLGDDistrictsByState(code);
    const defaultDist = newDistricts[0];

    onChange({
      stateCode: code,
      stateName: name,
      districtCode: defaultDist ? defaultDist.code : '',
      districtName: defaultDist ? defaultDist.name : '',
      otherStateText: '',
      otherDistrictText: '',
    });
  };

  const handleDistrictPick = (code: string, name: string) => {
    setIsDistrictOpen(false);
    setDistrictSearch('');

    onChange({
      stateCode: selectedStateCode,
      stateName: currentStateName,
      districtCode: code,
      districtName: code === 'OTHER' ? otherDistrictText || 'Other' : name,
      otherStateText,
      otherDistrictText: code === 'OTHER' ? otherDistrictText : '',
    });
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* State / UT Cascading Select */}
      <div className="relative">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          State / Union Territory <span className="text-rose-500">*</span>
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setIsStateOpen(!isStateOpen);
            setIsDistrictOpen(false);
          }}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-800 cursor-pointer"
        >
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className={selectedStateCode ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-500 dark:text-slate-400'}>
              {currentStateName}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        {isStateOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2 space-y-1 animate-smooth-in">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Search state or UT..."
                value={stateSearch}
                onChange={(e) => setStateSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-0.5 pt-1">
              {filteredStates.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => handleStatePick(s.code, s.name)}
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md transition-colors flex items-center justify-between cursor-pointer ${
                    selectedStateCode === s.code
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-semibold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span>{s.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">{s.code}</span>
                </button>
              ))}

              <div className="border-t border-slate-100 dark:border-slate-700 my-1 pt-1">
                <button
                  type="button"
                  onClick={() => handleStatePick('OTHER', 'Other / Not Listed')}
                  className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-md cursor-pointer"
                >
                  + Other / Not Listed
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedStateCode === 'OTHER' && (
        <div>
          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
            Specify Your State / Region Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Enter state name"
            value={otherStateText}
            onChange={(e) => {
              onChange({
                stateCode: 'OTHER',
                stateName: e.target.value,
                districtCode: selectedDistrictCode,
                districtName: currentDistrictName,
                otherStateText: e.target.value,
                otherDistrictText,
              });
            }}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      )}

      {selectedStateCode && selectedStateCode !== 'OTHER' && (
        <div className="relative">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            District <span className="text-rose-500">*</span>
          </label>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setIsDistrictOpen(!isDistrictOpen);
              setIsStateOpen(false);
            }}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-800 cursor-pointer"
          >
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className={selectedDistrictCode ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-500 dark:text-slate-400'}>
                {currentDistrictName}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {isDistrictOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2 space-y-1 animate-smooth-in">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search district..."
                  value={districtSearch}
                  onChange={(e) => setDistrictSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-0.5 pt-1">
                {filteredDistricts.map((d) => (
                  <button
                    key={d.code}
                    type="button"
                    onClick={() => handleDistrictPick(d.code, d.name)}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md transition-colors flex items-center justify-between cursor-pointer ${
                      selectedDistrictCode === d.code
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-semibold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{d.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{d.code}</span>
                  </button>
                ))}

                <div className="border-t border-slate-100 dark:border-slate-700 my-1 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDistrictPick('OTHER', 'Other / Not Listed')}
                    className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-md cursor-pointer"
                  >
                    + Other / Not Listed
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {(selectedDistrictCode === 'OTHER' || selectedStateCode === 'OTHER') && (
        <div>
          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
            Specify Your District Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Enter district name"
            value={otherDistrictText}
            onChange={(e) => {
              onChange({
                stateCode: selectedStateCode,
                stateName: currentStateName,
                districtCode: 'OTHER',
                districtName: e.target.value,
                otherStateText,
                otherDistrictText: e.target.value,
              });
            }}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      )}
    </div>
  );
};
