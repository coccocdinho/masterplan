import { R } from "./constants";

export const canCreate = (me, tgt) =>
  me === R.S ? [R.A, R.U].includes(tgt) : me === R.A ? tgt === R.U : false;
export const canResetPw = (me, tgt) => me === R.S || (me === R.A && tgt === R.U);
// Fixed from the Vite prototype: field set at task creation is `by`, not `createdBy`.
// A task can be deleted by whoever created it, by the project's chủ trì, or by admin+.
export const canDelTask = (t, proj, me, uid) =>
  !t ? false : me === R.A || me === R.S || t.by === uid || (!!proj && proj.owner === uid);
export const canDelProj = (me) => me === R.S;
export const canLog = (me) => me === R.A || me === R.S;
export const canUsers = (me) => me === R.A || me === R.S;
export const canAssignOwner = (me) => me === R.A || me === R.S;
export const canSync = (me) => me === R.A || me === R.S;
// Project priority (Bình thường/Khẩn/Hỏa tốc) is set by admin+ or the project's chủ trì.
export const canSetPriority = (me, uid, proj) =>
  me === R.A || me === R.S || (!!proj && proj.owner === uid);
