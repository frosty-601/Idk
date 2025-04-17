import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AudioFileInfo } from "@shared/schema";
import { Music, Copy, Play, Trash, Pause } from "lucide-react";
import { formatDate, formatFileSize } from "@/lib/audio";
import { useToast } from "@/hooks/use-toast";
import { deleteAudioFile } from "@/lib/audio";
import { queryClient } from "@/lib/queryClient";

interface FileCardProps {
  file: AudioFileInfo;
}

const FileCard: React.FC<FileCardProps> = ({ file }) => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(file.downloadUrl);
    toast({
      variant: "success",
      title: "Link copied!",
      description: "Audio link copied to clipboard",
    });
  };

  const handleDeleteFile = async () => {
    try {
      setIsDeleting(true);
      await deleteAudioFile(file.id);
      queryClient.invalidateQueries({ queryKey: ["/api/audio/files"] });
      toast({
        variant: "success",
        title: "File deleted",
        description: "The audio file has been deleted",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete file",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioElement) {
      const audio = new Audio(file.downloadUrl);
      audio.addEventListener("ended", () => {
        setIsPlaying(false);
      });
      setAudioElement(audio);
      audio.play();
      setIsPlaying(true);
      setShowAudioPlayer(true);
    } else {
      if (isPlaying) {
        audioElement.pause();
      } else {
        audioElement.play();
      }
      setIsPlaying(!isPlaying);
      setShowAudioPlayer(true);
    }
  };

  return (
    <Card className="mb-4 overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start">
          {/* Audio Icon */}
          <div className="flex-shrink-0 mr-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Music className="h-6 w-6 text-primary" />
            </div>
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {file.originalFilename}
            </h3>
            <div className="mt-1 flex items-center text-sm text-gray-500">
              <span>{formatFileSize(file.fileSize)}</span>
              <span className="mx-2">•</span>
              <span>Uploaded {formatDate(file.createdAt)}</span>
            </div>

            {/* Download Link Section */}
            <div className="mt-4">
              <div className="flex items-center">
                <label className="block text-sm font-medium text-gray-700 mr-2">
                  Audio Link:
                </label>
                <div className="flex-1">
                  <span 
                    className="text-sm text-primary truncate cursor-pointer hover:underline max-w-[300px]" 
                    onClick={handleCopyLink}
                    title={file.downloadUrl}
                  >
                    {file.downloadUrl}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="ml-4 flex-shrink-0 flex space-x-2">
            {/* Copy Button */}
            <Button
              variant="outline"
              size="icon"
              className="rounded-full text-primary bg-primary/10 hover:bg-primary/20 focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              onClick={handleCopyLink}
            >
              <Copy className="h-5 w-5" />
            </Button>
            
            {/* Delete Button */}
            <Button
              variant="outline"
              size="icon"
              className="rounded-full text-red-600 bg-red-100 hover:bg-red-200 focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              onClick={handleDeleteFile}
              disabled={isDeleting}
            >
              <Trash className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileCard;
