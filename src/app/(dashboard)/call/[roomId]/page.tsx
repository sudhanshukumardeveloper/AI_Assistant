import VideoGrid from "@/components/video/VideoGrid";

export default async function CallPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <VideoGrid roomId={roomId} />;
}
