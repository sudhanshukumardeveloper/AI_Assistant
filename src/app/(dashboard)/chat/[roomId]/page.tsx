import ChatWindow from "@/components/chat/ChatWindow";

export default async function ChatPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <ChatWindow roomId={roomId} />;
}
