export type Participant = {
  socketId: string;
  displayName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string;
  body: string;
  createdAt: string;
  attachmentUrl?: string;
};
