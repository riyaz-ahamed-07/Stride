import assert from "node:assert/strict";
import test from "node:test";
import {
  createSitStandHold,
  createSitStandState,
  updateSitStand,
} from "../src/lib/pose/sitToStand.ts";
import type { SitStandPhase } from "../src/lib/pose/sitToStand.ts";
import { sitStandObservations } from "../src/lib/pose/observations.ts";
import { jointAngle } from "../src/lib/pose/landmarks.ts";

test("sit-to-stand counts one rep on stand then sit", () => {
  let state = createSitStandState();
  const hold = { count: 0, candidate: "unknown" as SitStandPhase };

  for (let i = 0; i < 6; i++) state = updateSitStand(state, 90, 0.9, hold);
  assert.equal(state.phase, "sitting");

  for (let i = 0; i < 6; i++) state = updateSitStand(state, 170, 0.9, hold);
  assert.equal(state.phase, "standing");
  assert.equal(state.reps, 0);

  for (let i = 0; i < 6; i++) state = updateSitStand(state, 90, 0.9, hold);
  assert.equal(state.phase, "sitting");
  assert.equal(state.reps, 1);
});

test("low confidence does not change phase", () => {
  let state = createSitStandState();
  const hold = { count: 0, candidate: "unknown" as SitStandPhase };
  for (let i = 0; i < 6; i++) state = updateSitStand(state, 90, 0.9, hold);
  const before = state.phase;
  state = updateSitStand(state, 170, 0.2, hold);
  assert.equal(state.reliable, false);
  assert.equal(state.phase, before);
});

test("mid-zone while sitting reports rising", () => {
  let state = createSitStandState();
  const hold = createSitStandHold();
  for (let i = 0; i < 6; i++) state = updateSitStand(state, 90, 0.9, hold);
  state = updateSitStand(state, 130, 0.9, hold);
  assert.equal(state.phase, "rising");
  assert.equal(state.reps, 0);
});

test("incomplete rise returns to sit without a rep", () => {
  let state = createSitStandState();
  const hold = createSitStandHold();
  for (let i = 0; i < 6; i++) state = updateSitStand(state, 90, 0.9, hold);
  for (let i = 0; i < 8; i++) state = updateSitStand(state, 130, 0.9, hold);
  for (let i = 0; i < 4; i++) state = updateSitStand(state, 90, 0.9, hold);
  assert.equal(state.phase, "sitting");
  assert.equal(state.reps, 0);
  assert.equal(state.incompleteAttempts, 1);
});

test("trunk lean events increment once per continuous lean", () => {
  let state = createSitStandState();
  const hold = createSitStandHold();
  for (let i = 0; i < 6; i++) state = updateSitStand(state, 90, 0.9, hold);
  for (let i = 0; i < 6; i++) state = updateSitStand(state, 170, 0.9, hold);
  state = updateSitStand(
    state,
    { kneeDeg: 170, confidence: 0.9, trunkOffset: 0.12 },
    hold,
  );
  state = updateSitStand(
    state,
    { kneeDeg: 170, confidence: 0.9, trunkOffset: 0.12 },
    hold,
  );
  assert.equal(state.trunkLeanEvents, 1);
});

test("observations separate reps from optional rule flags", () => {
  const state = {
    ...createSitStandState(),
    reps: 3,
    incompleteAttempts: 2,
    trunkLeanEvents: 1,
    kneeAsymmetryEvents: 0,
  };
  const drafts = sitStandObservations(state, 0.8);
  assert.equal(drafts[0]?.metric, "repetitions");
  assert.equal(drafts[0]?.value, 3);
  assert.ok(drafts.some((d) => d.metric === "incomplete_attempts"));
  assert.ok(drafts.some((d) => d.metric === "trunk_lateral_offset_events"));
  assert.equal(drafts.some((d) => d.metric === "knee_asymmetry_events"), false);
});

test("jointAngle is symmetric about the vertex", () => {
  const deg = jointAngle(
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 1, y: 1, z: 0 },
  );
  assert.ok(Math.abs(deg - 90) < 0.01);
});
