import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import UploadDropzone from "@/components/ui/upload-dropzone";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { uploadAudioFile } from "@/lib/audio";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface UploadCardProps {
  className?: string;
}

interface UploadStatus {
  isUploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

const UploadCard: React.FC<UploadCardProps> = ({ className }) => {
  const { toast } = useToast();
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    isUploading: false,
    progress: 0,
    error: null,
    success: false,
  });

  const handleFileSelect = async (file: File) => {
    if (uploadStatus.isUploading) return;

    setUploadStatus({
      isUploading: true,
      progress: 0,
      error: null,
      success: false,
    });

    try {
      const audioFile = await uploadAudioFile(file, (progress) => {
        setUploadStatus((prev) => ({
          ...prev,
          progress,
        }));
      });

      setUploadStatus({
        isUploading: false,
        progress: 100,
        error: null,
        success: true,
      });

      toast({
        variant: "success",
        title: "Upload successful!",
        description: "Your audio link is ready.",
      });

      // Refresh the file list
      queryClient.invalidateQueries({ queryKey: ["/api/audio/files"] });

      // Reset success state after a delay
      setTimeout(() => {
        setUploadStatus((prev) => ({
          ...prev,
          success: false,
        }));
      }, 3000);
    } catch (error) {
      setUploadStatus({
        isUploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : "An unknown error occurred",
        success: false,
      });
    }
  };

  const handleDismissError = () => {
    setUploadStatus((prev) => ({
      ...prev,
      error: null,
    }));
  };

  const triggerFileInput = () => {
    document.getElementById("fileInput")?.click();
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-800">
          Upload Audio File
        </CardTitle>
      </CardHeader>
      <CardContent>
        <UploadDropzone onFileSelect={handleFileSelect} />

        <div className="mt-4 flex justify-center">
          <Button
            onClick={triggerFileInput}
            className="inline-flex items-center shadow-sm"
            disabled={uploadStatus.isUploading}
          >
            Browse Files
          </Button>
          <input
            type="file"
            id="fileInput"
            className="hidden"
            accept="audio/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileSelect(file);
              }
            }}
          />
        </div>

        {/* Upload Status Section */}
        {(uploadStatus.isUploading || uploadStatus.error || uploadStatus.success) && (
          <div className="p-4 bg-gray-50 border-t border-gray-200 mt-6 rounded-b-lg">
            {/* Upload Progress */}
            {uploadStatus.isUploading && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Uploading file...
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {uploadStatus.progress}%
                  </span>
                </div>
                <Progress value={uploadStatus.progress} className="h-2" />
              </div>
            )}

            {/* Upload Error */}
            {uploadStatus.error && (
              <div className="bg-red-50 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Upload failed</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{uploadStatus.error}</p>
                    </div>
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        onClick={handleDismissError}
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Success */}
            {uploadStatus.success && (
              <div className="bg-green-50 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-green-800">
                      Upload successful!
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Your audio file has been uploaded and your link is ready in the list below.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadCard;
