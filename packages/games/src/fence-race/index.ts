export {
  type Fence,
  type FenceDirection,
  type FenceRaceCell,
  fenceRaceDistance,
  fenceRaceGoalSide,
  fenceRaceIsGoal,
  fenceRaceStartSide,
  fenceRaceWay,
  sameFence,
} from "./board";
export {
  FENCE_RACE_GATE_CELLS,
  FENCE_RACE_ISSUE,
  FENCE_RACE_REASON,
  FENCE_RACE_SIDE,
  fenceRaceMoveLimit,
  type FenceRaceSide,
} from "./constants";
export {
  fenceRace,
  type FenceRaceFenceIssue,
  fenceRaceFenceIssue,
  type FenceRaceMove,
  type FenceRaceState,
} from "./rules";
