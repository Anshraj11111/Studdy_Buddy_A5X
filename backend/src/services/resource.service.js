import Resource from '../models/Resource.js';
import cloudinary from '../config/cloudinary.js';
import { Readable } from 'stream';
import { escapeRegex } from '../utils/sanitize.js';

class ResourceService {
  /**
   * Upload a file buffer to Cloudinary
   * @param {Buffer} fileBuffer - File buffer from multer memoryStorage
   * @param {string} mimetype - File MIME type
   * @param {string} originalName - Original filename
   * @returns {Object} - Cloudinary upload result { url, publicId, fileType }
   */
  async uploadToCloudinary(fileBuffer, mimetype, originalName) {
    return new Promise((resolve, reject) => {
      // Verify Cloudinary config at runtime
      if (!process.env.CLOUDINARY_API_KEY) {
        console.error('❌ CLOUDINARY_API_KEY not found in environment!');
        return reject(new Error('Cloudinary API key is not configured'));
      }

      // Determine Cloudinary resource type
      let resourceType = 'auto';
      let fileType = 'other';

      if (mimetype.startsWith('image/')) {
        resourceType = 'image';
        fileType = 'image';
      } else if (mimetype.startsWith('video/')) {
        resourceType = 'video';
        fileType = 'video';
      } else if (mimetype === 'application/pdf') {
        resourceType = 'raw';
        fileType = 'pdf';
      } else if (
        mimetype.includes('word') ||
        mimetype.includes('document')
      ) {
        resourceType = 'raw';
        fileType = 'doc';
      } else {
        resourceType = 'raw';
        fileType = 'other';
      }

      console.log('🔧 Cloudinary upload starting:', {
        originalName,
        mimetype,
        resourceType,
        fileType,
        bufferSize: fileBuffer.length
      });

      // Use upload_stream with proper error handling
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'studdy-buddy/notes',
          resource_type: resourceType,
          public_id: `${Date.now()}-${originalName.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_')}`,
          access_mode: 'public',
          type: 'upload',
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', error);
            return reject(new Error(`Cloudinary upload failed: ${error.message}`));
          }
          
          console.log('✅ Cloudinary upload success:', {
            url: result.secure_url,
            format: result.format,
            bytes: result.bytes,
            resource_type: result.resource_type
          });
          
          // Return the secure URL without fl_attachment for inline preview
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            fileType,
          });
        }
      );

      // Write buffer directly to stream (no conversion)
      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Delete a file from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @param {string} resourceType - 'image', 'video', or 'raw'
   */
  async deleteFromCloudinary(publicId, resourceType = 'raw') {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (error) {
      console.error('Cloudinary delete error:', error.message);
      // Non-blocking — don't throw, just log
    }
  }

  /**
   * Create a new resource
   * @param {Object} resourceData - Resource data
   * @returns {Object} - Created resource
   */
  async createResource(resourceData) {
    try {
      this.validateResourceMetadata(resourceData);

      const resource = new Resource(resourceData);
      await resource.save();
      return resource.populate('uploadedBy', 'name profileImage');
    } catch (error) {
      console.error('Error creating resource:', error);
      throw error;
    }
  }

  /**
   * Validate resource metadata
   * @param {Object} resourceData - Resource data to validate
   */
  validateResourceMetadata(resourceData) {
    if (!resourceData.title || resourceData.title.trim().length === 0) {
      throw new Error('Resource title is required');
    }

    if (resourceData.title.length > 200) {
      throw new Error('Resource title cannot exceed 200 characters');
    }

    // Description is optional
    if (resourceData.description && resourceData.description.length > 2000) {
      throw new Error('Resource description cannot exceed 2000 characters');
    }

    if (!resourceData.fileUrl || resourceData.fileUrl.trim().length === 0) {
      throw new Error('Resource file URL is required');
    }

    if (!resourceData.topic || resourceData.topic.trim().length === 0) {
      throw new Error('Resource topic is required');
    }

    if (!resourceData.uploadedBy) {
      throw new Error('Uploader ID is required');
    }
  }

  /**
   * Get resources with pagination and filtering
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Pagination options
   * @returns {Array} - Array of resources
   */
  async getResources(filters = {}, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      const query = { isPublic: true };

      if (filters.topic) {
        query.topic = filters.topic;
      }

      if (filters.uploadedBy) {
        query.uploadedBy = filters.uploadedBy;
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      const resources = await Resource.find(query)
        .populate('uploadedBy', 'name profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return resources;
    } catch (error) {
      console.error('Error getting resources:', error);
      throw error;
    }
  }

  /**
   * Get resource count
   * @param {Object} filters - Filter criteria
   * @returns {number} - Total count
   */
  async getResourceCount(filters = {}) {
    try {
      const query = { isPublic: true };

      if (filters.topic) {
        query.topic = filters.topic;
      }

      if (filters.uploadedBy) {
        query.uploadedBy = filters.uploadedBy;
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      const count = await Resource.countDocuments(query);
      return count;
    } catch (error) {
      console.error('Error getting resource count:', error);
      throw error;
    }
  }

  /**
   * Get resource by ID
   * @param {string} resourceId - Resource ID
   * @returns {Object} - Resource object
   */
  async getResourceById(resourceId) {
    try {
      const resource = await Resource.findById(resourceId).populate(
        'uploadedBy',
        'name profileImage'
      );

      if (!resource) {
        throw new Error('Resource not found');
      }

      return resource;
    } catch (error) {
      console.error('Error getting resource by ID:', error);
      throw error;
    }
  }

  /**
   * Get resources by topic
   * @param {string} topic - Topic name
   * @param {Object} options - Pagination options
   * @returns {Array} - Array of resources
   */
  async getResourcesByTopic(topic, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      const resources = await Resource.find({ topic, isPublic: true })
        .populate('uploadedBy', 'name profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return resources;
    } catch (error) {
      console.error('Error getting resources by topic:', error);
      throw error;
    }
  }

  /**
   * Search resources
   * @param {string} keyword - Search keyword
   * @param {Object} options - Pagination options
   * @returns {Array} - Array of matching resources
   */
  async searchResources(keyword, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      const sanitized = escapeRegex(keyword);
      const resources = await Resource.find(
        {
          isPublic: true,
          $or: [
            { title: { $regex: sanitized, $options: 'i' } },
            { description: { $regex: sanitized, $options: 'i' } },
            { tags: { $regex: sanitized, $options: 'i' } },
          ],
        }
      )
        .populate('uploadedBy', 'name profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return resources;
    } catch (error) {
      console.error('Error searching resources:', error);
      throw error;
    }
  }

  /**
   * Update resource
   * @param {string} resourceId - Resource ID
   * @param {Object} updateData - Data to update
   * @returns {Object} - Updated resource
   */
  async updateResource(resourceId, updateData) {
    try {
      const resource = await Resource.findByIdAndUpdate(resourceId, updateData, {
        new: true,
      }).populate('uploadedBy', 'name profileImage');

      if (!resource) {
        throw new Error('Resource not found');
      }

      return resource;
    } catch (error) {
      console.error('Error updating resource:', error);
      throw error;
    }
  }

  /**
   * Increment download count
   * @param {string} resourceId - Resource ID
   * @returns {Object} - Updated resource
   */
  async incrementDownloadCount(resourceId) {
    try {
      const resource = await Resource.findByIdAndUpdate(
        resourceId,
        { $inc: { downloads: 1 } },
        { new: true }
      ).populate('uploadedBy', 'name profileImage');

      if (!resource) {
        throw new Error('Resource not found');
      }

      return resource;
    } catch (error) {
      console.error('Error incrementing download count:', error);
      throw error;
    }
  }

  /**
   * Delete resource
   * @param {string} resourceId - Resource ID
   * @returns {Object} - Deleted resource
   */
  async deleteResource(resourceId) {
    try {
      const resource = await Resource.findByIdAndDelete(resourceId);

      if (!resource) {
        throw new Error('Resource not found');
      }

      return resource;
    } catch (error) {
      console.error('Error deleting resource:', error);
      throw error;
    }
  }

  /**
   * Update resource
   * @param {string} resourceId - Resource ID
   * @param {Object} updateData - Data to update
   * @returns {Object} - Updated resource
   */
  async updateResource(resourceId, updateData) {
    try {
      const resource = await Resource.findByIdAndUpdate(
        resourceId,
        updateData,
        { new: true, runValidators: true }
      ).populate('uploadedBy', 'name email profileImage');

      if (!resource) {
        throw new Error('Resource not found');
      }

      return resource;
    } catch (error) {
      console.error('Error updating resource:', error);
      throw error;
    }
  }
}

export default new ResourceService();
