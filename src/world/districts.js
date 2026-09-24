export const CITY_SEED = 1989;
export const CITY_CONFIG = Object.freeze({ count: 8, spacing: 64, sidewalk: 3 });

export const DISTRICTS = Object.freeze({
  downtown: Object.freeze({ id: 'downtown', name: 'Downtown', averageHeight: 83, heightVariation: 39,
    density: 0.97, roadWidth: 24, color: '#56616c', neonFrequency: 0.48, windowLight: 0.72,
    windowColor: '#ffdbab', mapColor: '#536879', mapGround: '#17242e', lampColor: '#ffe2b4',
    styles: ['setback', 'technical', 'artdeco', 'antenna'] }),
  old: Object.freeze({ id: 'old', name: 'Old Gotham', averageHeight: 27, heightVariation: 12,
    density: 0.87, roadWidth: 10, color: '#645952', neonFrequency: 0.16, windowLight: 0.43,
    windowColor: '#ffc78a', mapColor: '#79685b', mapGround: '#292320', lampColor: '#ffc187',
    styles: ['gothic', 'cornice'] }),
  industrial: Object.freeze({ id: 'industrial', name: 'Industrial District', averageHeight: 13, heightVariation: 6,
    density: 0.86, roadWidth: 18, color: '#555d50', neonFrequency: 0.1, windowLight: 0.25,
    windowColor: '#b7d6c8', mapColor: '#687057', mapGround: '#22271e', lampColor: '#ffbc73',
    styles: ['industrial'] }),
  docks: Object.freeze({ id: 'docks', name: 'Docks', averageHeight: 9, heightVariation: 3,
    density: 0.64, roadWidth: 22, color: '#405d64', neonFrequency: 0.12, windowLight: 0.2,
    windowColor: '#9bd8e6', mapColor: '#47777e', mapGround: '#132a30', lampColor: '#b3deed',
    styles: ['hangar'] }),
});

export function districtForChunk(ix, iz, count = CITY_CONFIG.count) {
  return iz < count / 2 ? (ix < count / 2 ? DISTRICTS.old : DISTRICTS.downtown)
    : (ix < count / 2 ? DISTRICTS.industrial : DISTRICTS.docks);
}
