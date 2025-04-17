import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  className?: string;
  maxSize?: number;
  accept?: Record<string, string[]>;
}

const UploadDropzone = ({
  onFileSelect,
  className,
  maxSize = 104857600, // 100MB default
  accept = {
    "audio/*": [".mp3", ".wav", ".aac", ".flac", ".ogg", ".m4a"],
  },
}: UploadDropzoneProps) => {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setError(null);
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
  });

  // Handle file rejection errors
  React.useEffect(() => {
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      if (rejection.errors.some((e) => e.code === "file-too-large")) {
        setError(`File is too large. Maximum size is ${maxSize / 1024 / 1024}MB.`);
      } else if (rejection.errors.some((e) => e.code === "file-invalid-type")) {
        setError("Please upload an audio file (MP3, WAV, etc.)");
      } else {
        setError("Invalid file. Please try again.");
      }
    }
  }, [fileRejections, maxSize]);

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
        isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:bg-gray-50",
        className
      )}
    >
      <div className="space-y-4">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <Upload className="h-12 w-12" />
        </div>

        <div>
          <p className="text-gray-700 font-medium">Drag and drop your audio file here</p>
          <p className="text-sm text-gray-500 mt-1">
            or <span className="text-primary font-medium">browse</span> to select a file
          </p>
        </div>

        <p className="text-xs text-gray-500">
          Supported formats: MP3, WAV, AAC, FLAC (Max 100MB)
        </p>

        {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

        <input {...getInputProps()} />
      </div>
    </div>
  );
};

export default UploadDropzone;
