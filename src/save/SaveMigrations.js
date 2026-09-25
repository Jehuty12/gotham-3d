import { SAVE_VERSION, normalizeSave } from './SaveSchema.js';

// Future entries map a source version to a pure DTO -> DTO migration.
// Example when version 2 exists: migrations.set(1, dto => ({...dto, version:2, ...})).
export const SAVE_MIGRATIONS = new Map();
export function migrateSave(raw,migrations=SAVE_MIGRATIONS,target=SAVE_VERSION) {
  if(!raw||!Number.isInteger(raw.version)||raw.version<1||raw.version>target)return null;
  let value=raw;
  while(value.version<target){const migrate=migrations.get(value.version);if(!migrate)return null;const next=migrate(value);if(!next||next.version!==value.version+1)return null;value=next;}
  return target===SAVE_VERSION?normalizeSave(value):value;
}
