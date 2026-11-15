import Community from '../models/Community.js';
import Post from '../models/Post.js';

class CommunityService {
  /**
   * Create a new community
   * @param {Object} communityData - Community data
   * @returns {Object} - Created community
   */
  async createCommunity(communityData) {
    try {
      const { name, description, topic, createdBy } = communityData;

      if (!name || !description || !topic) {
        throw new Error('Name, description, and topic are required');
      }

      const community = new Community({
        name,
        description,
        topic,
        createdBy,
        members: [createdBy],
        memberCount: 1,
      });

      await community.save();
      return community.populate('createdBy', 'name profileImage');
    } catch (error) {
      console.error('Error creating community:', error);
      throw error;
    }
  }

  /**
   * Get communities with pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Pagination options
   * @returns {Array} - Array of communities
   */
  async getCommunities(filters = {}, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      const query = { isPublic: true };

      if (filters.topic) {
        query.topic = filters.topic;
      }

      const communities = await Community.find(query)
        .populate('createdBy', 'name profileImage')
        .populate('members', 'name profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return communities;
    } catch (error) {
      console.error('Error getting communities:', error);
      throw error;
    }
  }

  /**
   * Get community count
   * @param {Object} filters - Filter criteria
   * @returns {number} - Total count
   */
  async getCommunityCount(filters = {}) {
    try {
      const query = { isPublic: true };

      if (filters.topic) {
        query.topic = filters.topic;
      }

      const count = await Community.countDocuments(query);
      return count;
    } catch (error) {
      console.error('Error getting community count:', error);
      throw error;
    }
  }

  /**
   * Get community by ID
   * @param {string} communityId - Community ID
   * @returns {Object} - Community object
   */
  async getCommunityById(communityId) {
    try {
      const community = await Community.findById(communityId)
        .populate('createdBy', 'name profileImage')
        .populate('members', 'name profileImage');

      if (!community) {
        throw new Error('Community not found');
      }

      return community;
    } catch (error) {
      console.error('Error getting community by ID:', error);
      throw error;
    }
  }

  /**
   * Join a community
   * @param {string} communityId - Community ID
   * @param {string} userId - User ID
   * @returns {Object} - Updated community
   */
  async joinCommunity(communityId, userId) {
    try {
      const community = await Community.findById(communityId);

      if (!community) {
        throw new Error('Community not found');
      }

      // Check if user is already a member
      if (community.members.includes(userId)) {
        throw new Error('User is already a member of this community');
      }

      community.members.push(userId);
      community.memberCount = community.members.length;
      await community.save();

      return community.populate('createdBy', 'name profileImage').populate('members', 'name profileImage');
    } catch (error) {
      console.error('Error joining community:', error);
      throw error;
    }
  }

  /**
   * Leave a community
   * @param {string} communityId - Community ID
   * @param {string} userId - User ID
   * @returns {Object} - Updated community
   */
  async leaveCommunity(communityId, userId) {
    try {
      const community = await Community.findById(communityId);

      if (!community) {
        throw new Error('Community not found');
      }

      // Remove user from members
      community.members = community.members.filter((id) => id.toString() !== userId.toString());
      community.memberCount = community.members.length;
      await community.save();

      return community.populate('createdBy', 'name profileImage').populate('members', 'name profileImage');
    } catch (error) {
      console.error('Error leaving community:', error);
      throw error;
    }
  }

  /**
   * Create a post in a community
   * @param {string} communityId - Community ID
   * @param {string} userId - User ID
   * @param {string} content - Post content
   * @returns {Object} - Created post
   */
  async createPost(communityId, userId, content) {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error('Post content cannot be empty');
      }

      if (content.length > 5000) {
        throw new Error('Post content cannot exceed 5000 characters');
      }

      const post = new Post({
        communityId,
        userId,
        content: content.trim(),
      });

      await post.save();
      return post.populate('userId', 'name profileImage');
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  /**
   * Get posts for a community
   * @param {string} communityId - Community ID
   * @param {Object} options - Pagination options
   * @returns {Array} - Array of posts
   */
  async getPostsByCommunity(communityId, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      const posts = await Post.find({ communityId })
        .populate('userId', 'name profileImage')
        .populate('comments.userId', 'name profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return posts;
    } catch (error) {
      console.error('Error getting posts by community:', error);
      throw error;
    }
  }

  /**
   * Get post count for a community
   * @param {string} communityId - Community ID
   * @returns {number} - Total post count
   */
  async getPostCount(communityId) {
    try {
      const count = await Post.countDocuments({ communityId });
      return count;
    } catch (error) {
      console.error('Error getting post count:', error);
      throw error;
    }
  }

  /**
   * Like a post
   * @param {string} postId - Post ID
   * @param {string} userId - User ID
   * @returns {Object} - Updated post
   */
  async likePost(postId, userId) {
    try {
      const post = await Post.findById(postId);

      if (!post) {
        throw new Error('Post not found');
      }

      // Check if user already liked
      if (post.likes.includes(userId)) {
        throw new Error('User already liked this post');
      }

      post.likes.push(userId);
      post.likeCount = post.likes.length;
      await post.save();

      return post.populate('userId', 'name profileImage');
    } catch (error) {
      console.error('Error liking post:', error);
      throw error;
    }
  }

  /**
   * Unlike a post
   * @param {string} postId - Post ID
   * @param {string} userId - User ID
   * @returns {Object} - Updated post
   */
  async unlikePost(postId, userId) {
    try {
      const post = await Post.findById(postId);

      if (!post) {
        throw new Error('Post not found');
      }

      post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
      post.likeCount = post.likes.length;
      await post.save();

      return post.populate('userId', 'name profileImage');
    } catch (error) {
      console.error('Error unliking post:', error);
      throw error;
    }
  }

  /**
   * Add comment to a post
   * @param {string} postId - Post ID
   * @param {string} userId - User ID
   * @param {string} content - Comment content
   * @returns {Object} - Updated post
   */
  async addComment(postId, userId, content) {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error('Comment content cannot be empty');
      }

      const post = await Post.findById(postId);

      if (!post) {
        throw new Error('Post not found');
      }

      post.comments.push({
        userId,
        content: content.trim(),
      });

      post.commentCount = post.comments.length;
      await post.save();

      return post.populate('userId', 'name profileImage').populate('comments.userId', 'name profileImage');
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }
}

export default new CommunityService();
