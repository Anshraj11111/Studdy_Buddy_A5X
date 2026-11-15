/**
 * Course Access Controller - Show which students have access to courses
 */

import User from '../models/User.js';

/**
 * Get course access statistics and list
 * GET /api/admin/course-access
 */
export const getCourseAccessStats = async (req, res) => {
  try {
    // Get all students
    const allStudents = await User.find({ role: 'student' })
      .select('name email schoolName schoolPassword isPremium paidCourses createdAt')
      .lean();

    // Categorize students
    const withAccess = allStudents.filter(s => 
      (s.schoolName && s.schoolPassword) || // Has school credentials
      s.isPremium || // Is premium user
      (s.paidCourses && s.paidCourses.length > 0) // Has paid courses
    );

    const withoutAccess = allStudents.filter(s => 
      !(s.schoolName && s.schoolPassword) && 
      !s.isPremium && 
      (!s.paidCourses || s.paidCourses.length === 0)
    );

    // Further breakdown
    const schoolAccess = allStudents.filter(s => s.schoolName && s.schoolPassword);
    const premiumAccess = allStudents.filter(s => s.isPremium);
    const paidAccess = allStudents.filter(s => s.paidCourses && s.paidCourses.length > 0);

    res.json({
      success: true,
      data: {
        total: allStudents.length,
        withAccess: withAccess.length,
        withoutAccess: withoutAccess.length,
        breakdown: {
          school: schoolAccess.length,
          premium: premiumAccess.length,
          paid: paidAccess.length,
        },
        students: {
          withAccess: withAccess.map(s => ({
            _id: s._id,
            name: s.name,
            email: s.email,
            accessType: s.schoolName && s.schoolPassword ? 'school' : s.isPremium ? 'premium' : 'paid',
            schoolName: s.schoolName || '',
            isPremium: s.isPremium || false,
            paidCoursesCount: s.paidCourses?.length || 0,
            createdAt: s.createdAt,
          })),
          withoutAccess: withoutAccess.map(s => ({
            _id: s._id,
            name: s.name,
            email: s.email,
            accessType: 'none',
            schoolName: '',
            isPremium: false,
            paidCoursesCount: 0,
            createdAt: s.createdAt,
          })),
        },
      },
    });
  } catch (error) {
    console.error('Get course access error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
};

/**
 * Get detailed list by filter
 * GET /api/admin/course-access/list?filter=all|with|without|school|premium|paid&schoolName=Bardsley
 */
export const getCourseAccessList = async (req, res) => {
  try {
    const { filter = 'all', page = 1, limit = 50, search, schoolName } = req.query;

    // Build base query
    const query = { role: 'student' };

    // Apply search
    if (search) {
      const sanitized = search.trim();
      query.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { email: { $regex: sanitized, $options: 'i' } },
      ];
    }

    // Get all matching students
    let students = await User.find(query)
      .select('name email schoolName schoolPassword isPremium paidCourses createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Apply access type filter FIRST (before school filter)
    if (filter === 'with') {
      students = students.filter(s => 
        (s.schoolName && s.schoolPassword) || 
        s.isPremium || 
        (s.paidCourses && s.paidCourses.length > 0)
      );
    } else if (filter === 'without') {
      students = students.filter(s => 
        !(s.schoolName && s.schoolPassword) && 
        !s.isPremium && 
        (!s.paidCourses || s.paidCourses.length === 0)
      );
    } else if (filter === 'school') {
      // Only school code access
      students = students.filter(s => s.schoolName && s.schoolPassword);
    } else if (filter === 'premium') {
      // Only premium users
      students = students.filter(s => s.isPremium);
    } else if (filter === 'paid') {
      // Only paid courses users
      students = students.filter(s => s.paidCourses && s.paidCourses.length > 0);
    }

    // Apply school filter AFTER access filter (case-insensitive)
    if (schoolName && schoolName !== 'all') {
      students = students.filter(s => 
        s.schoolName && s.schoolName.toLowerCase() === schoolName.toLowerCase()
      );
    }

    // Paginate
    const total = students.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedStudents = students.slice(startIndex, endIndex);

    // Format response
    const formattedStudents = paginatedStudents.map(s => ({
      _id: s._id,
      name: s.name,
      email: s.email,
      hasAccess: !!(
        (s.schoolName && s.schoolPassword) || 
        s.isPremium || 
        (s.paidCourses && s.paidCourses.length > 0)
      ),
      accessType: 
        (s.schoolName && s.schoolPassword) ? 'School Code' :
        s.isPremium ? 'Premium' :
        (s.paidCourses && s.paidCourses.length > 0) ? 'Paid Courses' :
        'No Access',
      schoolName: s.schoolName || '-',
      isPremium: s.isPremium || false,
      paidCoursesCount: s.paidCourses?.length || 0,
      createdAt: s.createdAt,
    }));

    res.json({
      success: true,
      data: {
        students: formattedStudents,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get course access list error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
};


/**
 * Get list of unique school names
 * GET /api/admin/course-access/schools
 */
export const getSchoolsList = async (req, res) => {
  try {
    // Get unique school names from users with school passwords
    const schools = await User.distinct('schoolName', {
      role: 'student',
      schoolName: { $exists: true, $ne: '' }
    });

    // Normalize school names (remove duplicates with different cases)
    const normalizedSchools = {};
    schools.forEach(school => {
      if (school && school.trim()) {
        const normalized = school.trim();
        const lowerKey = normalized.toLowerCase();
        // Keep the most common capitalization (or first one found)
        if (!normalizedSchools[lowerKey]) {
          normalizedSchools[lowerKey] = normalized;
        }
      }
    });

    // Get unique normalized names and sort
    const uniqueSchools = Object.values(normalizedSchools).sort();

    res.json({
      success: true,
      data: { schools: uniqueSchools },
    });
  } catch (error) {
    console.error('Get schools list error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message },
    });
  }
};
