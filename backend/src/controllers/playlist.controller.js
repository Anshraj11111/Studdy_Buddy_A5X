import Playlist from '../models/Playlist.js';
import { generateVideoToken } from '../utils/videoToken.js';
import { escapeRegex } from '../utils/sanitize.js';

function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

// Strip youtubeUrl from all videos in a playlist before sending to client
function sanitizePlaylist(pl) {
  if (!pl) return pl;
  const obj = pl.toObject ? pl.toObject() : { ...pl };
  if (obj.videos) {
    obj.videos = obj.videos.map(v => {
      const { youtubeUrl, ...rest } = v;
      return rest; // youtubeUrl never sent to client
    });
  }
  return obj;
}

// ── Create playlist ────────────────────────────────────────────────────────────
export const createPlaylist = async (req, res) => {
  try {
    const { title, description, topic, thumbnail, videos = [], tags = [] } = req.body;
    if (!title || !description || !topic) {
      return res.status(400).json({ success: false, error: { message: 'title, description and topic are required' } });
    }

    // Validate each video has a valid YouTube URL
    for (const v of videos) {
      if (!v.title || !v.youtubeUrl) {
        return res.status(400).json({ success: false, error: { message: 'Each video needs a title and YouTube URL' } });
      }
      if (!extractYouTubeId(v.youtubeUrl)) {
        return res.status(400).json({ success: false, error: { message: `Invalid YouTube URL: ${v.youtubeUrl}` } });
      }
    }

    const playlist = await Playlist.create({
      title: title.trim(),
      description: description.trim(),
      topic,
      thumbnail: thumbnail || '',
      videos: videos.map((v, i) => ({ ...v, order: i })),
      tags,
      createdBy: req.user._id,
    });

    await playlist.populate('createdBy', 'name profileImage');
    res.status(201).json({ success: true, data: { playlist: sanitizePlaylist(playlist) } });
  } catch (err) {
    res.status(400).json({ success: false, error: { message: err.message || 'Failed to create playlist' } });
  }
};

// ── Get all playlists (paginated, filter by topic) ─────────────────────────────
export const getPlaylists = async (req, res) => {
  try {
    const { topic, page = 1, limit = 12, search } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, parseInt(limit) || 12);

    const query = { isPublic: true };
    if (topic) query.topic = topic;
    if (search) {
      const sanitized = escapeRegex(search);
      query.$or = [
        { title: { $regex: sanitized, $options: 'i' } },
        { description: { $regex: sanitized, $options: 'i' } },
        { tags: { $regex: sanitized, $options: 'i' } },
      ];
    }

    const [playlists, total] = await Promise.all([
      Playlist.find(query)
        .populate('createdBy', 'name profileImage')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Playlist.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: { playlists: playlists.map(sanitizePlaylist), pagination: { page: pageNum, limit: limitNum, total } },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch playlists' } });
  }
};

// ── Get single playlist by ID ──────────────────────────────────────────────────
export const getPlaylistById = async (req, res) => {
  try {
    const pl = await Playlist.findById(req.params.id).populate('createdBy', 'name profileImage');
    if (!pl) return res.status(404).json({ success: false, error: { message: 'Playlist not found' } });

    // Increment view count
    await Playlist.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    res.json({ success: true, data: { playlist: sanitizePlaylist(pl) } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch playlist' } });
  }
};

// ── Get secure video token for a specific video inside a playlist ───────────────
export const getPlaylistVideoToken = async (req, res) => {
  try {
    const { id, videoId } = req.params;
    const pl = await Playlist.findById(id);
    if (!pl) return res.status(404).json({ success: false, error: { message: 'Playlist not found' } });

    const video = pl.videos.id(videoId);
    if (!video) return res.status(404).json({ success: false, error: { message: 'Video not found in playlist' } });

    const ytId = extractYouTubeId(video.youtubeUrl);
    if (!ytId) return res.status(400).json({ success: false, error: { message: 'Invalid YouTube URL' } });

    // Token encodes playlistId:videoId:userId
    const token = generateVideoToken(`${id}:${videoId}`, String(req.user._id));

    res.json({ success: true, data: { token, videoId: ytId } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Failed to generate token' } });
  }
};

// ── Update playlist (owner or mentor) ─────────────────────────────────────────
export const updatePlaylist = async (req, res) => {
  try {
    const pl = await Playlist.findById(req.params.id);
    if (!pl) return res.status(404).json({ success: false, error: { message: 'Playlist not found' } });
    
    // Allow update if user is the creator OR if user is a mentor (admin privilege)
    const isOwner = String(pl.createdBy) === String(req.user._id);
    const isMentor = req.user.role === 'mentor';
    
    if (!isOwner && !isMentor) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized to update this playlist' } });
    }

    const { title, description, topic, thumbnail, videos, tags } = req.body;

    // Validate required fields
    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Title cannot be empty' } });
    }
    if (description !== undefined && !description.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Description cannot be empty' } });
    }

    // Validate videos if provided
    if (videos && videos.length > 0) {
      for (const v of videos) {
        if (!v.title || !v.youtubeUrl) {
          return res.status(400).json({ success: false, error: { message: 'Each video needs a title and YouTube URL' } });
        }
        if (!extractYouTubeId(v.youtubeUrl)) {
          return res.status(400).json({ success: false, error: { message: `Invalid YouTube URL: ${v.youtubeUrl}` } });
        }
      }
    }

    // Update fields
    if (title) pl.title = title.trim();
    if (description) pl.description = description.trim();
    if (topic) pl.topic = topic;
    if (thumbnail !== undefined) pl.thumbnail = thumbnail;
    if (tags !== undefined) pl.tags = tags;
    if (videos) pl.videos = videos.map((v, i) => ({ ...v, order: i }));

    await pl.save();
    await pl.populate('createdBy', 'name profileImage');

    res.json({ success: true, data: { playlist: sanitizePlaylist(pl) } });
  } catch (err) {
    console.error('Update playlist error:', err);
    res.status(400).json({ success: false, error: { message: err.message || 'Failed to update playlist' } });
  }
};

// ── Delete playlist (owner only) ───────────────────────────────────────────────
export const deletePlaylist = async (req, res) => {
  try {
    const pl = await Playlist.findById(req.params.id);
    if (!pl) return res.status(404).json({ success: false, error: { message: 'Playlist not found' } });
    
    // Allow deletion if user is the creator OR if user is a mentor (admin privilege)
    const isOwner = String(pl.createdBy) === String(req.user._id);
    const isMentor = req.user.role === 'mentor';
    
    if (!isOwner && !isMentor) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized to delete this playlist' } });
    }
    
    await pl.deleteOne();
    res.json({ success: true, data: { message: 'Playlist deleted successfully' } });
  } catch (err) {
    console.error('Delete playlist error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to delete playlist' } });
  }
};

export default { createPlaylist, getPlaylists, getPlaylistById, getPlaylistVideoToken, updatePlaylist, deletePlaylist };
