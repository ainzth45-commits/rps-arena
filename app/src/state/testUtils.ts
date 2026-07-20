// ตัวช่วยสร้าง state สมมุติสำหรับเทส — **ห้ามใส่ชื่อจริงพนักงานที่นี่** (repo เป็น public)
import type { Move, MoveSet } from "../domain/types";
import { addPlayer, confirmMoveSet } from "./actions";
import { createInitialState, type GameState } from "./gameState";

export const T0 = 1_700_000_000_000;

export const TEST_PLAYERS: { id: string; name: string }[] = [
  { id: "A101", name: "นักสู้หมายเลขหนึ่ง" },
  { id: "B202", name: "นักสู้หมายเลขสอง" },
  { id: "C303", name: "นักสู้หมายเลขสาม" },
  { id: "D404", name: "นักสู้หมายเลขสี่" },
];

/**
 * state พร้อมเล่น — ผู้เล่น 4 คน
 * @param armedCount กี่คนที่ตั้งชุดมูฟแล้ว (ลงสังเวียน) นับจากคนแรก
 */
export function makeTestState(armedCount = 4, moveSet: MoveSet = ["rock", "scissors", "paper"]): GameState {
  let state = createInitialState(T0);
  for (const player of TEST_PLAYERS) {
    state = addPlayer(state, player.id, player.name, "");
  }
  for (const player of TEST_PLAYERS.slice(0, armedCount)) {
    state = confirmMoveSet(state, player.id, moveSet);
  }
  return state;
}

/**
 * ตั้งชุดมูฟให้คนใดคนหนึ่งแบบเจาะจง (ใช้ตอนอยากคุมว่าผู้ท้าชิงจะออกมูฟอะไร)
 * เขียนทับ state ตรงๆ ไม่ผ่าน confirmMoveSet เพราะเป็นการ "จัดฉาก" ก่อนเริ่มเทส
 * ไม่ใช่การกระทำของผู้เล่น จึงไม่ต้องติดกติกาเรื่องรอบ
 */
export function armWith(state: GameState, playerId: string, moves: [Move, Move, Move]): GameState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId ? { ...player, moveSet: [...moves] as MoveSet, pointerIndex: 0 } : player,
    ),
  };
}
