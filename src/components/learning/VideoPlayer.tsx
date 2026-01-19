'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  ChevronDown,
  Loader2,
} from 'lucide-react'

// ============================================
// TYPES
// ============================================

export interface VideoPlayerProps {
  videoUrl: string
  title: string
  duration: number // in seconds
  onComplete: () => void
  onProgress?: (percent: number) => void
}

type PlaybackSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2

// ============================================
// CONSTANTS
// ============================================

const PLAYBACK_SPEEDS: PlaybackSpeed[] = [0.5, 0.75, 1, 1.25, 1.5, 2]
const SEEK_SHORT = 5 // seconds
const SEEK_LONG = 10 // seconds
const STORAGE_KEY_PREFIX = 'aptly-video'

// ============================================
// HELPER FUNCTIONS
// ============================================

function getStorageKey(videoUrl: string, suffix: string): string {
  const urlHash = btoa(videoUrl).substring(0, 16)
  return `${STORAGE_KEY_PREFIX}-${urlHash}-${suffix}`
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
}

// ============================================
// VIDEO PLAYER COMPONENT
// ============================================

export function VideoPlayer({
  videoUrl,
  title,
  duration,
  onComplete,
  onProgress,
}: VideoPlayerProps) {
  // Video refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastTapRef = useRef<{ side: 'left' | 'right' | null; time: number }>({
    side: null,
    time: 0,
  })

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [bufferedPercent, setBufferedPercent] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // UI state
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Touch gesture state
  const [touchFeedback, setTouchFeedback] = useState<{
    side: 'left' | 'right'
    visible: boolean
  } | null>(null)

  // ============================================
  // INITIALIZATION & PERSISTENCE
  // ============================================

  // Load saved progress and speed on mount
  useEffect(() => {
    const savedSpeed = localStorage.getItem(getStorageKey(videoUrl, 'speed'))
    if (savedSpeed) {
      const speed = parseFloat(savedSpeed) as PlaybackSpeed
      if (PLAYBACK_SPEEDS.includes(speed)) {
        // Restore user's saved playback speed preference from localStorage
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPlaybackSpeed(speed)
      }
    }

    const savedTime = localStorage.getItem(getStorageKey(videoUrl, 'currentTime'))
    if (savedTime && videoRef.current) {
      const time = parseFloat(savedTime)
      if (time > 0 && time < duration) {
        videoRef.current.currentTime = time
         
        setCurrentTime(time)
      }
    }
  }, [videoUrl, duration])

  // Apply playback speed to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  // Save progress periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentTime > 0) {
        localStorage.setItem(getStorageKey(videoUrl, 'currentTime'), currentTime.toString())
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [currentTime, videoUrl])

  // ============================================
  // PLAYBACK CONTROLS
  // ============================================

  const togglePlay = useCallback(() => {
    if (!videoRef.current || hasError) return

    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play().catch((err) => {
        console.error('[VideoPlayer] Play error:', err)
      })
    }
  }, [isPlaying, hasError])

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  const seekTo = useCallback((seconds: number) => {
    if (!videoRef.current) return
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds))
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }, [currentTime, duration])

  const changeSpeed = useCallback((speed: PlaybackSpeed) => {
    setPlaybackSpeed(speed)
    localStorage.setItem(getStorageKey(videoUrl, 'speed'), speed.toString())
    setShowSpeedMenu(false)
  }, [videoUrl])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error('[VideoPlayer] Fullscreen error:', err)
      })
    } else {
      document.exitFullscreen()
    }
  }, [])

  const jumpToPercent = useCallback((percent: number) => {
    if (!videoRef.current) return
    const newTime = (percent / 100) * duration
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }, [duration])

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return
    const time = videoRef.current.currentTime
    setCurrentTime(time)

    const progress = (time / duration) * 100
    onProgress?.(progress)

    // Check for completion (95% watched)
    if (progress >= 95 && time > 0) {
      onComplete()
    }
  }, [duration, onComplete, onProgress])

  const handleProgress = useCallback(() => {
    if (!videoRef.current) return
    const buffered = videoRef.current.buffered
    if (buffered.length > 0) {
      const bufferedEnd = buffered.end(buffered.length - 1)
      const percent = (bufferedEnd / duration) * 100
      setBufferedPercent(percent)
    }
  }, [duration])

  const handleLoadedData = useCallback(() => {
    setIsLoading(false)
  }, [])

  const handleError = useCallback(() => {
    console.error('[VideoPlayer] Video error:', videoUrl)
    setHasError(true)
    setIsLoading(false)
  }, [videoUrl])

  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement)
  }, [])

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if video is focused or container is focused
      if (!containerRef.current?.contains(document.activeElement)) return

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'j':
          e.preventDefault()
          seekTo(-SEEK_LONG)
          break
        case 'l':
          e.preventDefault()
          seekTo(SEEK_LONG)
          break
        case 'arrowleft':
          e.preventDefault()
          seekTo(-SEEK_SHORT)
          break
        case 'arrowright':
          e.preventDefault()
          seekTo(SEEK_SHORT)
          break
        case 'm':
          e.preventDefault()
          toggleMute()
          break
        case '<':
        case ',':
          e.preventDefault()
          {
            const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed)
            if (currentIndex > 0) {
              changeSpeed(PLAYBACK_SPEEDS[currentIndex - 1])
            }
          }
          break
        case '>':
        case '.':
          e.preventDefault()
          {
            const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed)
            if (currentIndex < PLAYBACK_SPEEDS.length - 1) {
              changeSpeed(PLAYBACK_SPEEDS[currentIndex + 1])
            }
          }
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault()
          {
            const digit = parseInt(e.key)
            jumpToPercent(digit * 10)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, seekTo, toggleMute, playbackSpeed, changeSpeed, toggleFullscreen, jumpToPercent])

  // Fullscreen change listener
  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [handleFullscreenChange])

  // ============================================
  // TOUCH GESTURES
  // ============================================

  const handleTouch = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isTouchDevice() || !containerRef.current) return

    const touch = e.touches[0]
    const rect = containerRef.current.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const side = x < rect.width / 2 ? 'left' : 'right'
    const now = Date.now()

    // Check for double tap (within 300ms)
    if (
      lastTapRef.current.side === side &&
      now - lastTapRef.current.time < 300
    ) {
      // Double tap detected
      e.preventDefault()
      const seekAmount = side === 'left' ? -SEEK_LONG : SEEK_LONG
      seekTo(seekAmount)

      // Show feedback
      setTouchFeedback({ side, visible: true })
      setTimeout(() => setTouchFeedback(null), 600)

      // Reset tap tracking
      lastTapRef.current = { side: null, time: 0 }
    } else {
      // First tap
      lastTapRef.current = { side, time: now }
    }
  }, [seekTo])

  // ============================================
  // AUTO-HIDE CONTROLS
  // ============================================

  useEffect(() => {
    if (!isPlaying) {
      // Show controls when paused - sync with external state (play/pause)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowControls(true)
      return
    }

    const timeout = setTimeout(() => {
      setShowControls(false)
    }, 3000)

    return () => clearTimeout(timeout)
  }, [isPlaying, currentTime])

  const handleMouseMove = useCallback(() => {
    setShowControls(true)
  }, [])

  // ============================================
  // RENDER
  // ============================================

  const progressPercent = (currentTime / duration) * 100

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black rounded-lg overflow-hidden group"
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouch}
      tabIndex={0}
      role="application"
      aria-label={`Video player: ${title}`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onProgress={handleProgress}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedData={handleLoadedData}
        onCanPlay={handleLoadedData}
        onError={handleError}
        playsInline
        preload="auto"
        aria-label={title}
      />

      {/* Loading Spinner */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-teal animate-spin" />
            <p className="text-white/70 text-sm mt-3">Loading video...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
          <div className="w-16 h-16 rounded-full bg-error/20 flex items-center justify-center mb-4">
            <VolumeX className="w-8 h-8 text-error" />
          </div>
          <p className="text-white font-medium">Video could not be loaded</p>
          <p className="text-white/60 text-sm mt-1 text-center px-4 max-w-md">
            The video file may be missing or unavailable.
          </p>
        </div>
      )}

      {/* Touch Feedback */}
      <AnimatePresence>
        {touchFeedback?.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute top-1/2 ${
              touchFeedback.side === 'left' ? 'left-12' : 'right-12'
            } -translate-y-1/2 z-30 pointer-events-none`}
          >
            <div className="bg-white/90 rounded-full p-4 shadow-lg">
              <div className="text-navy font-bold text-lg">
                {touchFeedback.side === 'left' ? '-10s' : '+10s'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play Overlay (when paused and at start) */}
      {!isPlaying && currentTime === 0 && !isLoading && !hasError && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors z-10"
          aria-label="Play video"
        >
          <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-shadow">
            <Play className="w-9 h-9 text-navy ml-1" />
          </div>
        </button>
      )}

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && !isLoading && !hasError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-15 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      <AnimatePresence>
        {showControls && !isLoading && !hasError && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-4"
          >
            {/* Progress Bar */}
            <div className="mb-3">
              <div className="relative h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer group/progress">
                {/* Buffered */}
                <div
                  className="absolute inset-y-0 left-0 bg-white/30 transition-all"
                  style={{ width: `${bufferedPercent}%` }}
                />
                {/* Played */}
                <div
                  className="absolute inset-y-0 left-0 bg-teal transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
                {/* Hover scrubber */}
                <div className="absolute inset-0 group-hover/progress:h-2 transition-all" />
              </div>
              {/* Time Display */}
              <div className="flex items-center justify-between mt-2 text-white text-xs">
                <span>{formatTime(currentTime)}</span>
                <span className="text-white/60">{progressPercent.toFixed(0)}% complete</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between pointer-events-auto">
              {/* Left Controls */}
              <div className="flex items-center gap-3">
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  )}
                </button>

                {/* Mute */}
                <button
                  onClick={toggleMute}
                  className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-2">
                {/* Speed Control */}
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-medium transition-colors flex items-center gap-1"
                    aria-label="Playback speed"
                    aria-expanded={showSpeedMenu}
                  >
                    {playbackSpeed}x
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  <AnimatePresence>
                    {showSpeedMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl overflow-hidden"
                      >
                        {PLAYBACK_SPEEDS.map((speed) => (
                          <button
                            key={speed}
                            onClick={() => changeSpeed(speed)}
                            className={`w-20 px-4 py-2 text-sm font-medium transition-colors text-left ${
                              speed === playbackSpeed
                                ? 'bg-teal text-white'
                                : 'text-navy hover:bg-light-grey/50'
                            }`}
                            aria-label={`Speed ${speed}x`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  <Maximize className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Default export
export default VideoPlayer
