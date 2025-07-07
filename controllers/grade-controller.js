import Grade from "../models/grade-model.js";
import Course from "../models/course-model.js";

// Create a new grade
export const createGrade = async (req, res) => {
  try {
    const {
      name,
      description,
      icon,
      color,
      isActive,
      sortOrder,
      metadata,
      academicInfo,
    } = req.body;

    // Validate input
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Grade name is required",
      });
    }

    // Check for duplicate grade name
    const existingGrade = await Grade.findOne({ name });
    if (existingGrade) {
      return res.status(400).json({
        success: false,
        message: "Grade with this name already exists",
      });
    }

    const grade = new Grade({
      name,
      description,
      icon,
      color,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0,
      metadata,
      academicInfo,
    });

    await grade.save();

    res.status(201).json({
      success: true,
      message: "Grade created successfully",
      data: grade,
    });
  } catch (error) {
    console.error("Error creating grade:", error);
    res.status(500).json({
      success: false,
      message: "Error creating grade",
      error: error.message,
    });
  }
};

// Get all grades
export const getGrades = async (req, res) => {
  try {
    const {
      isActive,
      academicLevel,
      difficulty,
      sortBy = "sortOrder",
      order = "asc",
      limit,
      page = 1,
    } = req.query;

    // Build query
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }
    if (academicLevel) {
      query["academicInfo.gradeLevel"] = academicLevel;
    }
    if (difficulty) {
      query["metadata.difficultyLevel"] = difficulty;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = order === "desc" ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * (parseInt(limit) || 0);
    const limitNum = parseInt(limit) || 0;

    let gradesQuery = Grade.find(query).sort(sort);

    if (limitNum > 0) {
      gradesQuery = gradesQuery.skip(skip).limit(limitNum);
    }

    const grades = await gradesQuery;

    // Get total count for pagination
    const total = await Grade.countDocuments(query);

    res.status(200).json({
      success: true,
      message: "Grades fetched successfully",
      data: grades,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        pages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      },
    });
  } catch (error) {
    console.error("Error fetching grades:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching grades",
      error: error.message,
    });
  }
};

// Get a single grade by ID
export const getGradeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Grade ID is required",
      });
    }

    const grade = await Grade.findById(id);

    if (!grade) {
      return res.status(404).json({
        success: false,
        message: "Grade not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Grade fetched successfully",
      data: grade,
    });
  } catch (error) {
    console.error("Error fetching grade:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching grade",
      error: error.message,
    });
  }
};

// Update a grade by ID
export const updateGrade = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      icon,
      color,
      isActive,
      sortOrder,
      metadata,
      academicInfo,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Grade ID is required",
      });
    }

    // Check if grade exists
    const existingGrade = await Grade.findById(id);
    if (!existingGrade) {
      return res.status(404).json({
        success: false,
        message: "Grade not found",
      });
    }

    // Check for duplicate name if name is being updated
    if (name && name !== existingGrade.name) {
      const duplicateGrade = await Grade.findOne({ name });
      if (duplicateGrade) {
        return res.status(400).json({
          success: false,
          message: "Grade with this name already exists",
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (academicInfo !== undefined) updateData.academicInfo = academicInfo;

    const updatedGrade = await Grade.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Grade updated successfully",
      data: updatedGrade,
    });
  } catch (error) {
    console.error("Error updating grade:", error);
    res.status(500).json({
      success: false,
      message: "Error updating grade",
      error: error.message,
    });
  }
};

// Delete a grade by ID
export const deleteGrade = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Grade ID is required",
      });
    }

    // Check if grade exists
    const grade = await Grade.findById(id);
    if (!grade) {
      return res.status(404).json({
        success: false,
        message: "Grade not found",
      });
    }

    // Check if there are any courses associated with this grade
    const associatedCourses = await Course.find({ course_grade: id });
    if (associatedCourses.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete grade with associated courses",
        associatedCoursesCount: associatedCourses.length,
      });
    }

    await Grade.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Grade deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting grade:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting grade",
      error: error.message,
    });
  }
};

// Get grade with associated courses
export const getGradeDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Grade ID is required",
      });
    }

    const grade = await Grade.findById(id);
    if (!grade) {
      return res.status(404).json({
        success: false,
        message: "Grade not found",
      });
    }

    // Get associated courses
    const associatedCourses = await Course.find({ course_grade: id })
      .select("course_title course_category course_duration prices status")
      .limit(10);

    res.status(200).json({
      success: true,
      message: "Grade details fetched successfully",
      data: {
        grade,
        associatedCourses,
        stats: {
          coursesCount: associatedCourses.length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching grade details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching grade details",
      error: error.message,
    });
  }
};

// Get grades by academic level
export const getGradesByAcademicLevel = async (req, res) => {
  try {
    const { level } = req.params;

    if (!level) {
      return res.status(400).json({
        success: false,
        message: "Academic level is required",
      });
    }

    const validLevels = [
      "preschool",
      "primary",
      "middle",
      "high",
      "university",
    ];
    if (!validLevels.includes(level)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid academic level. Must be one of: preschool, primary, middle, high, university",
      });
    }

    const grades = await Grade.getByAcademicLevel(level);

    res.status(200).json({
      success: true,
      message: `Grades for ${level} level fetched successfully`,
      data: grades,
    });
  } catch (error) {
    console.error("Error fetching grades by academic level:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching grades by academic level",
      error: error.message,
    });
  }
};

// Get grades by difficulty level
export const getGradesByDifficulty = async (req, res) => {
  try {
    const { difficulty } = req.params;

    if (!difficulty) {
      return res.status(400).json({
        success: false,
        message: "Difficulty level is required",
      });
    }

    const validDifficulties = [
      "beginner",
      "elementary",
      "intermediate",
      "advanced",
      "expert",
    ];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid difficulty level. Must be one of: beginner, elementary, intermediate, advanced, expert",
      });
    }

    const grades = await Grade.getByDifficulty(difficulty);

    res.status(200).json({
      success: true,
      message: `Grades with ${difficulty} difficulty fetched successfully`,
      data: grades,
    });
  } catch (error) {
    console.error("Error fetching grades by difficulty:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching grades by difficulty",
      error: error.message,
    });
  }
};

// Bulk create default grades
export const createDefaultGrades = async (req, res) => {
  try {
    const defaultGrades = [
      {
        name: "Preschool",
        description: "Early childhood education for children aged 3-5 years",
        icon: "preschool-icon",
        color: "#F59E0B",
        sortOrder: 1,
        metadata: {
          ageRange: { min: 3, max: 5 },
          difficultyLevel: "beginner",
          subjectAreas: ["Basic Skills", "Social Development", "Creative Arts"],
          learningObjectives: [
            "Develop basic motor skills",
            "Learn social interaction",
            "Explore creativity",
          ],
          prerequisites: [],
        },
        academicInfo: {
          gradeLevel: "preschool",
          typicalAge: { min: 3, max: 5 },
          curriculumStandards: ["Early Learning Standards"],
          keySkills: ["Basic Communication", "Motor Skills", "Social Skills"],
        },
      },
      {
        name: "Grade 1-2",
        description: "Primary education for children in grades 1-2",
        icon: "primary-icon",
        color: "#10B981",
        sortOrder: 2,
        metadata: {
          ageRange: { min: 6, max: 8 },
          difficultyLevel: "elementary",
          subjectAreas: ["Reading", "Mathematics", "Science", "Social Studies"],
          learningObjectives: [
            "Develop reading skills",
            "Learn basic math",
            "Explore science concepts",
          ],
          prerequisites: ["Preschool education"],
        },
        academicInfo: {
          gradeLevel: "primary",
          typicalAge: { min: 6, max: 8 },
          curriculumStandards: ["Common Core Standards"],
          keySkills: ["Reading", "Basic Math", "Writing", "Critical Thinking"],
        },
      },
      {
        name: "Grade 3-4",
        description: "Primary education for children in grades 3-4",
        icon: "primary-icon",
        color: "#3B82F6",
        sortOrder: 3,
        metadata: {
          ageRange: { min: 8, max: 10 },
          difficultyLevel: "elementary",
          subjectAreas: [
            "Reading",
            "Mathematics",
            "Science",
            "Social Studies",
            "Language Arts",
          ],
          learningObjectives: [
            "Advanced reading comprehension",
            "Mathematical reasoning",
            "Scientific inquiry",
          ],
          prerequisites: ["Grade 1-2 education"],
        },
        academicInfo: {
          gradeLevel: "primary",
          typicalAge: { min: 8, max: 10 },
          curriculumStandards: ["Common Core Standards"],
          keySkills: [
            "Reading Comprehension",
            "Mathematical Reasoning",
            "Writing",
            "Research Skills",
          ],
        },
      },
      {
        name: "Grade 5-6",
        description: "Middle school education for children in grades 5-6",
        icon: "middle-icon",
        color: "#8B5CF6",
        sortOrder: 4,
        metadata: {
          ageRange: { min: 10, max: 12 },
          difficultyLevel: "intermediate",
          subjectAreas: [
            "Mathematics",
            "Science",
            "Language Arts",
            "Social Studies",
            "Technology",
          ],
          learningObjectives: [
            "Advanced problem solving",
            "Scientific method",
            "Critical analysis",
          ],
          prerequisites: ["Grade 3-4 education"],
        },
        academicInfo: {
          gradeLevel: "middle",
          typicalAge: { min: 10, max: 12 },
          curriculumStandards: [
            "Common Core Standards",
            "Next Generation Science Standards",
          ],
          keySkills: [
            "Problem Solving",
            "Critical Analysis",
            "Research",
            "Technology Literacy",
          ],
        },
      },
      {
        name: "Grade 7-8",
        description: "Middle school education for children in grades 7-8",
        icon: "middle-icon",
        color: "#EC4899",
        sortOrder: 5,
        metadata: {
          ageRange: { min: 12, max: 14 },
          difficultyLevel: "intermediate",
          subjectAreas: [
            "Mathematics",
            "Science",
            "Language Arts",
            "Social Studies",
            "Technology",
            "Foreign Languages",
          ],
          learningObjectives: [
            "Advanced mathematical concepts",
            "Scientific research",
            "Literary analysis",
          ],
          prerequisites: ["Grade 5-6 education"],
        },
        academicInfo: {
          gradeLevel: "middle",
          typicalAge: { min: 12, max: 14 },
          curriculumStandards: [
            "Common Core Standards",
            "Next Generation Science Standards",
          ],
          keySkills: [
            "Advanced Problem Solving",
            "Scientific Research",
            "Literary Analysis",
            "Digital Literacy",
          ],
        },
      },
      {
        name: "Grade 9-10",
        description: "High school education for students in grades 9-10",
        icon: "high-icon",
        color: "#EF4444",
        sortOrder: 6,
        metadata: {
          ageRange: { min: 14, max: 16 },
          difficultyLevel: "advanced",
          subjectAreas: [
            "Mathematics",
            "Science",
            "Language Arts",
            "Social Studies",
            "Technology",
            "Foreign Languages",
            "Electives",
          ],
          learningObjectives: [
            "College preparatory skills",
            "Advanced research methods",
            "Critical thinking",
          ],
          prerequisites: ["Grade 7-8 education"],
        },
        academicInfo: {
          gradeLevel: "high",
          typicalAge: { min: 14, max: 16 },
          curriculumStandards: [
            "Common Core Standards",
            "Next Generation Science Standards",
          ],
          keySkills: [
            "College Prep Skills",
            "Advanced Research",
            "Critical Thinking",
            "Leadership",
          ],
        },
      },
      {
        name: "Grade 11-12",
        description: "High school education for students in grades 11-12",
        icon: "high-icon",
        color: "#DC2626",
        sortOrder: 7,
        metadata: {
          ageRange: { min: 16, max: 18 },
          difficultyLevel: "advanced",
          subjectAreas: [
            "Advanced Mathematics",
            "Advanced Science",
            "Language Arts",
            "Social Studies",
            "Technology",
            "College Prep",
          ],
          learningObjectives: [
            "College readiness",
            "Advanced academic skills",
            "Career preparation",
          ],
          prerequisites: ["Grade 9-10 education"],
        },
        academicInfo: {
          gradeLevel: "high",
          typicalAge: { min: 16, max: 18 },
          curriculumStandards: [
            "Common Core Standards",
            "Next Generation Science Standards",
            "College Readiness Standards",
          ],
          keySkills: [
            "College Readiness",
            "Advanced Academic Skills",
            "Career Preparation",
            "Independent Learning",
          ],
        },
      },
      {
        name: "UG - Graduate - Professionals",
        description: "University and professional education for adults",
        icon: "university-icon",
        color: "#1F2937",
        sortOrder: 8,
        metadata: {
          ageRange: { min: 18, max: 100 },
          difficultyLevel: "expert",
          subjectAreas: [
            "Professional Development",
            "Advanced Studies",
            "Specialized Skills",
            "Research",
          ],
          learningObjectives: [
            "Professional advancement",
            "Specialized knowledge",
            "Research skills",
          ],
          prerequisites: ["High school education or equivalent"],
        },
        academicInfo: {
          gradeLevel: "university",
          typicalAge: { min: 18, max: 100 },
          curriculumStandards: [
            "Professional Standards",
            "Industry Standards",
            "Academic Standards",
          ],
          keySkills: [
            "Professional Skills",
            "Specialized Knowledge",
            "Research Methods",
            "Leadership",
          ],
        },
      },
    ];

    const createdGrades = [];
    const errors = [];

    for (const gradeData of defaultGrades) {
      try {
        const existingGrade = await Grade.findOne({ name: gradeData.name });
        if (existingGrade) {
          errors.push(`Grade "${gradeData.name}" already exists`);
          continue;
        }

        const grade = new Grade(gradeData);
        await grade.save();
        createdGrades.push(grade);
      } catch (error) {
        errors.push(`Error creating "${gradeData.name}": ${error.message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: "Default grades creation completed",
      data: {
        created: createdGrades,
        errors: errors.length > 0 ? errors : null,
      },
    });
  } catch (error) {
    console.error("Error creating default grades:", error);
    res.status(500).json({
      success: false,
      message: "Error creating default grades",
      error: error.message,
    });
  }
};
