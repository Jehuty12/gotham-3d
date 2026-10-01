import { seededRandom, deriveSeed } from './procedural.js';

// Apartments/offices occupy small 2-column, 3-floor groups. A separate stream
// adds exceptions without changing the roof or the building's geometry.
export function windowState(seed, section, axis, side, row, column, district, art=false) {
  const group = seededRandom(deriveSeed(seed, 'window-group', section, axis, side, Math.floor(row / 3), Math.floor(column / 2)));
  const individual = seededRandom(deriveSeed(seed, 'window', section, axis, side, row, column));
  const occupied = group() < district.windowLight;
  const lit = individual() < (occupied ? 0.92 : 0.04);
  const hue=group();
  const tint = !art ? (hue<.18?'#a6cadc':district.windowColor) : hue < .03 ? '#b5a2c5' : hue < .2 ? '#b8dbe5' : hue < .42 ? '#efe2c7' : district.windowColor;
  return { lit, tint, brightness: lit ? 0.38 + group() * 0.62 + individual() * 0.25 : 0.08 + individual() * 0.04 };
}
