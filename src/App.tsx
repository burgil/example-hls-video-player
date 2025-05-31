import { useMemo, useEffect, useRef, useState } from "react"
import { PlayIcon, Volume1Icon, Volume2Icon, VolumeIcon, FullscreenIcon, SettingsIcon, PauseIcon } from 'lucide-react';
import Hls from "hls.js";
import { parseTime } from "./utils";

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentVolume, setCurrentVolume] = useState(0.5);

  // Test Input:
  const testInput = useMemo(() => {
    return {
      "hlsPlaylistUrl": "https://vz-50e60d70-540.b-cdn.net/b87ac5f4-2cf0-42d1-acc8-32a89d3c71c7/playlist.m3u8",
      "videoLength": 348, // seconds
      "chapters": [
        { "title": "Introduction & Course Overview", "start": 0, "end": 14 },
        {
          "title": "Curiosity's Role in Critical & Creative Thinking",
          "start": 15,
          "end": 57
        },
        {
          "title": "Analytical vs Creative Thinking Explained",
          "start": 58,
          "end": 116
        },
        {
          "title": "Building Your Bank of Dots",
          "start": 117,
          "end": 138
        },
        {
          "title": "Practical Strategies to Stay Curious",
          "start": 139,
          "end": 225
        },
        { "title": "Benefits of Curiosity", "start": 226, "end": 312 },
        { "title": "Conclusion & Recap", "start": 313, "end": 348 }
      ]
    }
  }, []);

  // HLS.js
  useEffect(() => {
    const hls = new Hls({
      "debug": false
    });
    if (Hls.isSupported()) {
      hls.loadSource(testInput.hlsPlaylistUrl);
      if (videoRef.current) {
        hls.attachMedia(videoRef.current);
        setIsVideoLoaded(true);
      }
      hls.on(Hls.Events.ERROR, (err) => {
        console.log(err)
      });
    } else {
      console.error('HLS is not supported on this browser!')
    }
  }, [testInput])

  // Update the volume:
  useEffect(() => {
    if (videoRef.current && isVideoLoaded) {
      videoRef.current.volume = currentVolume;
    }
  }, [currentVolume, isVideoLoaded]);

  return (
    <>
      <div className="m-auto max-w-[570px] relative">
        <video
          ref={videoRef}
        />
        {/* Controls */}
        <div className="flex absolute bottom-0 left-0 right-0">
          {/* Play/Pause */}
          <div className='cursor-pointer' onClick={() => {
            if (isVideoPlaying) {
              videoRef.current?.pause();
              setIsVideoPlaying(false);
            } else {
              videoRef.current?.play();
              setIsVideoPlaying(true);
            }
          }}>
            {isVideoPlaying ? (
              <PauseIcon />
            ) : (
              <PlayIcon />
            )}
          </div>
          {/* Volume */}
          {currentVolume >= 75 ? (
            <Volume2Icon />
          ) : currentVolume === 0 ? (
            <VolumeIcon />
          ) : (
            <Volume1Icon />
          )}
          {/* Time */}
          <div>{parseTime(currentTime)} / {parseTime(testInput.videoLength)}</div>
          {/* Settings */}
          <SettingsIcon />
          {/* Fullscreen */}
          <FullscreenIcon />
          {/* Chapters */}
          {testInput.chapters.map((chapter, index) => {
            return (
              <div key={`chapter_${index}`} className="hidden absolute">
                <div>{chapter.title}</div>
              </div>
            )
          })}
          <img src="/yeda.svg" width={42} alt="yeda logo" />
        </div>
      </div>
    </>
  )
}

export default App
