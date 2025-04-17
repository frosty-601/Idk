import React from "react";
import { useQuery } from "@tanstack/react-query";
import UploadCard from "@/components/upload-card";
import FileCard from "@/components/file-card";
import { AudioFileInfo } from "@shared/schema";
import { AlertOctagon } from "lucide-react";

const Home: React.FC = () => {
  const {
    data: files,
    isLoading,
    error,
  } = useQuery<AudioFileInfo[]>({
    queryKey: ["/api/audio/files"],
    staleTime: 30000, // 30 seconds
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AudioLink</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Upload your audio files and get a shareable audio link.
          </p>
        </header>

        <div className="max-w-3xl mx-auto">
          {/* Upload Card */}
          <UploadCard />

          {/* Files List Section */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Audio Files</h2>

            {isLoading && (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <p className="text-gray-500">Loading files...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 p-6 rounded-lg shadow-md flex items-center">
                <AlertOctagon className="h-6 w-6 text-red-500 mr-2" />
                <p className="text-red-700">
                  Error loading files: {error instanceof Error ? error.message : "Unknown error"}
                </p>
              </div>
            )}

            {!isLoading && !error && files && files.length === 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <p className="text-gray-500">No files uploaded yet.</p>
              </div>
            )}

            {!isLoading && !error && files && files.length > 0 && (
              <div>
                {files.map((file) => (
                  <FileCard key={file.id} file={file} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
