import { useMemo, useEffect, useRef } from "react"
import { PlayIcon, Volume1Icon, Volume2Icon, VolumeIcon, FullscreenIcon, SettingsIcon } from 'lucide-react';
import Hls from "hls.js";
import { parseTime } from "./utils";

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);

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
      }
      hls.on(Hls.Events.ERROR, (err) => {
        console.log(err)
      });
    } else {
      console.error('HLS is not supported on this browser!')
    }
  }, [testInput])

  return (
    <>
      <div className="video-player-container">
        <video
          ref={videoRef}
          className='video-player'
        />
        <PlayIcon />
        <VolumeIcon />
        <Volume1Icon />
        <Volume2Icon />
        <FullscreenIcon />
        <SettingsIcon />
        <div>0:00 / {parseTime(testInput.videoLength)}</div>
        {testInput.chapters.map((chapter, index) => {
          return (
            <div key={`chapter_${index}`}>
              <div>{chapter.title}</div>
            </div>
          )
        })}
      </div>
    </>
  )
}

export default App
