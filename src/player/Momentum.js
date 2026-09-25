export const MAX_HORIZONTAL_SPEED=24;
export const MAX_VERTICAL_SPEED=35;
export function clampMomentum(velocity,vertical) {
  velocity.y=0;
  if(velocity.length()>MAX_HORIZONTAL_SPEED)velocity.setLength(MAX_HORIZONTAL_SPEED);
  return Math.max(-MAX_VERTICAL_SPEED,Math.min(18,vertical));
}
export function releaseMomentum(physics,velocity,boost=true) {
  physics.velocity.copy(velocity).multiplyScalar(.55);physics.velocity.y=0;
  physics.vy=clampMomentum(physics.velocity,Math.max(boost?4:0,velocity.y*.45));physics.grounded=false;
}
