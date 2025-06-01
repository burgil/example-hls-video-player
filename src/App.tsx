import { useMemo, useEffect, useRef, useState, useCallback } from 'react'
import { PlayIcon, Volume1Icon, Volume2Icon, VolumeIcon, FullscreenIcon, SettingsIcon, PauseIcon, LoaderIcon } from 'lucide-react';
import Hls, { type Level } from 'hls.js';
import { parseTime } from './utils';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isTooltipReadyToShow, setIsTooltipReadyToShow] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentVolume, setCurrentVolume] = useState(0.5);
  const [tooltipContent, setTooltipContent] = useState<{ title: string, timeStr: string } | null>(null);
  const [tooltipLeftStyle, setTooltipLeftStyle] = useState<string | number>('50%');
  const [tooltipTransformStyle, setTooltipTransformStyle] = useState<string>('translateX(-50%)');
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<Level[]>([]);
  const [currentQualityLevel, setCurrentQualityLevel] = useState(-1); // -1 = auto
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
    if (!Hls.isSupported()) {
      console.error('HLS is not supported on this browser!');
      return;
    }
    const hls = new Hls({
      debug: false,
    });
    hlsRef.current = hls;
    hls.loadSource(testInput.hlsPlaylistUrl);
    if (videoRef.current) {
      hls.attachMedia(videoRef.current);
    }
    hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
      setQualityLevels(data.levels as Level[]);
      setCurrentQualityLevel(hls.currentLevel);
    });
    hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
      setCurrentQualityLevel(data.level);
    });
    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        // new error handling checks:
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error('fatal network error encountered, try to recover', event, data);
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error('fatal media error encountered, try to recover', event, data);
            hls.recoverMediaError();
            break;
          default:
            console.error('unrecoverable error', event, data);
            hls.destroy();
            break;
        }
      } else {
        if (event !== 'hlsError') console.log(event, data); // remove annoying errors on debug
      }
    });
    return () => { // reset values on hot module reload
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setIsVideoLoaded(false);
      setIsVideoPlaying(false);
      setCurrentTime(0);
      setCurrentVolume(0.5);
      setQualityLevels([]);
      setCurrentQualityLevel(-1);
      setIsSettingsOpen(false);
    };
  }, [testInput]);

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

  // On video load:
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    function videoLoaded() {
      if (video) {
        setIsVideoLoaded(true);
      }
    }
    video.addEventListener('loadedmetadata', videoLoaded); // not sure if I should use loadeddata or loadedmetadata, works fine with both
    return () => {
      video.removeEventListener('loadedmetadata', videoLoaded);
    }
  }, []);

  // On video end:
  useEffect(() => {
    if (!isVideoLoaded) return;
    const video = videoRef.current;
    if (!video) return;
    function videoEnded() {
      if (video) {
        setIsVideoPlaying(false);
        setCurrentTime(0);
      }
    }
    video.addEventListener('ended', videoEnded);
    return () => {
      video.removeEventListener('ended', videoEnded);
    }
  }, [isVideoLoaded]);

  // playhead support: (on playhead interaction started)
  const handleMouseMoveWhileScrubbing = useCallback((e: MouseEvent) => {
    if (!timelineRef.current || !videoRef.current || !testInput.videoLength || !isVideoLoaded) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    let newTimePercent = (clientX - rect.left) / rect.width;
    newTimePercent = Math.max(0, Math.min(1, newTimePercent)); // 0-1
    const newTime = newTimePercent * testInput.videoLength;
    if (videoRef.current.readyState >= videoRef.current.HAVE_METADATA) {
      videoRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  }, [testInput.videoLength, isVideoLoaded, setCurrentTime]);

  // On playhead interaction ended:
  const handleMouseUpAfterScrubbing = useCallback(() => {
    setIsScrubbing(false);
  }, [setIsScrubbing]);

  // main effect to control dragging the line to change the current video time:
  useEffect(() => {
    let originalBodyCursor = '';
    if (isScrubbing) {
      originalBodyCursor = document.body.style.cursor;
      document.body.style.cursor = 'grabbing';
      document.addEventListener('mousemove', handleMouseMoveWhileScrubbing);
      document.addEventListener('mouseup', handleMouseUpAfterScrubbing);
    }
    return () => {
      if (isScrubbing) {
        document.body.style.cursor = originalBodyCursor;
      }
      document.removeEventListener('mousemove', handleMouseMoveWhileScrubbing);
      document.removeEventListener('mouseup', handleMouseUpAfterScrubbing);
    };
  }, [isScrubbing, handleMouseMoveWhileScrubbing, handleMouseUpAfterScrubbing]);

  return (
    <>
      {!isVideoLoaded && <LoaderIcon className='animate-spin m-auto w-full' />}
      <div id='video-player' className={`${!isVideoLoaded ? 'hidden ' : ''}rounded-[10px] overflow-hidden m-auto max-w-[570px] relative${!isVideoPlaying ? ' cursor-pointer' : ''}`}>

        {/* HLS Video Element */}
        <video
          ref={videoRef}
          className='w-full h-full'
        />

        {/* Timeline */}
        <div
          ref={timelineRef}
          className='flex gap-1 w-full absolute z-20 bottom-[25px] left-0 right-0 px-1 cursor-pointer'
          onMouseMove={(event) => {
            if (!timelineRef.current || !tooltipRef.current || !testInput.videoLength) return;
            // calculate hover time:
            const timelineRect = timelineRef.current.getBoundingClientRect();
            const hoverX = event.clientX - timelineRect.left;
            let hoverPercent = hoverX / timelineRect.width;
            hoverPercent = Math.max(0, Math.min(1, hoverPercent));
            const hoveredTime = hoverPercent * testInput.videoLength;
            // find chapter from hovered time:
            const currentChapterForTooltip = testInput.chapters.find(ch => hoveredTime >= ch.start && hoveredTime < ch.end) || (hoveredTime === testInput.videoLength ? testInput.chapters[testInput.chapters.length - 1] : null);
            if (!currentChapterForTooltip) {
              setTooltipContent(null);
              setIsTooltipReadyToShow(false);
              return;
            }
            // load the current chapter and hovered time into the tooltip:
            setTooltipContent({ title: currentChapterForTooltip.title, timeStr: parseTime(hoveredTime) });
            const tooltipElement = tooltipRef.current;
            const tooltipWidth = tooltipElement.offsetWidth;
            if (tooltipWidth === 0) {
              setIsTooltipReadyToShow(false);
              return;
            }
            // default tooltip position - center:
            const timelineWidth = timelineRect.width;
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
          }}
          onMouseLeave={() => {
            setIsTooltipReadyToShow(false);
            setTooltipContent(null);
          }}
          onClick={(event) => { // move the video to the clicked position:
            if (!timelineRef.current || !videoRef.current || !testInput.videoLength || !isVideoLoaded) return;
            if ((event.target as HTMLElement).closest('.scrubber-thumb')) { // prevent changing video duration when clicking the scrubber
              return;
            }
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
            const chapterWidthPercent = (isVideoLoaded && testInput.videoLength > 0) ? (chapterDuration / testInput.videoLength) * 100 : 0;
            const isCurrentChapter = currentTime >= chapter.start && currentTime < chapter.end;
            return (
              <div
                key={`chapter_${index}`}
                className='chapter pt-3 pb-5 relative'
                style={{ flexBasis: `${chapterWidthPercent}%`, flexGrow: 0, flexShrink: 0 }}
              >
                <div className={`chapter-line ${isCurrentChapter ? 'bg-blue-500' : 'bg-[#ffffff70]'} transition-colors w-full h-[1.4px]`}></div>
              </div>
            )
          })}

          {/* Playhead */}
          {(() => {
            const progressPercent = (isVideoLoaded && testInput.videoLength > 0) ? (currentTime / testInput.videoLength) * 100 : 0;
            return (
              <>
                {/* draggable line time indicator */}
                <div
                  className='absolute bg-white h-[1.4px] pointer-events-none'
                  style={{
                    left: '1px',
                    top: '12px',
                    width: `calc(${progressPercent}% - 1px)`,
                    zIndex: 21,
                  }}
                />
                <div
                  className={`absolute bg-white ${isScrubbing ? 'cursor-grabbing' : 'cursor-grab'} scrubber-thumb`}
                  style={{
                    left: `${progressPercent}%`,
                    top: `calc(12px + 0.7px)`,
                    transform: 'translate(-50%, -50%)',
                    width: '3px',
                    height: '15px',
                    zIndex: 22,
                    pointerEvents: 'auto',
                  }}
                  onMouseDown={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsScrubbing(true);
                  }}
                />
              </>
            );
          })()}

          {/* Chapter tooltip */}
          <div
            ref={tooltipRef}
            className={`pointer-events-none select-none absolute p-2 rounded-[4px] bottom-[38px] arrow h-fit text-center text-xs z-30 ${isTooltipReadyToShow && tooltipContent ? 'opacity-100 transition-opacity' : 'opacity-0'}`}
            style={{
              background: 'linear-gradient(#333, #222)',
              minWidth: '80px',
              padding: '6px 10px',
              left: tooltipLeftStyle,
              transform: tooltipTransformStyle,
              whiteSpace: 'nowrap',
            }}
          >
            {tooltipContent && (
              <>
                <div>{tooltipContent.title}</div>
                <div>{tooltipContent.timeStr}</div>
              </>
            )}
          </div>
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
            <div className='relative'>
              <div className='cursor-pointer relative z-30' onClick={() => setIsSettingsOpen(prev => !prev)}>
                <SettingsIcon />
              </div>
              {isSettingsOpen && qualityLevels.length > 0 && (
                <div className='absolute bottom-full -left-[20px] mb-6 bg-[#222] p-2 rounded shadow-lg z-40 w-16'>
                  <div
                    className={`p-1 hover:bg-[#444] cursor-pointer ${currentQualityLevel === -1 ? 'font-bold' : ''}`}
                    onClick={() => {
                      if (hlsRef.current) {
                        hlsRef.current.currentLevel = -1; // auto
                      }
                      setIsSettingsOpen(false);
                    }}
                  >
                    Auto
                  </div>
                  {qualityLevels.map((level, index) => (
                    <div
                      key={level.height || index}
                      className={`p-1 hover:bg-[#444] cursor-pointer ${currentQualityLevel === index ? 'font-bold' : ''}`}
                      onClick={() => {
                        if (hlsRef.current) {
                          hlsRef.current.currentLevel = index;
                        }
                        setIsSettingsOpen(false);
                      }}
                    >
                      {level.height ? `${level.height}p` : `Level ${index + 1}`}
                    </div>
                  ))}
                </div>
              )}
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
