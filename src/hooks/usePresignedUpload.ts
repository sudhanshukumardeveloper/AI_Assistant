import { useCallback, useState } from "react";

type UploadState = {
  progress: number;
  uploading: boolean;
  error: string | null;
  objectKey: string | null;
};

export function usePresignedUpload() {
  const [state, setState] = useState<UploadState>({
    progress: 0, uploading: false, error: null, objectKey: null
  });

  const upload = useCallback(async (file: File) => {
    setState({ progress: 0, uploading: true, error: null, objectKey: null });

    try {
      const meta = await fetch("/api/s3-upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          sizeBytes: file.size
        })
      });

      if (!meta.ok) throw new Error((await meta.json()).error || "Failed to sign upload");
      const { uploadUrl, objectKey } = await meta.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setState(s => ({ ...s, progress: Math.round((event.loaded / event.total) * 100) }));
          }
        };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`S3 upload failed: ${xhr.status}`));
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      setState({ progress: 100, uploading: false, error: null, objectKey });
      return objectKey;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setState(s => ({ ...s, uploading: false, error: message }));
      throw error;
    }
  }, []);

  return { ...state, upload };
}
