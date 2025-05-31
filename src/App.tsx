import { useMemo, useEffect, useRef, useState } from 'react'
import { PlayIcon, Volume1Icon, Volume2Icon, VolumeIcon, FullscreenIcon, SettingsIcon, PauseIcon, LoaderIcon } from 'lucide-react';
import Hls from 'hls.js';
import { parseTime } from './utils';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isTooltipReadyToShow, setIsTooltipReadyToShow] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentVolume, setCurrentVolume] = useState(0.5);
  const [timelineHoverTime, setTimelineHoverTime] = useState<number | null>(null);
  const [timelineHoverX, setTimelineHoverX] = useState<number | null>(null);
  const [tooltipLeftStyle, setTooltipLeftStyle] = useState<string | number>('50%');
  const [tooltipTransformStyle, setTooltipTransformStyle] = useState<string>('translateX(-50%)');

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
      }
      hls.on(Hls.Events.ERROR, (err) => {
        if (err !== 'hlsError') console.log(err);
      });
    } else {
      console.error('HLS is not supported on this browser!')
    }
    return () => { // reset values on hot module reload
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

  // On video end:
  useEffect(() => {
    if (!isVideoLoaded) return;
    const video = videoRef.current;
    if (!video) return;
    function videoEnded() {
      if (video) {
        console.log("Video finished playing")
      }
    }
    video.addEventListener('ended', videoEnded);
    return () => {
      video.removeEventListener('ended', videoEnded);
    }
  }, [isVideoLoaded]);

  // On video load:
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    function videoLoaded() {
      if (video) {
        console.log("Video finished loading")
        setIsVideoLoaded(true);
      }
    }
    video.addEventListener('loadedmetadata', videoLoaded); // not sure if I should use loadeddata or loadedmetadata, works fine with both
    return () => {
      video.removeEventListener('loadedmetadata', videoLoaded);
    }
  }, []);

  // Make chapters follow mouse:
  useEffect(() => {
    if (timelineHoverX !== null && timelineHoverTime !== null && tooltipRef.current && timelineRef.current && testInput.videoLength) { // types safe
      // calculate mouse position relative to the timeline width
      const timelineRect = timelineRef.current.getBoundingClientRect();
      const tooltipElement = tooltipRef.current;
      const tooltipWidth = tooltipElement.offsetWidth;
      if (tooltipWidth === 0) {
        setIsTooltipReadyToShow(false);
        return; // on load or if tooltip not ready (fixes a glitch where the tooltip shows in the last position for a brief moment)
      }
      const timelineWidth = timelineRect.width;
      const hoverX = timelineHoverX; // tmp clone
      // default position - center:
      let newTooltipLeft: string | number = hoverX;
      let newTooltipTransform = 'translateX(-50%)'; // controls the tooltip position using the GPU
      let newArrowLeft = '50%'; // helps move the arrow left and right on the edges
      const halfTooltipWidth = tooltipWidth / 2;
      const edgePadding = 2;
      // calculate new position every time the hover time changes..
      if (hoverX - halfTooltipWidth < edgePadding) { // limits from left side
        newTooltipLeft = `${edgePadding}px`;
        newTooltipTransform = 'translateX(0%)';
        const rawArrowLeft = hoverX - edgePadding;
        const arrowMin = Math.max(0, tooltipWidth * 0.1);
        const arrowMax = tooltipWidth * 0.9;
        newArrowLeft = `${Math.max(arrowMin, Math.min(rawArrowLeft, arrowMax))}px`;
      } else if (hoverX + halfTooltipWidth > timelineWidth - edgePadding) { // limits from right side
        newTooltipLeft = `${timelineWidth - edgePadding}px`;
        newTooltipTransform = 'translateX(-100%)';
        const tooltipActualLeftEdge = timelineWidth - edgePadding - tooltipWidth;
        const rawArrowLeft = hoverX - tooltipActualLeftEdge;
        const arrowMin = Math.max(0, tooltipWidth * 0.1);
        const arrowMax = tooltipWidth * 0.9;
        newArrowLeft = `${Math.max(arrowMin, Math.min(rawArrowLeft, arrowMax))}px`;
      }
      // make tooltip and the arrow follow the mouse using the states and the css variable:
      setTooltipLeftStyle(newTooltipLeft);
      setTooltipTransformStyle(newTooltipTransform);
      tooltipElement.style.setProperty('--arrow-left', newArrowLeft);
      setIsTooltipReadyToShow(true);
    } else {
      setIsTooltipReadyToShow(false);
    }
  }, [timelineHoverX, timelineHoverTime, testInput.videoLength]);

  return (
    <>
      {!isVideoLoaded && <LoaderIcon className='animate-spin m-auto w-full' />}
      <div id='video-player' className={`${!isVideoLoaded ? 'hidden ' : ''}rounded-[10px] overflow-hidden m-auto max-w-[570px] relative${!isVideoPlaying ? ' cursor-pointer' : ''}`}>
        <video
          ref={videoRef}
          className='w-full h-full'
        />
        {/* Timeline */}
        <div
          ref={timelineRef}
          className='flex gap-1 w-full absolute z-20 bottom-[25px] left-0 right-0 px-1 cursor-pointer'
          onMouseMove={(event) => {
            if (!timelineRef.current || !testInput.videoLength) return;
            const timelineRect = timelineRef.current.getBoundingClientRect(); // get relative mouse position
            const hoverX = event.clientX - timelineRect.left;
            let hoverPercent = hoverX / timelineRect.width;
            hoverPercent = Math.max(0, Math.min(1, hoverPercent));
            const hoveredTime = hoverPercent * testInput.videoLength; // calculate hovered time
            // show the current chapter tooltip:
            setTimelineHoverTime(hoveredTime);
            setTimelineHoverX(hoverX);
          }}
          onMouseLeave={() => { // hide the current chapter tooltip:
            setTimelineHoverTime(null);
            setTimelineHoverX(null);
            // setIsTooltipReadyToShow(false); // This will be handled by the useEffect above
          }}
          onClick={(event) => { // move the video to the clicked position:
            if (!timelineRef.current || !videoRef.current || !testInput.videoLength) return;
            const rect = timelineRef.current.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            let clickPercent = clickX / rect.width;
            clickPercent = Math.max(0, Math.min(1, clickPercent));
            const clickedTime = clickPercent * testInput.videoLength; // calculate clicked time
            videoRef.current.currentTime = clickedTime;
            setCurrentTime(clickedTime); // change video current time
          }}
        >
          {/* Chapters Timeline */}
          {testInput.chapters.map((chapter, index) => { // create the chapter line based on its duration
            const chapterDuration = chapter.end - chapter.start; // seconds
            const chapterWidthPercent = (testInput.videoLength > 0) ? (chapterDuration / testInput.videoLength) * 100 : 0;
            return (
              <div
                key={`chapter_${index}`}
                className='chapter pt-3 pb-5 relative'
                style={{ flexBasis: `${chapterWidthPercent}%`, flexGrow: 0, flexShrink: 0 }}
              >
                <div className='chapter-line bg-[#ffffff70] transition-colors w-full h-[1.4px]'></div>
              </div>
            )
          })}
          {/* Chapter tooltip */}
          {timelineHoverTime !== null && timelineHoverX !== null && (() => {
            const currentChapterForTooltip = testInput.chapters.find(ch => timelineHoverTime >= ch.start && timelineHoverTime < ch.end) || (timelineHoverTime === testInput.videoLength ? testInput.chapters[testInput.chapters.length - 1] : null);
            if (!currentChapterForTooltip) return null;
            return (
              <div
                ref={tooltipRef}
                className={`pointer-events-none select-none absolute p-2 rounded-[4px] bottom-[38px] arrow h-fit text-center text-xs z-30
                  ${isTooltipReadyToShow
                    ? 'opacity-100 transition-opacity'
                    : 'opacity-0'
                  }`}
                style={{
                  background: 'linear-gradient(#333, #222)',
                  minWidth: '80px',
                  padding: '6px 10px',
                  left: tooltipLeftStyle,
                  transform: tooltipTransformStyle,
                  whiteSpace: 'nowrap',
                }}
              >
                <div>{currentChapterForTooltip.title}</div>
                <div>{parseTime(timelineHoverTime)}</div>
              </div>
            );
          })()}
        </div>
        {/* Controls */}
        <div className='flex align-center min-h-[30px] pb-2 pt-5 justify-between absolute z-10 bottom-0 left-0 right-0 cursor-auto'
          style={{
            background: 'linear-gradient(0deg, rgb(0 0 0 / 79%), transparent)'
          }}>
          {/* Left Side */}
          <div className='flex gap-4 ml-3'>
            {/* Play/Pause */}
            <div className='cursor-pointer relative z-30' onClick={() => {
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
            <div className='cursor-pointer relative z-30' onClick={() => {
              if (currentVolume > 0.5) {
                setCurrentVolume(0.5);
              } else if (currentVolume === 0) {
                setCurrentVolume(1.0);
              } else {
                setCurrentVolume(0.0);
              }
            }}>
              {currentVolume > 0.5 ? (
                <Volume2Icon />
              ) : currentVolume === 0 ? (
                <VolumeIcon />
              ) : (
                <Volume1Icon />
              )}
            </div>
            {/* Time */}
            <div className='select-none'>{parseTime(currentTime)} / {parseTime(testInput.videoLength)}</div>
          </div>
          {/* Right Side */}
          <div className='flex gap-4 mr-3'>
            {/* Settings */}
            <div className='cursor-pointer relative z-30' onClick={() => {
              alert('WIP')
            }}>
              <SettingsIcon />
            </div>
            {/* Fullscreen */}
            <div className='cursor-pointer relative z-30' onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else {
                document.getElementById('video-player')?.requestFullscreen();
              }
            }}>
              <FullscreenIcon />
            </div>
            <img src='/yeda.svg' draggable={false} className='select-none' width={42} alt='yeda logo' />
          </div>
        </div>
      </div>
    </>
  )
}

export default App
