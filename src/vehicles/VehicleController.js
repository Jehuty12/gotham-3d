import { pressed } from '../input/InputBindings.js';
export function vehicleInput(keys) {
  return {
    throttle: Number(pressed(keys,'MOVE_FORWARD')) - Number(pressed(keys,'MOVE_BACK')),
    steering: Number(pressed(keys,'MOVE_LEFT')) - Number(pressed(keys,'MOVE_RIGHT')),
    handbrake: pressed(keys,'HANDBRAKE'), boost: pressed(keys,'BOOST'),
  };
}

// The character controller owns keyboard capture; automobile interpretation stays here.
export class VehicleController {
  constructor(keys) { this.keys = keys; }
  read() { return vehicleInput(this.keys); }
}
