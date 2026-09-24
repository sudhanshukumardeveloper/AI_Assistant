import { redisState } from "./redisClient";

const key = (roomId: string) => `room:${roomId}:members`;

export async function addMember(roomId: string, socketId: string) {
  await redisState.sadd(key(roomId), socketId);
}

export async function removeMember(roomId: string, socketId: string) {
  await redisState.srem(key(roomId), socketId);
  if ((await redisState.scard(key(roomId))) === 0) await redisState.del(key(roomId));
}

export async function listMembers(roomId: string) {
  return redisState.smembers(key(roomId));
}
