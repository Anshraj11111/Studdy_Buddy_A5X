import resourceService from '../services/resource.service.js';
import { addXP } from '../services/xp.service.js';
import { generateVideoToken, verifyVideoToken } from '../utils/videoToken.js';
import Resource from '../models/Resource.js';
import Module from '../models/Module.js';
import CourseEnrollment from '../models/CourseEnrollment.js';
import { getCache, setCache, deleteCache } from '../config/redis.js';

// Helper — extract YouTube video ID from a stored URL
function extractYouTubeId(url) {
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

// Helper — strip fileUrl from resource before sending to client
function sanitizeResource(resource) {
  if (!resource) return resource;
  const obj = resource.toObject ? resource.toObject() : { ...resource };
  delete obj.fileUrl;  // Never expose raw URL
  return obj;
}

/**
 * Clear all resources (Admin only)
 * DELETE /api/resources/clear-all
 */
export const clearAllResources = async (req, res) => {
  try {
    // Check if user is admin (you may need to adjust this check based on your auth system)
    if (req.user?.role !== 'admin' && req.user?.role !== 'mentor') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Admin privileges required.',
          code: 'INSUFFICIENT_PERMISSIONS',
        },
      });
    }

    // Get count before deletion
    const resourceCount = await Resource.countDocuments();

    if (resourceCount === 0) {
      return res.status(200).json({
        success: true,
        data: {
          message: 'No resources found. Database is already clean.',
          deleted: 0,
          modulesUpdated: 0,
          enrollmentsUpdated: 0
        },
      });
    }

    // Step 1: Clear resource references from modules
    const moduleUpdateResult = await Module.updateMany(
      { resources: { $exists: true, $ne: [] } },
      { $set: { resources: [] } }
    );

    // Step 2: Clear resource references from course enrollments
    const enrollmentUpdateResult = await CourseEnrollment.updateMany(
      {
        $or: [
          { completedVideos: { $exists: true, $ne: [] } },
          { lastWatchedVideo: { $exists: true } }
        ]
      },
      {
        $set: { 
          completedVideos: [],
          lastWatchedVideo: null
        }
      }
    );

    // Step 3: Delete all resources
    const deleteResult = await Resource.deleteMany({});

    res.status(200).json({
      success: true,
      data: {
        message: `Successfully cleared ${deleteResult.deletedCount} resources`,
        deleted: deleteResult.deletedCount,
        modulesUpdated: moduleUpdateResult.modifiedCount,
        enrollmentsUpdated: enrollmentUpdateResult.modifiedCount
      },
    });

  } catch (error) {
    console.error('Clear resources error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to clear resources',
        code: 'CLEAR_RESOURCES_ERROR',
      },
    });
  }
};

/**
 * Create a new resource
 * POST /api/resources
 */
export const createResource = async (req, res) => {
  try {
    const { title, description, fileUrl, fileType, topic, tags, isPublic, notesUrl } = req.body;

    // Validate required fields - Description is optional
    if (!title || !fileUrl || !topic) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide title, fileUrl, and topic',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // Create resource
    const resource = await resourceService.createResource({
      title,
      description: description || '', // Optional - can be empty
      fileUrl,
      fileType: fileType || 'other',
      topic,
      tags: tags || [],
      notesUrl: notesUrl || '', // Optional notes attachment
      uploadedBy: req.user._id,
      isPublic: isPublic !== false,
    });

    // Award XP for uploading a resource
    await addXP(req.user._id, 'resource_upload');

    // Invalidate resources cache so new resource shows up immediately
    deleteCache('resources:*').catch(() => {});

    res.status(201).json({
      success: true,
      data: { resource },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: {
        message: error.message || 'Failed to create resource',
        code: 'VALIDATION_ERROR',
      },
    });
  }
};

/**
 * Get all resources with pagination
 * GET /api/resources
 */
export const getResources = async (req, res) => {
  try {
    const { page = 1, limit = 10, topic, uploadedBy, tags, search } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const filters = {};
    if (topic) filters.topic = topic;
    if (uploadedBy) filters.uploadedBy = uploadedBy;
    if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];
    if (search) filters.search = search;

    // Cache key based on query params — TTL 3 min
    const cacheKey = `resources:${JSON.stringify({ pageNum, limitNum, ...filters })}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const resources = await resourceService.getResources(filters, { page: pageNum, limit: limitNum });
    const total = await resourceService.getResourceCount(filters);

    const response = {
      success: true,
      data: {
        resources,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    };

    await setCache(cacheKey, response, 180); // 3 min TTL

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch resources', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Get resource by ID
 * GET /api/resources/:id
 */
export const getResourceById = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await resourceService.getResourceById(id);

    res.status(200).json({
      success: true,
      data: {
        resource,
      },
    });
  } catch (error) {
    if (error.message === 'Resource not found') {
      return res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'NOT_FOUND',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch resource',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Search resources
 * GET /api/resources/search
 */
export const searchResources = async (req, res) => {
  try {
    const { keyword, page = 1, limit = 10 } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide a search keyword',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const resources = await resourceService.searchResources(keyword, {
      page: pageNum,
      limit: limitNum,
    });

    res.status(200).json({
      success: true,
      data: {
        resources,
        pagination: {
          page: pageNum,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to search resources',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Get resources by topic
 * GET /api/resources/topic/:topic
 */
export const getResourcesByTopic = async (req, res) => {
  try {
    const { topic } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const resources = await resourceService.getResourcesByTopic(topic, {
      page: pageNum,
      limit: limitNum,
    });

    const total = await resourceService.getResourceCount({ topic });

    res.status(200).json({
      success: true,
      data: {
        resources,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch resources by topic',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Download resource (increment download count)
 * POST /api/resources/:id/download
 */
export const downloadResource = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await resourceService.incrementDownloadCount(id);

    res.status(200).json({
      success: true,
      data: {
        resource,
        message: 'Download count incremented',
      },
    });
  } catch (error) {
    if (error.message === 'Resource not found') {
      return res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'NOT_FOUND',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to download resource',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Delete resource
 * DELETE /api/resources/:id
 */
export const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Delete request for resource:', id);

    // Simple delete without ownership check (for debugging)
    await resourceService.deleteResource(id);
    
    console.log('✅ Resource deleted successfully');

    res.status(200).json({
      success: true,
      data: {
        message: 'Resource deleted successfully',
      },
    });
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to delete resource',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Update resource
 * PUT /api/resources/:id
 */
export const updateResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, topic, tags, fileUrl, notesUrl } = req.body;

    // Verify ownership
    const resource = await resourceService.getResourceById(id);
    
    if (!resource.uploadedBy) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Resource has no owner information',
          code: 'DATA_ERROR',
        },
      });
    }
    
    const uploadedById = resource.uploadedBy._id || resource.uploadedBy;
    if (uploadedById.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You do not have permission to update this resource',
          code: 'FORBIDDEN',
        },
      });
    }

    // Prepare update data
    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description; // Allow empty string
    if (topic) updateData.topic = topic;
    if (tags !== undefined) updateData.tags = tags;
    if (notesUrl !== undefined) updateData.notesUrl = notesUrl; // Allow updating notes
    if (fileUrl && resource.fileType === 'link') {
      // Only allow updating fileUrl for YouTube links
      updateData.fileUrl = fileUrl;
    }

    const updatedResource = await resourceService.updateResource(id, updateData);

    res.status(200).json({
      success: true,
      data: {
        resource: updatedResource,
        message: 'Resource updated successfully',
      },
    });
  } catch (error) {
    if (error.message === 'Resource not found') {
      return res.status(404).json({
        success: false,
        error: {
          message: error.message,
          code: 'NOT_FOUND',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update resource',
        code: 'SERVER_ERROR',
      },
    });
  }
};

/**
 * Issue a short-lived signed token for watching a video resource.
 * Returns the YouTube video ID (not the full URL) to the frontend.
 * POST /api/resources/:id/token  (auth required)
 */
export const getVideoToken = async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await resourceService.getResourceById(id);

    if (resource.fileType !== 'link') {
      return res.status(400).json({
        success: false,
        error: { message: 'Not a video resource', code: 'INVALID_TYPE' },
      });
    }

    const videoId = extractYouTubeId(resource.fileUrl);
    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid YouTube URL stored', code: 'INVALID_URL' },
      });
    }

    // Generate signed token
    const token = generateVideoToken(id, String(req.user._id));

    // Increment view count
    resourceService.incrementDownloadCount(id).catch(() => {});

    // Return the signed token AND the video ID
    // The frontend uses the video ID to build the embed URL directly
    // This avoids the iframe redirect issue while still protecting the full URL
    res.status(200).json({ success: true, data: { token, videoId } });
  } catch (error) {
    if (error.message === 'Resource not found') {
      return res.status(404).json({
        success: false,
        error: { message: error.message, code: 'NOT_FOUND' },
      });
    }
    res.status(500).json({
      success: false,
      error: { message: 'Failed to generate token', code: 'SERVER_ERROR' },
    });
  }
};

/**
 * Validate token and redirect iframe to YouTube embed.
 * GET /api/resources/watch/:token  (no auth header needed — token IS the auth)
 * The iframe src points here; browser follows the redirect to YouTube embed.
 * No credentials are exposed to the frontend JS.
 */
export const watchVideo = async (req, res) => {
  try {
    const { token } = req.params;
    const { resourceId } = verifyVideoToken(token);

    const resource = await resourceService.getResourceById(resourceId);
    const videoId = extractYouTubeId(resource.fileUrl);

    if (!videoId) {
      return res.status(400).send('Invalid video URL');
    }

    // Redirect the iframe to the YouTube nocookie embed
    // youtube-nocookie.com prevents YouTube from setting tracking cookies
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
    res.redirect(302, embedUrl);
  } catch (error) {
    const isExpired = error.message === 'Token expired';
    const status = isExpired ? 410 : 403;
    // Return a small HTML page shown inside the iframe on error
    res.status(status).send(`
      <!DOCTYPE html>
      <html>
        <body style="display:flex;align-items:center;justify-content:center;height:100vh;
                     background:#0f0f0f;color:white;font-family:sans-serif;margin:0;flex-direction:column;gap:12px">
          <div style="font-size:2rem">⏰</div>
          <p style="margin:0;font-size:1rem">${isExpired ? 'Session expired. Please reload and try again.' : 'Access denied.'}</p>
        </body>
      </html>
    `);
  }
};

/**
 * Upload notes file for a resource
 * POST /api/resources/upload-notes
 */
export const uploadNotes = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No file uploaded', code: 'NO_FILE' },
      });
    }

    console.log('Uploading notes file:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer?.length
    });

    // Validate it's a proper file
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'File buffer is empty', code: 'EMPTY_BUFFER' },
      });
    }

    // Upload to Cloudinary using signed upload (more reliable)
    const uploadResult = await resourceService.uploadToCloudinary(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    console.log('Notes upload successful:', uploadResult.url);

    res.status(200).json({
      success: true,
      data: {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        message: 'Notes uploaded successfully',
      },
    });
  } catch (error) {
    console.error('Notes upload error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to upload notes', code: 'UPLOAD_ERROR' },
    });
  }
};

export default {
  createResource,
  getResources,
  getResourceById,
  searchResources,
  getResourcesByTopic,
  downloadResource,
  updateResource,
  deleteResource,
  getVideoToken,
  watchVideo,
  uploadNotes,
  clearAllResources,
};
