import { useEffect, useRef, useState } from 'react';
import { Play, AlertCircle, Loader2 } from 'lucide-react';

/**
 * YouTube Live Player Component
 * - Embeds YouTube live stream in app (no redirect)
 * - Supports unlimited viewers
 * - Auto-play, quality selection
 */
export default function YouTubeLivePlayer({ videoId, autoplay = true, onReady, onError }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const playerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!videoId) {
      setError('No video ID provided');
      setIsLoading(false);
      return;
    }

    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = initPlayer;
    } else {
      initPlayer();
    }

    function initPlayer() {
      try {
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId: videoId,
          playerVars: {
            autoplay: autoplay ? 1 : 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            fs: 1,
            playsinline: 1,
          },
          events: {
            onReady: (event) => {
              setIsLoading(false);
              if (onReady) onReady(event);
            },
            onError: (event) => {
              setError('Failed to load video');
              setIsLoading(false);
              if (onError) onError(event);
            },
            onStateChange: (event) => {
              // Auto-play on load
              if (event.data === window.YT.PlayerState.CUED && autoplay) {
                event.target.playVideo();
              }
            },
          },
        });
      } catch (err) {
        setError('Failed to initialize player');
        setIsLoading(false);
      }
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [videoId, autoplay, onReady, onError]);

  if (error) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center rounded-lg">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-gray-300 text-lg">{error}</p>
          <p className="text-gray-500 text-sm">Please check the stream URL</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="text-center space-y-3">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
            <p className="text-gray-300 text-lg">Loading stream...</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

/**
 * Simple iframe fallback (if YouTube API doesn't load)
 */
export function YouTubeLivePlayerSimple({ videoId, autoplay = true }) {
  if (!videoId) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center rounded-lg">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-300">No stream available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&controls=1&modestbranding=1&rel=0&showinfo=0`}
        className="w-full h-full"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Live Stream"
      />
    </div>
  );
}
