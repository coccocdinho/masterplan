import { R } from "./constants";

export const canCreate = (me, tgt) =>
  me === R.S ? [R.A, R.U].includes(tgt) : me === R.A ? tgt === R.U : false;
export const canResetPw = (me, tgt) => me === R.S || (me === R.A && tgt === R.U);
// Fixed from the Vite prototype: field set at task creation is `by`, not `createdBy`.
export const canDelTask = (t, me, uid) =>
  !t ? false : me === R.A || me === R.S || t.by === uid;
export const canDelProj = (me) => me === R.S;
export const canLog = (me) => me === R.A || me === R.S;
export const canUsers = (me) => me === R.A || me === R.S;
export const canAssignOwner = (me) => me === R.A || me === R.S;
