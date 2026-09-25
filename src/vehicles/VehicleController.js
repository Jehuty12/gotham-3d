export function vehicleInput(keys) {
  const down = (...names) => names.some(name => keys.has(name));
  return {
    throttle: Number(down('KeyW', 'KeyZ', 'ArrowUp')) - Number(down('KeyS', 'ArrowDown')),
    steering: Number(down('KeyA', 'KeyQ', 'ArrowLeft')) - Number(down('KeyD', 'ArrowRight')),
    handbrake: down('Space'), boost: down('ShiftLeft', 'ShiftRight'),
  };
}

// The character controller owns keyboard capture; automobile interpretation stays here.
export class VehicleController {
  constructor(keys) { this.keys = keys; }
  read() { return vehicleInput(this.keys); }
}
