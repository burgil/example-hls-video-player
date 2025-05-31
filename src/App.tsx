import { useMemo, useEffect, useRef, useState } from 'react'
import { PlayIcon, Volume1Icon, Volume2Icon, VolumeIcon, FullscreenIcon, SettingsIcon, PauseIcon } from 'lucide-react';
import Hls from 'hls.js';
import { parseTime } from './utils';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentVolume, setCurrentVolume] = useState(0.5);

  // Test Input:
  const testInput = useMemo(() => {
    return {
      'hlsPlaylistUrl': 'https://vz-50e60d70-540.b-cdn.net/b87ac5f4-2cf0-42d1-acc8-32a89d3c71c7/playlist.m3u8',
      'videoLength': 348, // seconds
      'chapters': [
        { 'title': 'Introduction & Course Overview', 'start': 0, 'end': 14 },
        {
          'title': 'Curiosity\'s Role in Critical & Creative Thinking',
          'start': 15,
          'end': 57
        },
        {
          'title': 'Analytical vs Creative Thinking Explained',
          'start': 58,
          'end': 116
        },
        {
          'title': 'Building Your Bank of Dots',
          'start': 117,
          'end': 138
        },
        {
          'title': 'Practical Strategies to Stay Curious',
          'start': 139,
          'end': 225
        },
        { 'title': 'Benefits of Curiosity', 'start': 226, 'end': 312 },
        { 'title': 'Conclusion & Recap', 'start': 313, 'end': 348 }
      ]
    }
  }, []);

  // HLS.js
  useEffect(() => {
    const hls = new Hls({
      'debug': false
    });
    if (Hls.isSupported()) {
      hls.loadSource(testInput.hlsPlaylistUrl);
      if (videoRef.current) {
        hls.attachMedia(videoRef.current);
        setIsVideoLoaded(true);
      }
      hls.on(Hls.Events.ERROR, (err) => {
        if (err !== 'hlsError') console.log(err);
      });
    } else {
      console.error('HLS is not supported on this browser!')
    }
    return () => { // Reset values on hot module reload
      setIsVideoLoaded(false);
      setIsVideoPlaying(false);
      setCurrentTime(0);
      setCurrentVolume(0.5);
    }
  }, [testInput])

  // Update the volume:
  useEffect(() => {
    if (videoRef.current && isVideoLoaded) {
      videoRef.current.volume = currentVolume;
    }
  }, [currentVolume, isVideoLoaded]);

  // Play/pause when you click the video element:
  useEffect(() => {
    if (!isVideoLoaded) return;
    const video = videoRef.current;
    if (!video) return;
    function playPauseVideo() {
      if (isVideoPlaying) {
        video?.pause();
        setIsVideoPlaying(false);
      } else {
        video?.play();
        setIsVideoPlaying(true);
      }
    }
    video.addEventListener('click', playPauseVideo);
    return () => {
      video.removeEventListener('click', playPauseVideo);
    }
  }, [isVideoLoaded, isVideoPlaying]);

  // Sync video duration:
  useEffect(() => {
    if (!isVideoLoaded) return;
    const video = videoRef.current;
    if (!video) return;
    function syncVideoTime() {
      if (video) {
        setCurrentTime(video.currentTime)
      }
    }
    video.addEventListener('timeupdate', syncVideoTime);
    return () => {
      video.removeEventListener('timeupdate', syncVideoTime);
    }
  }, [isVideoLoaded]);

  return (
    <>
      <div className={`m-auto max-w-[570px] relative${!isVideoPlaying ? ' cursor-pointer' : ''}`}>
        <video
          ref={videoRef}
        />
        {/* Controls */}
        <div className='flex align-center min-h-[30px] pb-2 pt-5 justify-between absolute z-10 bottom-0 left-0 right-0 cursor-auto'
          style={{
            background: 'linear-gradient(0deg, rgb(0 0 0 / 79%), transparent)'
          }}>
          {/* Left Side */}
          <div className='flex gap-4 ml-3'>
            {/* Play/Pause */}
            <div className='cursor-pointer' onClick={() => {

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
            <div className='select-none'>{parseTime(currentTime)} / {parseTime(testInput.videoLength)}</div>
          </div>
          {/* Right Side */}
          <div className='flex gap-4 mr-3'>
            {/* Settings */}
            <SettingsIcon />
            {/* Fullscreen */}
            <FullscreenIcon />
            {/* Chapters */}
            {testInput.chapters.map((chapter, index) => {
              return (
                <div key={`chapter_${index}`} className='hidden absolute'>
                  <div>{chapter.title}</div>
                </div>
              )
            })}
            <img src='/yeda.svg' draggable={false} className='select-none' width={42} alt='yeda logo' />
          </div>
        </div>
      </div>
    </>
  )
}

export default App
