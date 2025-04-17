import React, { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AudioFileInfo } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Music, ArrowLeft, Play, Pause, Share } from "lucide-react";
import { formatDate, formatFileSize } from "@/lib/audio";
import { useToast } from "@/hooks/use-toast";

export default function AudioFilePage() {
  const [match, params] = useRoute("/audio/:uuid");
  const uuid = params?.uuid;
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  const { data: file, isLoading, error } = useQuery<AudioFileInfo>({
    queryKey: ["/api/audio/file", uuid],
    enabled: !!uuid,
  });

  useEffect(() => {
    if (!uuid) {
      setLocation("/");
    }

    // Update the OG meta tags for this specific audio file
    if (file) {
      const ogUrlMeta = document.querySelector('meta[property="og:url"]');
      const ogTitleMeta = document.querySelector('meta[property="og:title"]');
      const ogDescriptionMeta = document.querySelector('meta[property="og:description"]');
      const ogAudioMeta = document.querySelector('meta[property="og:audio"]');
      const ogAudioTypeMeta = document.querySelector('meta[property="og:audio:type"]');
      const twitterUrlMeta = document.querySelector('meta[property="twitter:url"]');
      const twitterTitleMeta = document.querySelector('meta[property="twitter:title"]');
      const twitterDescriptionMeta = document.querySelector('meta[property="twitter:description"]');

      if (ogUrlMeta) ogUrlMeta.setAttribute('content', window.location.href);
      if (ogTitleMeta) ogTitleMeta.setAttribute('content', `Listen to ${file.originalFilename} | AudioShare.com`);
      if (ogDescriptionMeta) ogDescriptionMeta.setAttribute('content', `Audio file: ${file.originalFilename} (${formatFileSize(file.fileSize)})`);
      if (ogAudioMeta) ogAudioMeta.setAttribute('content', file.downloadUrl);
      if (ogAudioTypeMeta) ogAudioTypeMeta.setAttribute('content', file.mimeType);
      if (twitterUrlMeta) twitterUrlMeta.setAttribute('content', window.location.href);
      if (twitterTitleMeta) twitterTitleMeta.setAttribute('content', `Listen to ${file.originalFilename} | AudioShare.com`);
      if (twitterDescriptionMeta) twitterDescriptionMeta.setAttribute('content', `Audio file: ${file.originalFilename} (${formatFileSize(file.fileSize)})`);
    }
  }, [uuid, file, setLocation]);

  if (isLoading) {
    return (
      <div className="container max-w-4xl px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-medium">Loading audio file...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="container max-w-4xl px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-medium mb-4">Audio file not found</h2>
            <Button onClick={() => setLocation("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const togglePlayPause = () => {
    if (!audioElement) {
      const audio = new Audio(file.downloadUrl);
      audio.addEventListener("ended", () => {
        setIsPlaying(false);
      });
      setAudioElement(audio);
      audio.play();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audioElement.pause();
      } else {
        audioElement.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      variant: "success",
      title: "Link copied!",
      description: "Audio file link copied to clipboard",
    });
  };

  return (
    <div className="container max-w-4xl px-4 py-8">
      <Button variant="ghost" onClick={() => setLocation("/")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Button>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start">
            {/* Audio Icon */}
            <div className="flex-shrink-0 mr-6">
              <div className="h-20 w-20 rounded-lg bg-primary/10 flex items-center justify-center">
                <Music className="h-10 w-10 text-primary" />
              </div>
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {file.originalFilename}
              </h1>
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <span className="font-medium">{formatFileSize(file.fileSize)}</span>
                <span className="mx-2">•</span>
                <span>Uploaded {formatDate(file.createdAt)}</span>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Download Button */}
                <Button 
                  className="flex-1"
                  size="lg"
                  onClick={() => window.open(file.downloadUrl, "_blank")}
                >
                  Download Audio
                </Button>

                {/* Player Button */}
                <Button
                  variant="outline"
                  size="lg"
                  onClick={togglePlayPause}
                  className="flex-1"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="mr-2 h-5 w-5" />
                      Pause Audio
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      Play Audio
                    </>
                  )}
                </Button>
                
                {/* Share Button */}
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleShareLink}
                  className="flex-1"
                >
                  <Share className="mr-2 h-5 w-5" />
                  Share Link
                </Button>
              </div>
              
              {/* Audio Player */}
              <div className="mt-8">
                <audio
                  controls
                  className="w-full"
                  src={`/api/audio/stream/${file.uuid}`}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}