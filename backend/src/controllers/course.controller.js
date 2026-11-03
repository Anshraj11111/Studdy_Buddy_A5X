import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Resource from '../models/Resource.js';
import CourseEnrollment from '../models/CourseEnrollment.js';
import { escapeRegex } from '../utils/sanitize.js';

/**
 * Check if user has valid premium access (with payment verification)
 * @param {Object} user - User object from req.user
 * @returns {Promise<boolean>}
 */
async function hasValidPremiumAccess(user) {
  // Use hasFreeAccess flag from User model's toJSON() method
  // This flag is already computed considering:
  // - Mentors (always free)
  // - School credentials (free access)
  // - isPremium flag (premium access)
  if (user.hasFreeAccess) {
    console.log(`✅ User ${user._id} has FREE ACCESS (hasFreeAccess=true)`);
    return true;
  }
  
  // Double-check with payment verification for premium users
  if (user.isPremium) {
    const Payment = (await import('../models/Payment.js')).default;
    const approvedPayment = await Payment.findOne({
      userId: user._id,
      status: 'approved',
    }).lean();
    
    if (approvedPayment) {
      console.log(`✅ User ${user._id} has approved payment - PREMIUM ACCESS granted`);
      return true;
    }
    
    // isPremium flag is set but no approved payment found
    // Still allow access for backward compatibility
    console.warn(`⚠️ User ${user._id} has isPremium=true but no approved payment found - allowing access`);
    return true;
  }
  
  console.log(`❌ User ${user._id} has NO access - hasFreeAccess=${user.hasFreeAccess}, isPremium=${user.isPremium}`);
  return false;
}

/**
 * Get all courses (with filtering)
 * GET /api/courses
 */
export const getAllCourses = async (req, res) => {
  try {
    const { topic, difficulty, isPremium, search, sort = '-createdAt' } = req.query;
    
    const filter = { isActive: true };
    
    if (topic) filter.topic = topic;
    if (difficulty) filter.difficulty = difficulty;
    if (isPremium !== undefined) filter.isPremium = isPremium === 'true';
    if (search) {
      const sanitized = escapeRegex(search);
      filter.$or = [
        { title: { $regex: sanitized, $options: 'i' } },
        { description: { $regex: sanitized, $options: 'i' } },
        { tags: { $in: [new RegExp(sanitized, 'i')] } },
      ];
    }
    
    const courses = await Course.find(filter)
      .populate('createdBy', 'name profileImage')
      .sort(sort)
      .lean();
    
    // Add enrollment status for authenticated user
    if (req.user) {
      const enrollments = await CourseEnrollment.find({
        userId: req.user._id,
        courseId: { $in: courses.map(c => c._id) },
      }).lean();
      
      const enrollmentMap = {};
      enrollments.forEach(e => {
        enrollmentMap[e.courseId.toString()] = e;
      });
      
      courses.forEach(course => {
        course.enrollment = enrollmentMap[course._id.toString()] || null;
      });
    }
    
    res.json({
      success: true,
      data: { courses },
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch courses' },
    });
  }
};

/**
 * Get single course with modules
 * GET /api/courses/:id
 */
export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('createdBy', 'name profileImage')
      .populate({
        path: 'modules',
        options: { sort: { order: 1 } },
      })
      .lean();
    
    if (!course) {
      return res.status(404).json({
        success: false,
        error: { message: 'Course not found' },
      });
    }
    
    // Check enrollment
    let enrollment = null;
    if (req.user) {
      enrollment = await CourseEnrollment.findOne({
        userId: req.user._id,
        courseId: course._id,
      }).lean();
    }
    
    course.enrollment = enrollment;
    
    res.json({
      success: true,
      data: { course },
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch course' },
    });
  }
};

/**
 * Get module lectures (with completion status, progress tracking, and quiz info)
 * GET /api/modules/:id/lectures
 */
export const getModuleLectures = async (req, res) => {
  try {
    // Fetch module WITHOUT populate - use manual fetch to avoid cross-connection issues
    const module = await Module.findById(req.params.id).lean();
    
    if (!module) {
      return res.status(404).json({
        success: false,
        error: { message: 'Module not found' },
      });
    }
    
    // Manually fetch resources using Resource model (same secondary DB connection)
    const resources = await Resource.find({ moduleId: req.params.id })
      .populate('uploadedBy', 'name profileImage')
      .sort({ order: 1 })
      .lean();
    
    // Check completion status, progress, and quiz availability if user is authenticated
    if (req.user) {
      const userId = req.user._id;
      
      // Get enrollment status
      const enrollment = await CourseEnrollment.findOne({
        userId,
        courseId: module.courseId,
      }).lean();
      
      // Get lecture progress for all lectures in this module
      const LectureProgress = (await import('../models/LectureProgress.js')).default;
      const progressRecords = await LectureProgress.find({
        userId,
        moduleId: req.params.id,
      }).lean();
      
      // Create a map of progress by lectureId
      const progressMap = new Map();
      progressRecords.forEach(p => {
        progressMap.set(p.lectureId.toString(), p);
      });
      
      // Get quiz availability for all lectures
      const Quiz = (await import('../models/Quiz.js')).default;
      const QuizAttempt = (await import('../models/QuizAttempt.js')).default;
      const lectureIds = resources.map(r => r._id);
      const quizzes = await Quiz.find({ 
        lectureId: { $in: lectureIds },
        isActive: true 
      }).lean();
      
      // Create a map of quizzes by lectureId
      const quizMap = new Map();
      quizzes.forEach(q => {
        quizMap.set(q.lectureId.toString(), q);
      });
      
      // Get quiz attempts for user
      const quizAttempts = await QuizAttempt.find({
        userId,
        lectureId: { $in: lectureIds },
        status: 'completed'
      }).lean();
      
      // Create a map of best attempts by lectureId
      const attemptMap = new Map();
      quizAttempts.forEach(attempt => {
        const lectureIdStr = attempt.lectureId.toString();
        const existing = attemptMap.get(lectureIdStr);
        if (!existing || attempt.score.percentage > existing.score.percentage) {
          attemptMap.set(lectureIdStr, attempt);
        }
      });
      
      // Enrich resources with progress and quiz info
      const completedSet = enrollment 
        ? new Set(enrollment.completedVideos.map(v => v.toString()))
        : new Set();
        
      resources.forEach(resource => {
        const resourceIdStr = resource._id.toString();
        const progress = progressMap.get(resourceIdStr);
        const quiz = quizMap.get(resourceIdStr);
        const bestAttempt = attemptMap.get(resourceIdStr);
        
        // Legacy completion status
        resource.completed = completedSet.has(resourceIdStr);
        
        // New progress tracking
        resource.progress = progress ? {
          watchedPercentage: progress.watchedPercentage,
          isCompleted: progress.isCompleted,
          lastWatchedAt: progress.lastWatchedAt,
          completedAt: progress.completedAt,
        } : {
          watchedPercentage: 0,
          isCompleted: false,
          lastWatchedAt: null,
          completedAt: null,
        };
        
        // Quiz information
        resource.quiz = quiz ? {
          hasQuiz: true,
          quizId: quiz._id,
          isUnlocked: progress?.isCompleted || false, // Quiz unlocks after lecture completion
          questionCount: quiz.questions.length,
          passingScore: quiz.passingScore,
          maxAttempts: quiz.maxAttempts,
          attemptCount: quizAttempts.filter(a => a.lectureId.toString() === resourceIdStr).length,
          bestScore: bestAttempt ? bestAttempt.score.percentage : null,
          isPassed: bestAttempt ? bestAttempt.isPassed : false,
        } : {
          hasQuiz: false,
          quizId: null,
          isUnlocked: false,
        };
      });
    } else {
      // For unauthenticated users, add default values
      resources.forEach(resource => {
        resource.completed = false;
        resource.progress = {
          watchedPercentage: 0,
          isCompleted: false,
          lastWatchedAt: null,
          completedAt: null,
        };
        resource.quiz = {
          hasQuiz: false,
          quizId: null,
          isUnlocked: false,
        };
      });
    }
    
    module.resources = resources;
    
    res.json({
      success: true,
      data: { module },
    });
  } catch (error) {
    console.error('Get lectures error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch lectures' },
    });
  }
};

/**
 * Get secure video URL (with token-based security)
 * GET /api/courses/lectures/:lectureId/video-url
 * Returns a short-lived token instead of direct URL
 */
export const getSecureVideoUrl = async (req, res) => {
  try {
    const { lectureId } = req.params;
    
    // Find the resource
    const resource = await Resource.findById(lectureId).lean();
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        error: { message: 'Lecture not found' },
      });
    }
    
    // Find the module to get courseId
    const module = await Module.findOne({ resources: lectureId }).lean();
    
    if (!module) {
      return res.status(404).json({
        success: false,
        error: { message: 'Module not found' },
      });
    }
    
    // Check if user has premium access (with payment verification)
    const hasPremiumAccess = await hasValidPremiumAccess(req.user);
    
    if (!hasPremiumAccess) {
      return res.status(403).json({
        success: false,
        error: { message: 'Please enroll in the course to access this content' },
      });
    }
    
    // ✅ Increment view count for this lecture (only on successful access)
    await Resource.findByIdAndUpdate(lectureId, {
      $inc: { viewCount: 1 }
    });
    console.log(`📊 View count incremented for lecture: ${lectureId}`);
    
    // Generate a short-lived token (90 seconds) instead of returning URL directly
    const { generateVideoToken } = await import('../utils/videoToken.js');
    const token = generateVideoToken(String(lectureId), String(req.user._id));
    
    res.json({
      success: true,
      data: {
        token, // Return token instead of direct URL
        title: resource.title,
        type: resource.type || resource.fileType,
        // URL will be fetched using this token in a separate request
      },
    });
  } catch (error) {
    console.error('Get secure video URL error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get video URL' },
    });
  }
};

/**
 * Get actual video URL using token (very short-lived - 90 seconds)
 * GET /api/courses/play/:token
 * This endpoint verifies the token and returns the actual YouTube URL
 */
export const playVideoWithToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verify token
    const { verifyVideoToken } = await import('../utils/videoToken.js');
    const { resourceId, userId } = verifyVideoToken(token);
    
    // Ensure the user matches
    if (String(userId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Token user mismatch' },
      });
    }
    
    // Fetch resource
    const resource = await Resource.findById(resourceId).lean();
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        error: { message: 'Resource not found' },
      });
    }
    
    const videoUrl = resource.fileUrl || resource.url;
    
    if (!videoUrl) {
      return res.status(404).json({
        success: false,
        error: { message: 'Video URL not found' },
      });
    }
    
    res.json({
      success: true,
      data: {
        url: videoUrl,
      },
    });
  } catch (error) {
    console.error('Play video with token error:', error);
    res.status(403).json({
      success: false,
      error: { message: error.message || 'Invalid or expired token' },
    });
  }
};

/**
 * Enroll in course
 * POST /api/courses/:id/enroll
 */
export const enrollInCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        error: { message: 'Course not found' },
      });
    }
    
    // Check if already enrolled
    const existing = await CourseEnrollment.findOne({
      userId: req.user._id,
      courseId: course._id,
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        error: { message: 'Already enrolled in this course' },
      });
    }
    
    // Check if premium and user has access (with payment verification)
    if (course.isPremium) {
      const hasPremiumAccess = await hasValidPremiumAccess(req.user);
      if (!hasPremiumAccess) {
        return res.status(403).json({
          success: false,
          error: { message: 'Premium access required. Please complete payment to access this course.' },
        });
      }
    }
    
    // Create enrollment
    const enrollment = await CourseEnrollment.create({
      userId: req.user._id,
      courseId: course._id,
    });
    
    // Increment enrolled count
    course.enrolledCount += 1;
    await course.save();
    
    res.status(201).json({
      success: true,
      data: { enrollment },
      message: 'Successfully enrolled in course',
    });
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to enroll in course' },
    });
  }
};

/**
 * Mark video as completed
 * POST /api/courses/:courseId/videos/:videoId/complete
 */
export const markVideoCompleted = async (req, res) => {
  try {
    const { courseId, videoId } = req.params;
    
    const enrollment = await CourseEnrollment.findOne({
      userId: req.user._id.toString(),
      courseId: courseId.toString(),
    });
    
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Not enrolled in this course' },
      });
    }
    
    // Add to completed if not already
    if (!enrollment.completedVideos.includes(videoId)) {
      enrollment.completedVideos.push(videoId);
      enrollment.lastWatchedVideo = videoId;
      enrollment.lastAccessedAt = new Date();
      
      // Calculate progress
      const course = await Course.findById(courseId);
      enrollment.progress = Math.round(
        (enrollment.completedVideos.length / course.totalVideos) * 100
      );
      
      await enrollment.save();
    }
    
    res.json({
      success: true,
      data: { enrollment },
    });
  } catch (error) {
    console.error('Mark complete error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update progress' },
    });
  }
};

/**
 * Get my enrolled courses
 * GET /api/courses/my-courses
 */
export const getMyCourses = async (req, res) => {
  try {
    const enrollments = await CourseEnrollment.find({
      userId: req.user._id,
    })
      .populate({
        path: 'courseId',
        populate: { path: 'createdBy', select: 'name profileImage' },
      })
      .sort({ lastAccessedAt: -1 })
      .lean();
    
    const courses = enrollments
      .filter(e => e.courseId) // Filter out deleted courses
      .map(e => ({
        ...e.courseId,
        enrollment: {
          progress: e.progress,
          lastAccessedAt: e.lastAccessedAt,
          enrolledAt: e.enrolledAt,
        },
      }));
    
    res.json({
      success: true,
      data: { courses },
    });
  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch enrolled courses' },
    });
  }
};

export default {
  getAllCourses,
  getCourseById,
  getModuleLectures,
  getSecureVideoUrl,
  playVideoWithToken,
  enrollInCourse,
  markVideoCompleted,
  getMyCourses,
};
