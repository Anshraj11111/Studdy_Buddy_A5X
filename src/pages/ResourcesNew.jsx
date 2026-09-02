import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Search, ChevronRight, Info, Hexagon, 
  BookOpen, Play, Check, Lock, Star, Users, Clock,
  Filter, TrendingUp, Sparkles, Award, Download, FileText,
  Youtube, Loader2, X, Maximize, Minimize, Volume2, VolumeX,
  Upload, ExternalLink
} from 'lucide-react';
import Navbar from '../components/Navbar';
import PaymentModal from '../components/PaymentModal';
import { courseAPI, resourceAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

/* =========================================================
   ENHANCED ERROR BOUNDARY AND LOADING COMPONENTS
========================================================= */

function LoadingSpinner({ size = 'default' }) {
  const sizeClasses = {
    small: 'h-6 w-6',
    default: 'h-12 w-12',
    large: 'h-16 w-16'
  };

  return (
    <div className={`animate-spin rounded-full border-4 border-indigo-600 border-t-transparent ${sizeClasses[size]}`} />
  );
}

function EmptyState({ icon: Icon = BookOpen, title, description, action }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center text-center py-12">
      <Icon size={48} className="mb-4 text-slate-300" />
      <h3 className="text-lg font-bold text-slate-700 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 mb-4 max-w-md leading-relaxed">{description}</p>
      {action && action}
    </div>
  );
}

function ErrorBoundary({ error, onRetry }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center text-center py-12">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <X size={24} className="text-red-500" />
      </div>
      <h3 className="text-lg font-bold text-slate-700 mb-2">Something went wrong</h3>
      <p className="text-sm text-slate-500 mb-4 max-w-md">{error?.message || 'An unexpected error occurred'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-semibold text-sm"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

/* =========================================================
   YOUTUBE VIDEO HELPERS
========================================================= */

function getYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) { 
    const m = url.match(p); 
    if (m) return m[1];
  }
  return null;
}

function isYouTubeUrl(url) {
  return !!(url && (url.includes('youtube.com') || url.includes('youtu.be')));
}

/* =========================================================
   VIDEO PLAYER MODAL
========================================================= */

function VideoPlayerModal({ resource, onClose }) {
  const [videoId, setVideoId] = useState(null);
  const [tokenError, setTokenError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const containerRef = useRef(null);

  // Lock body scroll and hide browser UI when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isFullscreen]);

  useEffect(() => {
    let cancelled = false;
    
    // If resource has URL directly (old resources), use it
    if (resource?.url) {
      if (isYouTubeUrl(resource.url)) {
        const extractedId = getYouTubeId(resource.url);
        if (extractedId) {
          setVideoId(extractedId);
          setTokenError('');
        } else {
          setTokenError('Invalid YouTube URL format');
        }
      } else {
        setTokenError('Only YouTube videos are supported');
      }
      return () => { cancelled = true };
    }
    
    // Fetch secure URL from backend using lecture ID
    if (resource?._id) {
      courseAPI.getSecureVideoUrl(resource._id)
        .then(res => {
          if (!cancelled) {
            const videoUrl = res.data?.data?.url;
            if (videoUrl && isYouTubeUrl(videoUrl)) {
              const extractedId = getYouTubeId(videoUrl);
              if (extractedId) {
                setVideoId(extractedId);
                setTokenError('');
              } else {
                setTokenError('Invalid YouTube URL format');
              }
            } else {
              setTokenError('Only YouTube videos are supported');
            }
          }
        })
        .catch((err) => {
          if (!cancelled) {
            const errMsg = err.response?.data?.error?.message || 'Failed to load video';
            setTokenError(errMsg);
          }
        });
    } else {
      setTokenError('Video not available');
    }
    
    return () => { cancelled = true };
  }, [resource]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  const embedSrc = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&fs=0&disablekb=0&mute=${isMuted ? 1 : 0}&playsinline=1`
    : null;

  return (
    <div 
      className="fixed z-[100] flex items-center justify-center" 
      style={{ 
        inset: 0,
        background: 'rgba(0,0,0,0.95)',
        padding: isFullscreen ? '0' : '16px',
      }} 
      onClick={onClose}
    >
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.95, y: 16 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="flex flex-col w-full overflow-hidden"
        style={{
          maxWidth: isFullscreen ? '100vw' : '960px',
          width: isFullscreen ? '100vw' : '100%',
          height: isFullscreen ? '100dvh' : 'auto',
          maxHeight: isFullscreen ? '100dvh' : 'calc(100vh - 32px)',
          background: isFullscreen ? '#000' : '#fff',
          boxShadow: isFullscreen ? 'none' : '0 32px 80px rgba(0,0,0,0.7)',
          borderRadius: isFullscreen ? '0' : '16px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between flex-shrink-0 ${
          isFullscreen ? 'px-3 py-2 bg-black/80 text-white' : 'px-5 py-3.5 bg-white border-b border-slate-200'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fef2f2' }}>
              <Youtube size={18} style={{ color: '#ef4444' }} />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-bold truncate ${isFullscreen ? 'text-white' : 'text-slate-900'}`}>
                {resource?.title || 'Video'}
              </p>
              <p className={`text-xs ${isFullscreen ? 'text-white/60' : 'text-slate-500'}`}>
                by {resource?.uploadedBy?.name || 'Mentor'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {embedSrc && (
              <>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-2 rounded-lg transition ${
                    isFullscreen ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                </button>
                <button
                  onClick={toggleFullscreen}
                  className={`p-2 rounded-lg transition ${
                    isFullscreen ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
                </button>
              </>
            )}
            <button 
              onClick={onClose} 
              className={`p-2 rounded-lg transition ${
                isFullscreen ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Video area */}
        <div className="relative w-full bg-black flex-shrink-0" style={{
          paddingBottom: isFullscreen ? '0' : '56.25%',
          height: isFullscreen ? '0' : undefined,
          flex: isFullscreen ? '1 1 0%' : undefined,
          minHeight: isFullscreen ? '0' : undefined,
        }}>
          {tokenError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Youtube size={48} style={{ color: '#ef4444', opacity: 0.5 }} />
              <p className="text-white/70 text-sm text-center px-4">{tokenError}</p>
              <button
                onClick={() => {
                  setTokenError(''); 
                  setVideoId(null);
                  if (resource && isYouTubeUrl(resource.url)) {
                    resourceAPI.getVideoToken(resource._id)
                      .then(r => setVideoId(r.data?.data?.videoId))
                      .catch(() => setTokenError('Could not load video.'));
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition"
              >
                Try Again
              </button>
            </div>
          ) : !embedSrc ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Loader2 size={40} className="animate-spin" style={{ color: '#ef4444' }} />
              <p className="text-white/50 text-xs">Loading video...</p>
            </div>
          ) : (
            <>
              <iframe
                key={embedSrc}
                src={embedSrc}
                title={resource?.title || 'Video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; screen-orientation"
                allowFullScreen
                referrerPolicy="strict-origin"
                className="absolute inset-0 w-full h-full"
                style={{ border: 'none', display: 'block' }}
              />
              {/* Block YouTube logo (bottom-right) and link icon (bottom-left) */}
              {/* Bottom bar - covers YouTube logo, link icon, and controls */}
              <div className="absolute left-0 right-0 z-50" 
                style={{ 
                  bottom: '0px',
                  width: '100%',
                  height: '65px',
                  background: '#000000',
                  pointerEvents: 'all',
                  cursor: 'default',
                }} 
                onClick={e => e.stopPropagation()}
                onContextMenu={e => e.preventDefault()}
              />
              {/* Top bar - blocks channel name/title link */}
              <div className="absolute left-0 right-0 top-0 z-50"
                style={{
                  width: '100%',
                  height: '50px',
                  background: 'transparent',
                  pointerEvents: 'all',
                  cursor: 'default',
                }}
                onClick={e => e.stopPropagation()}
              />
            </>
          )}
        </div>

        {/* Footer */}
        {resource?.description && !isFullscreen && (
          <div className="px-5 py-4 flex-shrink-0 border-t border-slate-200 bg-white">
            <p className="text-sm text-slate-600 leading-relaxed">{resource.description}</p>
            {resource.topic && (
              <span className="inline-block mt-3 text-xs px-3 py-1 rounded-full font-medium bg-indigo-50 text-indigo-600">
                {resource.topic}
              </span>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* =========================================================
   RESOURCE UPLOAD MODAL
========================================================= */

function UploadResourceModal({ onClose, onUploaded }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    topic: 'Robotics',
    tags: '',
    url: '',
    type: 'link'
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const TOPICS = ['Robotics', 'Programming', 'AI/ML', 'IoT', 'Electronics', 'Entrepreneurship'];
  const RESOURCE_TYPES = [
    { value: 'link', label: 'YouTube Video', icon: Youtube },
    { value: 'pdf', label: 'PDF Document', icon: FileText },
    { value: 'external', label: 'External Link', icon: ExternalLink }
  ];

  const inputStyle = {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    transition: 'all 0.2s'
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.url) {
      setError('Title and URL are required');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await resourceAPI.create({
        title: form.title.trim(),
        description: form.description.trim(),
        topic: form.topic,
        tags,
        url: form.url.trim(),
        type: form.type
      });

      if (!res.data?.success) {
        throw new Error(res.data?.error?.message || 'Failed to upload resource');
      }

      onUploaded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to upload resource');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50" 
        onClick={onClose} 
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-x-4 top-20 z-50 max-w-lg mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 160px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Upload size={18} className="text-indigo-600" />
            Upload Resource
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Resource Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Resource Type</label>
            <div className="grid grid-cols-3 gap-2">
              {RESOURCE_TYPES.map(type => {
                const Icon = type.icon;
                const isSelected = form.type === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: type.value }))}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Introduction to ROS2"
              style={inputStyle}
              className="focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {form.type === 'link' ? 'YouTube URL' : 'Resource URL'} *
            </label>
            <input
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder={
                form.type === 'link' 
                  ? 'https://www.youtube.com/watch?v=...' 
                  : 'https://example.com/resource'
              }
              style={inputStyle}
              className="focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of the resource..."
              rows={3}
              style={{ ...inputStyle, resize: 'none' }}
              className="focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Topic & Tags */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Topic</label>
              <select
                value={form.topic}
                onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                style={inputStyle}
                className="focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer"
              >
                {TOPICS.map(topic => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Tags</label>
              <input
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="ros2, tutorial, basics"
                style={inputStyle}
                className="focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-semibold"
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload Resource
              </>
            )}
          </button>
        </div>
      </motion.div>
    </>
  );
}

/* =========================================================
   KEYBOARD SHORTCUTS AND ACCESSIBILITY
========================================================= */

function useKeyboardShortcuts(handlers) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const { key, ctrlKey, metaKey, altKey } = event;
      const isModifierPressed = ctrlKey || metaKey;
      
      // Don't trigger shortcuts if user is typing in an input
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      Object.entries(handlers).forEach(([shortcut, handler]) => {
        const [modifier, keyCode] = shortcut.split('+');
        
        if (modifier === 'cmd' && isModifierPressed && key.toLowerCase() === keyCode) {
          event.preventDefault();
          handler();
        } else if (modifier === 'key' && !isModifierPressed && key.toLowerCase() === keyCode) {
          event.preventDefault();
          handler();
        } else if (key === shortcut) {
          event.preventDefault();
          handler();
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}

/* =========================================================
   DEBOUNCED SEARCH HOOK
========================================================= */

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/* =========================================================
   ENHANCED SEARCH COMPONENT
========================================================= */

function SearchInput({ placeholder, value, onChange, className = "" }) {
  const [localValue, setLocalValue] = useState(value || '');
  const debouncedValue = useDebounce(localValue, 300);

  useEffect(() => {
    if (debouncedValue !== value) {
      onChange?.(debouncedValue);
    }
  }, [debouncedValue, onChange, value]);

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition"
        aria-label={placeholder}
      />
      {localValue && (
        <button
          onClick={() => {
            setLocalValue('');
            onChange?.('');
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/* =========================================================
   ENHANCED RESOURCE CARD WITH LAZY LOADING
========================================================= */

function LazyImage({ src, alt, className, fallback }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef();

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const image = new Image();
          image.onload = () => setLoaded(true);
          image.onerror = () => setError(true);
          image.src = src;
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(img);
    return () => observer.disconnect();
  }, [src]);

  return (
    <div ref={imgRef} className={className}>
      {loaded && !error ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : error ? (
        fallback || (
          <div className="w-full h-full flex items-center justify-center bg-slate-100">
            <BookOpen size={24} className="text-slate-400" />
          </div>
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-100">
          <LoadingSpinner size="small" />
        </div>
      )}
    </div>
  );
}

/* =========================================================
   ENHANCED RESOURCE CARD
========================================================= */

function ResourceCard({ resource, onPlay }) {
  const [isHovered, setIsHovered] = useState(false);

  const getResourceIcon = (type) => {
    switch (type) {
      case 'link':
        return <Youtube size={18} className="text-red-500" />;
      case 'pdf':
        return <FileText size={18} className="text-red-600" />;
      default:
        return <BookOpen size={18} className="text-indigo-600" />;
    }
  };

  const getResourceBadge = (type) => {
    switch (type) {
      case 'link':
        return { text: 'Video', bg: 'bg-red-50', color: 'text-red-700', ring: 'ring-red-200' };
      case 'pdf':
        return { text: 'PDF', bg: 'bg-red-50', color: 'text-red-700', ring: 'ring-red-200' };
      default:
        return { text: 'Link', bg: 'bg-indigo-50', color: 'text-indigo-700', ring: 'ring-indigo-200' };
    }
  };

  const badge = getResourceBadge(resource.type);
  const formattedDate = new Date(resource.uploadedAt).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric'
  });

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-lg cursor-pointer ring-0 hover:ring-2 hover:ring-indigo-100"
      onClick={() => onPlay(resource)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPlay(resource);
        }
      }}
      aria-label={`Open ${resource.title}`}
    >
      {/* Thumbnail/Preview */}
      <div className="relative h-[160px] overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
        {resource.thumbnail ? (
          <LazyImage 
            src={resource.thumbnail} 
            alt={resource.title}
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              {getResourceIcon(resource.type)}
              <p className="mt-2 text-xs text-slate-500 font-medium">
                {resource.type === 'link' ? 'Video' : 'Resource'}
              </p>
            </div>
          </div>
        )}

        {/* Play Button Overlay */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: isHovered ? 1 : 0, 
            scale: isHovered ? 1 : 0.8 
          }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        >
          <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center text-indigo-600 shadow-xl border-2 border-white/50">
            <Play size={22} fill="currentColor" className="ml-1" />
          </div>
        </motion.div>

        {/* Type Badge */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.color} ring-1 ${badge.ring}`}>
            {resource.type === 'link' && <Youtube size={10} />}
            {resource.type === 'pdf' && <FileText size={10} />}
            {badge.text}
          </span>
        </div>

        {/* Duration Badge (for videos) */}
        {resource.duration && (
          <div className="absolute bottom-3 right-3">
            <span className="inline-block px-2 py-1 rounded text-xs font-bold bg-black/70 text-white">
              {resource.duration}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Topic */}
        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 mb-3">
          {resource.topic}
        </span>

        {/* Title */}
        <h3 className="line-clamp-2 text-[15px] font-bold leading-tight text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
          {resource.title}
        </h3>

        {/* Description */}
        {resource.description && (
          <p className="line-clamp-2 text-sm text-slate-500 mb-3 leading-relaxed">
            {resource.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
          <span className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center">
              <span className="text-[8px] font-bold text-slate-600">
                {resource.uploadedBy?.name?.charAt(0)?.toUpperCase() || 'A'}
              </span>
            </div>
            {resource.uploadedBy?.name || 'Anonymous'}
          </span>
          <span>{formattedDate}</span>
        </div>

        {/* Tags */}
        {resource.tags && resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {resource.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                #{tag}
              </span>
            ))}
            {resource.tags.length > 3 && (
              <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-600">
                +{resource.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
}

/* =========================================================
   RESOURCES GRID VIEW
========================================================= */

function ResourcesGrid() {
  const { user } = useAuthStore();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [filters, setFilters] = useState({
    topic: '',
    type: '',
    search: '',
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'cmd+k': () => {
      // Focus search input
      document.querySelector('input[placeholder*="Search"]')?.focus();
    },
    'cmd+u': () => {
      // Open upload modal
      if (user) setShowUploadModal(true);
    },
    'Escape': () => {
      // Close modals
      setShowUploadModal(false);
      setShowVideoModal(false);
      setSelectedResource(null);
    }
  });

  useEffect(() => {
    fetchResources();
  }, [filters]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filters.topic) params.topic = filters.topic;
      if (filters.type) params.type = filters.type;
      if (filters.search) params.search = filters.search;

      const res = await resourceAPI.list(params);
      setResources(res.data?.data?.resources || []);
    } catch (err) {
      console.error('Failed to fetch resources:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayResource = (resource) => {
    setSelectedResource(resource);
    if (isYouTubeUrl(resource.url)) {
      setShowVideoModal(true);
    } else {
      window.open(resource.url, '_blank');
    }
  };

  const handleClearAllResources = async () => {
    if (!user || (user.role !== 'admin' && user.role !== 'mentor')) {
      alert('❌ Admin privileges required to clear resources');
      return;
    }

    const confirmed = window.confirm(
      `⚠️ Are you sure you want to delete ALL ${resources.length} resources? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setClearing(true);
      const response = await resourceAPI.clearAll();
      
      if (response.data?.success) {
        const { deleted, modulesUpdated, enrollmentsUpdated } = response.data.data;
        alert(`✅ Successfully cleared ${deleted} resources!\n📝 Updated ${modulesUpdated} modules\n📚 Updated ${enrollmentsUpdated} enrollments`);
        await fetchResources(); // Refresh the list
      }
    } catch (err) {
      console.error('Failed to clear resources:', err);
      alert(`❌ Failed to clear resources: ${err.response?.data?.error?.message || err.message}`);
    } finally {
      setClearing(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      topic: '',
      type: '',
      search: '',
    });
  };

  const topics = ['All', 'Robotics', 'Programming', 'AI/ML', 'IoT', 'Electronics', 'Entrepreneurship'];
  const types = ['All', 'Video', 'PDF', 'Link'];
  const hasActiveFilters = filters.topic || filters.type || filters.search;
  const isAdmin = user && (user.role === 'admin' || user.role === 'mentor');

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <ErrorBoundary error={error} onRetry={fetchResources} />
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {/* Hero Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Learning Resources</h1>
            <p className="mt-2 text-sm text-slate-500">
              Access videos, documents, and external resources
            </p>
            
            {/* Keyboard shortcuts hint */}
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono">⌘K</kbd>
                Search
              </span>
              {user && (
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono">⌘U</kbd>
                  Upload
                </span>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition text-sm font-medium"
              >
                <X size={14} />
                Clear filters
              </button>
            )}

            {/* Admin Clear All Button */}
            {isAdmin && resources.length > 0 && (
              <button
                onClick={handleClearAllResources}
                disabled={clearing}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition font-semibold text-sm whitespace-nowrap shadow-sm hover:shadow disabled:opacity-50"
              >
                {clearing ? (
                  <>
                    <LoadingSpinner size="small" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <X size={16} />
                    Clear All ({resources.length})
                  </>
                )}
              </button>
            )}
            
            {user && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition font-semibold text-sm whitespace-nowrap shadow-sm hover:shadow"
              >
                <Upload size={16} />
                Upload Resource
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Topic Filter */}
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
            {topics.map((topic) => (
              <button
                key={topic}
                onClick={() => setFilters(f => ({ ...f, topic: topic === 'All' ? '' : topic }))}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
                  (topic === 'All' && !filters.topic) || filters.topic === topic
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>

          {/* Search and Type Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <SearchInput
              placeholder="Search resources... (⌘K)"
              value={filters.search}
              onChange={(value) => setFilters(f => ({ ...f, search: value }))}
              className="flex-1"
            />

            <select
              value={filters.type}
              onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 outline-none min-w-[120px] focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition"
            >
              {types.map((type) => (
                <option key={type} value={type === 'All' ? '' : type.toLowerCase()}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Summary */}
        {!loading && (
          <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
            <span>
              {resources.length} resource{resources.length !== 1 ? 's' : ''} found
              {hasActiveFilters && ' matching your filters'}
            </span>
            
            {loading && (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="small" />
                Searching...
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <LoadingSpinner size="large" />
              <p className="text-sm text-slate-500 mt-4">Loading resources...</p>
            </div>
          </div>
        )}

        {/* Resources Grid */}
        {!loading && resources.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {resources.map((resource, index) => (
              <motion.div
                key={resource._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <ResourceCard 
                  resource={resource} 
                  onPlay={handlePlayResource}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && resources.length === 0 && (
          <EmptyState
            title={hasActiveFilters ? "No resources match your search" : "No resources found"}
            description={
              hasActiveFilters 
                ? "Try adjusting your filters or search query to find what you're looking for."
                : "Be the first to share a valuable resource with the community!"
            }
            action={
              <div className="flex flex-col sm:flex-row gap-3">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition font-semibold text-sm"
                  >
                    <X size={16} />
                    Clear filters
                  </button>
                )}
                {user && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-semibold text-sm"
                  >
                    <Upload size={16} />
                    Upload Resource
                  </button>
                )}
              </div>
            }
          />
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadResourceModal 
            onClose={() => setShowUploadModal(false)}
            onUploaded={() => {
              fetchResources();
              setShowUploadModal(false);
            }}
          />
        )}
        
        {showVideoModal && selectedResource && (
          <VideoPlayerModal 
            resource={selectedResource}
            onClose={() => {
              setShowVideoModal(false);
              setSelectedResource(null);
            }} 
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* =========================================================
   GLOBAL COMPONENTS
========================================================= */

function TopNavbar({ title, onBack, showSearch = false, onSearchChange, currentView }) {
  return (
    <header className="border-b border-slate-100 bg-white">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-6 px-5 sm:px-8">
        {onBack && (
          <button
            onClick={onBack}
            className="flex shrink-0 items-center gap-2 text-sm font-bold text-slate-700 transition hover:text-purple-600"
          >
            <ArrowLeft size={19} strokeWidth={2.5} />
            {title}
          </button>
        )}
        
        {!onBack && (
          <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        )}

        <div className="ml-auto flex items-center gap-3">
          {showSearch && (
            <div className="relative hidden sm:block">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${currentView || 'items'}...`}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="h-10 w-[240px] rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* =========================================================
   SCREEN 1 — COURSE CARDS (MAIN PAGE)
========================================================= */

function CourseCard({ course, onOpen }) {
  const { user } = useAuthStore();
  const isEnrolled = course.enrollment !== null;
  
  // School students get free access (similar to Resources logic)
  // User has free access if they have schoolName OR hasFreeAccess flag
  const hasSchoolAccess = !!(user?.schoolName || user?.hasFreeAccess);
  const isLocked = course.isPremium && !hasSchoolAccess && !user?.hasPremiumAccess && !user?.hasFreeAccess && !isEnrolled;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-lg cursor-pointer"
      onClick={() => onOpen(course)}
    >
      {/* Thumbnail */}
      <div className="relative h-[180px] overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        {course.thumbnail ? (
          <img 
            src={course.thumbnail} 
            alt={course.title}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen size={48} className="text-indigo-300" />
          </div>
        )}
        
        {/* Overlay badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {course.isNew && (
            <span className="rounded-full bg-yellow-400 px-2.5 py-1 text-xs font-extrabold uppercase text-yellow-900 shadow">
              New
            </span>
          )}
          {course.isTrending && (
            <span className="flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow">
              <TrendingUp size={12} /> Trending
            </span>
          )}
          {course.isBestseller && (
            <span className="flex items-center gap-1 rounded-full bg-purple-600 px-2.5 py-1 text-xs font-bold text-white shadow">
              <Sparkles size={12} /> Bestseller
            </span>
          )}
        </div>

        {/* Lock icon for premium */}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="rounded-full bg-white p-3 shadow-xl">
              <Lock size={24} className="text-purple-600" />
            </div>
          </div>
        )}

        {/* Progress bar for enrolled courses */}
        {isEnrolled && course.enrollment && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/30">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${course.enrollment.progress || 0}%` }}
              className="h-full bg-green-500"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Topic badge */}
        <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">
          {course.topic}
        </span>

        {/* Title */}
        <h3 className="mt-3 line-clamp-2 text-[17px] font-extrabold leading-tight text-slate-900">
          {course.title}
        </h3>

        {/* Description */}
        <p className="mt-2 line-clamp-2 text-sm text-slate-500">
          {course.description}
        </p>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Star size={14} className="fill-yellow-400 text-yellow-400" />
            <span className="font-bold text-slate-700">{course.rating || 0}</span>
            <span>({course.reviewCount || 0})</span>
          </div>
          <div className="flex items-center gap-1">
            <Users size={14} />
            <span>{course.enrolledCount || 0} students</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{course.totalDuration || '0h'}</span>
          </div>
        </div>

        {/* Progress or CTA */}
        <div className="mt-4">
          {isEnrolled ? (
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Progress</span>
                <span className="font-bold text-purple-600">{course.enrollment?.progress || 0}%</span>
              </div>
              <button className="w-full rounded-xl bg-purple-600 py-2.5 text-sm font-extrabold text-white transition hover:bg-purple-700">
                Continue Learning
              </button>
            </div>
          ) : isLocked ? (
            <button className="w-full rounded-xl border-2 border-purple-600 bg-white py-2.5 text-sm font-extrabold text-purple-600 transition hover:bg-purple-50">
              Unlock for ₹{course.price}
            </button>
          ) : (
            <button className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-extrabold text-white transition hover:bg-indigo-700">
              Start Learning
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function CoursesGrid() {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [filters, setFilters] = useState({
    topic: '',
    difficulty: '',
    search: '',
  });

  useEffect(() => {
    fetchCourses();
  }, [filters]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filters.topic) params.topic = filters.topic;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.search) params.search = filters.search;

      const res = await courseAPI.list(params);
      setCourses(res.data?.data?.courses || []);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const topics = ['All', 'Robotics', 'Programming', 'AI/ML', 'IoT', 'Electronics', 'Entrepreneurship'];
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  if (selectedCourse) {
    return <CourseDetail course={selectedCourse} onBack={() => setSelectedCourse(null)} />;
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <ErrorBoundary error={error} onRetry={fetchCourses} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      {/* Hero Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900">Explore Courses</h1>
        <p className="mt-2 text-sm text-slate-500">
          Learn from expert mentors and master new skills
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        {/* Topic Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {topics.map((topic) => (
            <button
              key={topic}
              onClick={() => setFilters(f => ({ ...f, topic: topic === 'All' ? '' : topic }))}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
                (topic === 'All' && !filters.topic) || filters.topic === topic
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Difficulty Filter */}
        <select
          value={filters.difficulty}
          onChange={(e) => setFilters(f => ({ ...f, difficulty: e.target.value }))}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 outline-none min-w-[140px]"
        >
          {difficulties.map((diff) => (
            <option key={diff} value={diff === 'All' ? '' : diff}>
              {diff}
            </option>
          ))}
        </select>

        {/* Search Input (Mobile) */}
        <div className="relative sm:hidden">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search courses..."
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-300"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="text-sm text-slate-500 mt-4">Loading courses...</p>
          </div>
        </div>
      )}

      {/* Courses Grid */}
      {!loading && courses.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, index) => (
            <motion.div
              key={course._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
            >
              <CourseCard 
                course={course} 
                onOpen={setSelectedCourse}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && courses.length === 0 && (
        <EmptyState
          icon={Award}
          title="No courses found"
          description="Try adjusting your filters or search query to find the perfect course for you."
        />
      )}
    </main>
  );
}

/* =========================================================
   SCREEN 2 — COURSE DETAIL (MODULES)
========================================================= */

function ModuleCard({ module, courseId, isLocked, onOpenModule }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <button
        onClick={() => !isLocked && onOpenModule(module)}
        disabled={isLocked}
        className="w-full"
      >
        <div className={`flex items-start gap-4 p-5 text-left ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
          {/* Icon */}
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            module.isFree ? 'bg-green-50' : isLocked ? 'bg-slate-100' : 'bg-indigo-50'
          }`}>
            {isLocked ? (
              <Lock size={20} className="text-slate-400" />
            ) : (
              <BookOpen size={20} className={module.isFree ? 'text-green-600' : 'text-indigo-600'} />
            )}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-bold text-slate-900">{module.title}</h3>
                {module.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{module.description}</p>
                )}
              </div>
              {module.isFree && (
                <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                  FREE
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Play size={12} />
                <span>{module.videoCount || 0} videos</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>{module.duration || '0h'}</span>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight size={20} className="shrink-0 text-slate-400" />
        </div>
      </button>
    </motion.div>
  );
}

function CourseDetail({ course, onBack }) {
  const { user } = useAuthStore();
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Check if user has school access (free access)
  // User has free access if they have schoolName OR hasFreeAccess flag
  const hasSchoolAccess = !!(user?.schoolName || user?.hasFreeAccess);
  const data = courseData || course;
  const isEnrolled = data?.enrollment !== null;
  const hasAccess = isEnrolled || user?.hasPremiumAccess || user?.hasFreeAccess || !data?.isPremium;
  const isPremiumLocked = data?.isPremium && !hasSchoolAccess && !isEnrolled;

  useEffect(() => {
    fetchCourseDetail();
  }, [course._id]);

  const fetchCourseDetail = async () => {
    try {
      setLoading(true);
      const res = await courseAPI.getById(course._id);
      setCourseData(res.data?.data?.course || null);
    } catch (error) {
      console.error('Failed to fetch course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    try {
      // If premium course and user doesn't have school access, show payment modal
      if (data.isPremium && !hasSchoolAccess) {
        setShowPaymentModal(true);
        return;
      }

      // Otherwise, enroll directly (free courses or school students)
      setEnrolling(true);
      await courseAPI.enroll(course._id);
      await fetchCourseDetail(); // Refresh to show enrolled state
      alert('✅ Successfully enrolled in course!');
    } catch (error) {
      console.error('Enrollment failed:', error);
      alert('❌ ' + (error.response?.data?.error?.message || 'Failed to enroll'));
    } finally {
      setEnrolling(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    alert('🎉 Payment submitted! Admin will verify and grant access within 24 hours.');
    // Optionally refresh course data
    fetchCourseDetail();
  };

  if (selectedModule) {
    return (
      <LectureView 
        module={selectedModule} 
        course={courseData || course}
        onBack={() => setSelectedModule(null)} 
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fc]">
        <TopNavbar title="Back to Courses" onBack={onBack} />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
            <p className="text-sm text-slate-500">Loading course...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <TopNavbar title="Back to Courses" onBack={onBack} />
      
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        {/* Course Header */}
        <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="relative h-[240px] bg-white">
            {data.thumbnail && (
              <img src={data.thumbnail} alt={data.title} className="h-full w-full object-contain" />
            )}
            
            {/* Course Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white bg-gradient-to-t from-black/80 to-transparent">
              <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-sm">
                {data.topic}
              </span>
              <h1 className="mt-3 text-2xl font-black leading-tight">{data.title}</h1>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  <span className="font-bold">{data.rating || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={14} />
                  <span>{data.enrolledCount || 0} students</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>{data.totalDuration || '0h'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <p className="text-sm leading-relaxed text-slate-600">{data.description}</p>
            
            {/* Tags */}
            {data.tags && data.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {data.tags.map((tag, i) => (
                  <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Enroll/Purchase Button */}
            {!isEnrolled && (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className={`mt-6 w-full rounded-xl py-3 text-sm font-extrabold transition ${
                  isPremiumLocked 
                    ? 'border-2 border-purple-600 bg-white text-purple-600 hover:bg-purple-50'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                } disabled:opacity-50`}
              >
                {enrolling ? 'Processing...' : 
                 isPremiumLocked ? `Purchase Course - ₹${data.price || 499}` :
                 hasSchoolAccess ? 'Enroll for Free (School Access)' :
                 data.isPremium ? 'Purchase Course' : 'Enroll for Free'}
              </button>
            )}
            
            {/* Access Message for Locked Courses */}
            {isPremiumLocked && (
              <p className="mt-3 text-center text-xs text-slate-500">
                💡 Payment via QR Code → Admin Verification → Instant Access!
              </p>
            )}

            {isEnrolled && data.enrollment && (
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-600">Your Progress</span>
                  <span className="font-bold text-purple-600">{data.enrollment.progress || 0}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div 
                    className="h-full rounded-full bg-purple-600 transition-all"
                    style={{ width: `${data.enrollment.progress || 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modules Section */}
        <div>
          <h2 className="mb-4 text-xl font-bold text-slate-900">Course Content</h2>
          
          {(!data.modules || data.modules.length === 0) ? (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm">
              <BookOpen size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-500">No modules added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.modules.map((module, index) => {
                const canAccess = isEnrolled || hasSchoolAccess || !data.isPremium;
                const isLocked = !canAccess;
                return (
                  <ModuleCard
                    key={module._id || index}
                    module={module}
                    courseId={data._id}
                    isLocked={isLocked}
                    onOpenModule={setSelectedModule}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <PaymentModal
            onClose={() => setShowPaymentModal(false)}
            onSuccess={handlePaymentSuccess}
            amount={data.price || 499}
            courseName={data.title}
            courseId={data._id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* =========================================================
   SCREEN 3 — LECTURE VIEW (SIDEBAR + VIDEO PLAYER)
========================================================= */

function LectureCard({ lecture, isCompleted, onClick }) {
  const [showVideoModal, setShowVideoModal] = useState(false);

  const handlePlay = (e) => {
    e.stopPropagation();
    const videoUrl = lecture.url || lecture.fileUrl;
    
    if (!videoUrl) {
      alert('Video URL not available');
      return;
    }
    
    if (isYouTubeUrl(videoUrl)) {
      setShowVideoModal(true);
    } else {
      // For non-YouTube videos, try to open in current tab on mobile
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // Mobile device - open in same tab
        window.location.href = videoUrl;
      } else {
        // Desktop - open in new tab
        window.open(videoUrl, '_blank');
      }
    }
  };

  return (
    <>
      <div
        onClick={onClick}
        className="group w-full border-b border-slate-100 px-5 py-5 text-left transition hover:bg-slate-50 sm:px-6 cursor-pointer"
      >
        <div className="flex gap-4">
          {/* Thumbnail */}
          <div className="relative h-[90px] w-[145px] shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-100 to-purple-200 sm:h-[105px] sm:w-[170px]">
            {lecture.thumbnail ? (
              <img src={lecture.thumbnail} alt={lecture.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-indigo-600 shadow">
                  <BookOpen size={25} />
                </div>
              </div>
            )}
            
            {/* Play Button */}
            <button
              onClick={handlePlay}
              className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition group-hover:scale-110"
            >
              <Play size={17} fill="currentColor" className="ml-0.5" />
            </button>
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-semibold text-slate-400">
                {lecture.type || 'Lecture'}
                {lecture.uploadedAt && (
                  <>
                    <span className="mx-1">•</span>
                    {new Date(lecture.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </>
                )}
              </p>
              {/* Completion Badge */}
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                  isCompleted
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-slate-300 bg-white text-transparent'
                }`}
              >
                <Check size={14} strokeWidth={3} />
              </div>
            </div>

            <h3 className="mt-1.5 line-clamp-2 text-[15px] font-extrabold leading-5 text-slate-900">
              {lecture.title}
            </h3>
            
            {lecture.description && (
              <p className="mt-1 line-clamp-1 text-[12px] text-slate-500">{lecture.description}</p>
            )}

            {/* Action Buttons */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3.5 py-2 text-[11px] font-bold text-slate-700">
                {isYouTubeUrl(lecture.url) ? <Youtube size={12} /> : <Play size={12} fill="currentColor" />}
                {isYouTubeUrl(lecture.url) ? 'Watch' : 'View'}
              </span>
              {lecture.notesUrl && (
                <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3.5 py-2 text-[11px] font-bold text-slate-700">
                  <FileText size={12} />
                  Notes
                </span>
              )}
              {lecture.downloadUrl && (
                <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3.5 py-2 text-[11px] font-bold text-slate-700">
                  <Download size={12} />
                  Download
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {showVideoModal && (
          <VideoPlayerModal 
            resource={{
              _id: lecture._id,
              title: lecture.title,
              description: lecture.description,
              // URL will be fetched securely by the modal
              uploadedBy: lecture.uploadedBy,
              topic: lecture.topic
            }}
            onClose={() => setShowVideoModal(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}

function LectureView({ module, course, onBack }) {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);

  useEffect(() => {
    fetchLectures();
  }, [module._id]);

  const fetchLectures = async () => {
    try {
      setLoading(true);
      const res = await courseAPI.getModuleLectures(module._id);
      const moduleData = res.data?.data?.module || {};
      const fetchedLectures = moduleData.resources || [];
      setLectures(fetchedLectures);
      if (fetchedLectures.length > 0) {
        setSelectedLecture(fetchedLectures[0]);
      }
    } catch (error) {
      console.error('Failed to fetch lectures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async (lectureId) => {
    try {
      await courseAPI.markComplete(course._id, lectureId);
      // Update local state to reflect completion
      setLectures(prev => prev.map(lecture => 
        lecture._id === lectureId 
          ? { ...lecture, completed: true }
          : lecture
      ));
    } catch (error) {
      console.error('Failed to mark complete:', error);
    }
  };

  const handleLectureClick = (lecture) => {
    setSelectedLecture(lecture);
    handleMarkComplete(lecture._id);
  };

  const playSelectedVideo = () => {
    if (selectedLecture) {
      const url = selectedLecture.url || selectedLecture.fileUrl;
      if (!url) {
        alert('Video URL not available');
        return;
      }
      
      if (isYouTubeUrl(url)) {
        setShowVideoModal(true);
      } else {
        // For non-YouTube videos, detect mobile and handle accordingly
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
          // Mobile device - open in same tab
          window.location.href = url;
        } else {
          // Desktop - open in new tab
          window.open(url, '_blank');
        }
      }
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#f5f6f9]">
        {/* Back to Course Navbar */}
        <div className="sticky top-0 z-50 bg-white border-b border-slate-200">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm font-bold text-slate-700 transition hover:text-purple-600"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
                <span>Back to Course</span>
              </button>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex h-[calc(100vh-120px)] min-h-[600px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            
            {/* ============ MAIN CONTENT ============ */}
            <section className="flex min-w-0 flex-1 flex-col">
              {/* Module Header */}
              <div className="shrink-0 border-b border-slate-100 px-5 pb-1 pt-5 sm:px-6">
                <h1 className="text-lg font-extrabold text-slate-900">{module.title}</h1>
                <p className="mt-1 text-xs text-slate-400">{lectures.length} lectures</p>
              </div>

              {/* Loading */}
              {loading && (
                <div className="flex flex-1 items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
                    <p className="text-sm text-slate-500">Loading lectures...</p>
                  </div>
                </div>
              )}

              {/* Lectures List */}
              {!loading && (
                <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]">
                  {lectures.length === 0 ? (
                    <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                      <BookOpen size={42} className="mb-3 text-slate-300" />
                      <h3 className="font-bold text-slate-700">No lectures yet</h3>
                      <p className="mt-1 max-w-sm text-sm text-slate-400">
                        Lectures for this module will appear here
                      </p>
                    </div>
                  ) : (
                    lectures.map((lecture) => (
                      <LectureCard
                        key={lecture._id}
                        lecture={lecture}
                        isCompleted={lecture.completed || false}
                        onClick={() => handleLectureClick(lecture)}
                      />
                    ))
                  )}
                </div>
              )}
            </section>

            {/* ============ VIDEO PLAYER SIDEBAR (Desktop Only) ============ */}
            {selectedLecture && (
              <aside className="hidden w-[400px] shrink-0 flex-col border-l border-slate-100 lg:flex">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h3 className="text-sm font-bold text-slate-900">Now Playing</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {/* Video Preview */}
                  <div className="aspect-video overflow-hidden rounded-lg bg-slate-900 relative group cursor-pointer"
                    onClick={playSelectedVideo}>
                    {selectedLecture.thumbnail ? (
                      <img 
                        src={selectedLecture.thumbnail} 
                        alt={selectedLecture.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-white">
                        <div className="text-center">
                          <BookOpen size={48} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm opacity-70">Click to play</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white shadow-xl">
                        <Play size={24} fill="currentColor" className="ml-1" />
                      </div>
                    </div>

                    {/* Video Type Badge */}
                    <div className="absolute top-3 right-3">
                      {isYouTubeUrl(selectedLecture.url) ? (
                        <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                          <Youtube size={12} />
                          YouTube
                        </div>
                      ) : (
                        <div className="bg-slate-600 text-white px-2 py-1 rounded text-xs font-bold">
                          External
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lecture Info */}
                  <div className="mt-4">
                    <h4 className="text-sm font-bold text-slate-900">{selectedLecture.title}</h4>
                    {selectedLecture.description && (
                      <p className="mt-2 text-xs text-slate-500 leading-relaxed">{selectedLecture.description}</p>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-4 space-y-2">
                      <button
                        onClick={playSelectedVideo}
                        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 transition font-semibold text-sm"
                      >
                        <Play size={16} fill="currentColor" />
                        Play Video
                      </button>
                      
                      {selectedLecture.notesUrl && (
                        <button
                          onClick={() => window.open(selectedLecture.notesUrl, '_blank')}
                          className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-2.5 rounded-lg hover:bg-slate-200 transition font-semibold text-sm"
                        >
                          <FileText size={16} />
                          View Notes
                        </button>
                      )}

                      {selectedLecture.downloadUrl && (
                        <button
                          onClick={() => window.open(selectedLecture.downloadUrl, '_blank')}
                          className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-2.5 rounded-lg hover:bg-slate-200 transition font-semibold text-sm"
                        >
                          <Download size={16} />
                          Download
                        </button>
                      )}
                    </div>

                    {/* Lecture Stats */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="space-y-2 text-xs text-slate-500">
                        {selectedLecture.uploadedAt && (
                          <div className="flex justify-between">
                            <span>Uploaded:</span>
                            <span>{new Date(selectedLecture.uploadedAt).toLocaleDateString('en-IN')}</span>
                          </div>
                        )}
                        {selectedLecture.topic && (
                          <div className="flex justify-between">
                            <span>Topic:</span>
                            <span className="font-semibold text-slate-700">{selectedLecture.topic}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className={`font-semibold ${selectedLecture.completed ? 'text-green-600' : 'text-amber-600'}`}>
                            {selectedLecture.completed ? 'Completed' : 'Not Started'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </main>
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {showVideoModal && selectedLecture && (
          <VideoPlayerModal 
            resource={{
              _id: selectedLecture._id,
              title: selectedLecture.title,
              description: selectedLecture.description,
              // URL will be fetched securely by the modal
              uploadedBy: selectedLecture.uploadedBy || { name: 'Mentor' },
              topic: selectedLecture.topic || 'Course Lecture'
            }}
            onClose={() => setShowVideoModal(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* =========================================================
   MAIN APP WITH NAVIGATION
========================================================= */

export default function ResourcesNew() {
  // Removed view switching - showing only Courses now
  
  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <Navbar />
      
      <div className="pt-16">
        {/* Directly show Courses - no tabs */}
        <CoursesGrid />
      </div>
    </div>
  );
}
