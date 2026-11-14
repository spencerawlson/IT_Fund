// Seating Cypher in the mission SOC.
//
// The seat pose itself is canonical in RobotCharacter (SEATED_POSE +
// sit(), merged as PR #64 for the lesson panel): one body, one pose
// table, so the SOC and the panel can never drift apart. This module
// is only the SOC-side call — it seats the mission's Cypher via the
// controller's own sit(), and documents what the SOC relies on:
//
// - sit() stops the mixer and holds SEATED_POSE, so nothing can pull
//   him out of the chair — no walk clip, no patrol, no sliding.
// - Talking still shows: setTalking() sets the flag (it starts no clip
//   while seated) and update() re-applies the pose after the mixer and
//   adds the audio-reactive head bob from setTalkLevel.
// - The scene therefore never calls play()/setTalking() to start a clip
//   on him, and never needs to re-apply the pose itself — the
//   controller does it in update().
//
// The seat spot is CYPHER_SEAT_M (socLayout.js): the same chair the
// panel uses (CYPHER_CHAIR_M), shifted 0.15 m west so he sits clear
// of the near monitor. The scene positions him there; this module
// only seats him.
export function seatRobot(controller) {
  if (!controller || typeof controller.sit !== 'function') return false;
  return controller.sit();
}
