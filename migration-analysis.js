import axios from "axios";
import colors from "colors";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:8080/api/v1";
let authToken = "";

// Test configuration
const config = {
  auth: {
    email: "superadmin@medh.co",
    password: "Admin@123",
  },
};

const migrationAnalysis = async () => {
  console.log("\n🔍 Starting Migration Analysis: Legacy vs New Course Types...\n".cyan);

  try {
    // Authenticate
    console.log("🔐 Authenticating...".yellow);
    await authenticate();

    // Fetch data from both models
    console.log("\n📊 Fetching course data...".yellow);
    const legacyData = await fetchLegacyCourses();
    const newData = await fetchNewCourses();

    // Analyze structure differences
    console.log("\n🔬 Analyzing data structures...".yellow);
    const analysis = await analyzeDataStructures(legacyData, newData);

    // Generate detailed report
    console.log("\n📝 Generating migration report...".yellow);
    await generateMigrationReport(analysis, legacyData, newData);

    console.log("\n✅ Migration analysis completed successfully!".green);
    console.log("📄 Check 'migration-analysis-report.json' for detailed results".blue);

  } catch (error) {
    console.error("\n❌ Analysis failed:".red, error.message);
    if (error.response) {
      console.error("Response data:", JSON.stringify(error.response.data, null, 2));
    }
  }
};

const authenticate = async () => {
  try {
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: config.auth.email,
      password: config.auth.password,
    });
    
    if (loginResponse.data.success) {
      authToken = loginResponse.data.data.access_token;
      console.log("  ✓ Authentication successful".green);
    } else {
      throw new Error("Authentication failed");
    }
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
};

const fetchLegacyCourses = async () => {
  try {
    const headers = { Authorization: `Bearer ${authToken}` };
    
    // Fetch legacy courses
    const response = await axios.get(`${BASE_URL}/courses/get?limit=50`, { headers });
    
    if (response.data.success) {
      console.log(`  ✓ Fetched ${response.data.data.length} legacy courses`.green);
      return response.data.data;
    } else {
      throw new Error("Failed to fetch legacy courses");
    }
  } catch (error) {
    console.error("  ❌ Failed to fetch legacy courses".red);
    throw error;
  }
};

const fetchNewCourses = async () => {
  try {
    const headers = { Authorization: `Bearer ${authToken}` };
    
    // Fetch all course types
    const [blendedRes, liveRes, freeRes] = await Promise.all([
      axios.get(`${BASE_URL}/tcourse/blended?limit=20`, { headers }),
      axios.get(`${BASE_URL}/tcourse/live?limit=20`, { headers }),
      axios.get(`${BASE_URL}/tcourse/free?limit=20`, { headers })
    ]);

    const newCourses = {
      blended: blendedRes.data.success ? blendedRes.data.data : [],
      live: liveRes.data.success ? liveRes.data.data : [],
      free: freeRes.data.success ? freeRes.data.data : []
    };

    const totalNew = newCourses.blended.length + newCourses.live.length + newCourses.free.length;
    console.log(`  ✓ Fetched ${totalNew} new course type courses`.green);
    console.log(`    - Blended: ${newCourses.blended.length}`.gray);
    console.log(`    - Live: ${newCourses.live.length}`.gray);
    console.log(`    - Free: ${newCourses.free.length}`.gray);
    
    return newCourses;
  } catch (error) {
    console.error("  ❌ Failed to fetch new courses".red);
    throw error;
  }
};

const analyzeDataStructures = async (legacyData, newData) => {
  const analysis = {
    legacy: {
      totalCourses: legacyData.length,
      sampleCourse: legacyData[0] || null,
      uniqueFields: new Set(),
      fieldTypes: {},
      nestedStructures: {}
    },
    new: {
      totalCourses: newData.blended.length + newData.live.length + newData.free.length,
      blendedSample: newData.blended[0] || null,
      liveSample: newData.live[0] || null,
      freeSample: newData.free[0] || null,
      uniqueFields: new Set(),
      fieldTypes: {},
      nestedStructures: {}
    },
    differences: {
      legacyOnlyFields: [],
      newOnlyFields: [],
      structuralDifferences: [],
      dataTypeDifferences: [],
      validationDifferences: []
    }
  };

  // Analyze legacy structure
  if (legacyData.length > 0) {
    analyzeFieldStructure(legacyData[0], analysis.legacy, 'legacy');
    
    // Check multiple legacy courses for field variations
    legacyData.slice(0, 10).forEach(course => {
      Object.keys(course).forEach(key => {
        analysis.legacy.uniqueFields.add(key);
      });
    });
  }

  // Analyze new course types structure
  const allNewCourses = [...newData.blended, ...newData.live, ...newData.free];
  if (allNewCourses.length > 0) {
    analyzeFieldStructure(allNewCourses[0], analysis.new, 'new');
    
    // Check all new courses for field variations
    allNewCourses.forEach(course => {
      Object.keys(course).forEach(key => {
        analysis.new.uniqueFields.add(key);
      });
    });
  }

  // Find differences
  const legacyFields = Array.from(analysis.legacy.uniqueFields);
  const newFields = Array.from(analysis.new.uniqueFields);

  analysis.differences.legacyOnlyFields = legacyFields.filter(field => !newFields.includes(field));
  analysis.differences.newOnlyFields = newFields.filter(field => !legacyFields.includes(field));

  // Analyze specific structural differences
  await analyzeStructuralDifferences(legacyData, allNewCourses, analysis);

  return analysis;
};

const analyzeFieldStructure = (course, analysisSection, modelType) => {
  if (!course) return;

  Object.entries(course).forEach(([key, value]) => {
    analysisSection.uniqueFields.add(key);
    analysisSection.fieldTypes[key] = {
      type: Array.isArray(value) ? 'array' : typeof value,
      isNull: value === null,
      isUndefined: value === undefined,
      arrayElementType: Array.isArray(value) && value.length > 0 ? typeof value[0] : null
    };

    // Analyze nested structures
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      analysisSection.nestedStructures[key] = Object.keys(value);
    }
  });
};

const analyzeStructuralDifferences = async (legacyData, newData, analysis) => {
  // Compare pricing structures
  const legacyPricing = legacyData.find(course => course.prices && course.prices.length > 0);
  const newPricing = newData.find(course => course.prices && course.prices.length > 0);

  if (legacyPricing && newPricing) {
    const legacyPriceStructure = legacyPricing.prices[0];
    const newPriceStructure = newPricing.prices[0];
    
    const legacyPriceKeys = Object.keys(legacyPriceStructure);
    const newPriceKeys = Object.keys(newPriceStructure);
    
    if (JSON.stringify(legacyPriceKeys.sort()) !== JSON.stringify(newPriceKeys.sort())) {
      analysis.differences.structuralDifferences.push({
        field: 'prices',
        issue: 'Different pricing structure',
        legacy: legacyPriceKeys,
        new: newPriceKeys
      });
    }
  }

  // Compare curriculum structures
  const legacyCurriculum = legacyData.find(course => course.curriculum && course.curriculum.length > 0);
  const newCurriculum = newData.find(course => course.curriculum && course.curriculum.length > 0);

  if (legacyCurriculum && newCurriculum) {
    const legacyCurrStructure = Object.keys(legacyCurriculum.curriculum[0]);
    const newCurrStructure = Object.keys(newCurriculum.curriculum[0]);
    
    if (JSON.stringify(legacyCurrStructure.sort()) !== JSON.stringify(newCurrStructure.sort())) {
      analysis.differences.structuralDifferences.push({
        field: 'curriculum',
        issue: 'Different curriculum structure',
        legacy: legacyCurrStructure,
        new: newCurrStructure
      });
    }
  }

  // Check for enum value differences
  const enumFields = ['status', 'course_level', 'category_type', 'class_type'];
  
  enumFields.forEach(field => {
    const legacyValues = new Set();
    const newValues = new Set();
    
    legacyData.forEach(course => {
      if (course[field]) legacyValues.add(course[field]);
    });
    
    newData.forEach(course => {
      if (course[field]) newValues.add(course[field]);
    });
    
    const legacyOnly = Array.from(legacyValues).filter(val => !newValues.has(val));
    const newOnly = Array.from(newValues).filter(val => !legacyValues.has(val));
    
    if (legacyOnly.length > 0 || newOnly.length > 0) {
      analysis.differences.validationDifferences.push({
        field,
        legacyOnlyValues: legacyOnly,
        newOnlyValues: newOnly
      });
    }
  });
};

const generateMigrationReport = async (analysis, legacyData, newData) => {
  const report = {
    migrationAnalysisReport: {
      timestamp: new Date().toISOString(),
      summary: {
        totalLegacyCourses: analysis.legacy.totalCourses,
        totalNewCourses: analysis.new.totalCourses,
        potentialDataLoss: analysis.differences.legacyOnlyFields.length > 0,
        migrationComplexity: calculateMigrationComplexity(analysis)
      },
      dataLossAssessment: {
        fieldsOnlyInLegacy: analysis.differences.legacyOnlyFields.map(field => ({
          field,
          dataType: analysis.legacy.fieldTypes[field]?.type || 'unknown',
          impact: assessFieldImpact(field, legacyData),
          recommendation: getFieldMigrationRecommendation(field)
        })),
        fieldsOnlyInNew: analysis.differences.newOnlyFields.map(field => ({
          field,
          dataType: analysis.new.fieldTypes[field]?.type || 'unknown',
          purpose: getFieldPurpose(field)
        }))
      },
      structuralDifferences: analysis.differences.structuralDifferences,
      validationDifferences: analysis.differences.validationDifferences,
      migrationStrategy: generateMigrationStrategy(analysis, legacyData),
      riskAssessment: generateRiskAssessment(analysis),
      recommendations: generateRecommendations(analysis)
    }
  };

  // Save report to file
  fs.writeFileSync('migration-analysis-report.json', JSON.stringify(report, null, 2));
  
  // Display summary
  displaySummary(report.migrationAnalysisReport);
  
  return report;
};

const calculateMigrationComplexity = (analysis) => {
  let complexity = 0;
  
  // Add complexity for legacy-only fields
  complexity += analysis.differences.legacyOnlyFields.length * 2;
  
  // Add complexity for structural differences
  complexity += analysis.differences.structuralDifferences.length * 3;
  
  // Add complexity for validation differences
  complexity += analysis.differences.validationDifferences.length * 1;
  
  if (complexity === 0) return 'LOW';
  if (complexity < 10) return 'MEDIUM';
  return 'HIGH';
};

const assessFieldImpact = (field, legacyData) => {
  const usageCount = legacyData.filter(course => {
    const value = course[field];
    return value !== null && value !== undefined && value !== '' && 
           (!Array.isArray(value) || value.length > 0);
  }).length;
  
  const usagePercentage = (usageCount / legacyData.length) * 100;
  
  if (usagePercentage > 50) return 'HIGH - Used in >50% of courses';
  if (usagePercentage > 20) return 'MEDIUM - Used in 20-50% of courses';
  if (usagePercentage > 0) return 'LOW - Used in <20% of courses';
  return 'NONE - No data found';
};

const getFieldMigrationRecommendation = (field) => {
  const recommendations = {
    // Legacy curriculum handling
    'curriculum': 'Transform to new course-type specific curriculum structure',
    'bonus_modules': 'Map to new bonus_modules structure in base schema',
    'final_evaluation': 'Map to new final_evaluation structure in base schema',
    
    // Pricing differences (should be minimal now)
    'pricing_old_format': 'Convert to unified pricing array structure',
    
    // Instructor/assignment fields
    'assigned_instructor': 'Map to assigned_instructor in base schema',
    'instructors': 'Handle multiple instructors based on course type',
    
    // Metadata fields
    'unique_key': 'Generate UUID if needed for unique_key field',
    'specifications': 'Map to specifications ObjectId reference',
    
    // Default recommendation
    'default': 'Evaluate if field is still needed in new model'
  };
  
  return recommendations[field] || recommendations['default'];
};

const getFieldPurpose = (field) => {
  const purposes = {
    'course_type': 'Discriminator field for course type classification',
    'meta': 'Analytics and tracking data',
    'discriminatorKey': 'Mongoose discriminator key',
    '__v': 'Mongoose version key',
    'createdAt': 'Auto-generated timestamp',
    'updatedAt': 'Auto-generated timestamp'
  };
  
  return purposes[field] || 'New field in enhanced model';
};

const generateMigrationStrategy = (analysis, legacyData) => {
  const strategy = {
    approach: 'PHASED_MIGRATION',
    phases: [
      {
        phase: 1,
        name: 'Data Mapping & Validation',
        description: 'Map legacy fields to new structure and validate data integrity',
        estimatedEffort: 'Medium',
        tasks: [
          'Create field mapping configuration',
          'Validate data transformation rules',
          'Test migration on sample data'
        ]
      },
      {
        phase: 2,
        name: 'Course Type Classification',
        description: 'Classify legacy courses into blended/live/free types',
        estimatedEffort: 'High',
        tasks: [
          'Analyze category_type and class_type patterns',
          'Create classification rules',
          'Handle edge cases and mixed types'
        ]
      },
      {
        phase: 3,
        name: 'Curriculum Transformation',
        description: 'Transform legacy curriculum to type-specific structures',
        estimatedEffort: 'High',
        tasks: [
          'Map week-based to section-based curriculum',
          'Transform lesson structures',
          'Preserve resource and assignment data'
        ]
      },
      {
        phase: 4,
        name: 'Bulk Migration',
        description: 'Execute migration with rollback capability',
        estimatedEffort: 'Medium',
        tasks: [
          'Backup all legacy data',
          'Run migration scripts',
          'Validate migrated data',
          'Update API integrations'
        ]
      }
    ],
    estimatedTimeline: '6-8 weeks',
    rollbackPlan: 'Maintain legacy model in parallel during transition'
  };
  
  return strategy;
};

const generateRiskAssessment = (analysis) => {
  const risks = [];
  
  if (analysis.differences.legacyOnlyFields.length > 0) {
    risks.push({
      risk: 'Data Loss',
      severity: 'HIGH',
      description: `${analysis.differences.legacyOnlyFields.length} fields exist only in legacy model`,
      mitigation: 'Add missing fields to new model or create data preservation strategy'
    });
  }
  
  if (analysis.differences.structuralDifferences.length > 0) {
    risks.push({
      risk: 'Structural Incompatibility',
      severity: 'MEDIUM',
      description: 'Different data structures between models',
      mitigation: 'Create transformation logic for structural differences'
    });
  }
  
  if (analysis.differences.validationDifferences.length > 0) {
    risks.push({
      risk: 'Validation Conflicts',
      severity: 'LOW',
      description: 'Different validation rules between models',
      mitigation: 'Update validation rules to accommodate legacy data'
    });
  }
  
  if (risks.length === 0) {
    risks.push({
      risk: 'Minimal Risk',
      severity: 'LOW',
      description: 'Models are highly compatible',
      mitigation: 'Standard testing and validation procedures'
    });
  }
  
  return risks;
};

const generateRecommendations = (analysis) => {
  const recommendations = [];
  
  recommendations.push({
    priority: 'HIGH',
    category: 'Pre-Migration',
    action: 'Backup all legacy course data before migration',
    rationale: 'Ensure data safety and rollback capability'
  });
  
  if (analysis.differences.legacyOnlyFields.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Data Preservation',
      action: 'Verify all legacy fields are supported in new model',
      rationale: 'Prevent data loss during migration'
    });
  }
  
  recommendations.push({
    priority: 'MEDIUM',
    category: 'Migration Strategy',
    action: 'Use phased migration approach',
    rationale: 'Reduce risk and allow for validation at each step'
  });
  
  recommendations.push({
    priority: 'MEDIUM',
    category: 'Testing',
    action: 'Test migration with sample data first',
    rationale: 'Validate transformation logic before full migration'
  });
  
  recommendations.push({
    priority: 'LOW',
    category: 'Post-Migration',
    action: 'Monitor API performance and data integrity',
    rationale: 'Ensure smooth transition for frontend applications'
  });
  
  return recommendations;
};

const displaySummary = (report) => {
  console.log("\n📊 MIGRATION ANALYSIS SUMMARY".cyan.bold);
  console.log("═".repeat(50).gray);
  
  console.log(`\n📈 Data Overview:`.yellow);
  console.log(`  • Legacy Courses: ${report.summary.totalLegacyCourses}`.white);
  console.log(`  • New Courses: ${report.summary.totalNewCourses}`.white);
  console.log(`  • Migration Complexity: ${report.summary.migrationComplexity}`.white);
  
  console.log(`\n⚠️  Potential Data Loss:`.yellow);
  if (report.dataLossAssessment.fieldsOnlyInLegacy.length > 0) {
    console.log(`  • ${report.dataLossAssessment.fieldsOnlyInLegacy.length} fields only in legacy model:`.red);
    report.dataLossAssessment.fieldsOnlyInLegacy.forEach(field => {
      console.log(`    - ${field.field} (${field.impact})`.red);
    });
  } else {
    console.log(`  • No legacy-only fields found ✓`.green);
  }
  
  console.log(`\n🆕 New Model Enhancements:`.yellow);
  if (report.dataLossAssessment.fieldsOnlyInNew.length > 0) {
    console.log(`  • ${report.dataLossAssessment.fieldsOnlyInNew.length} new fields in enhanced model:`.blue);
    report.dataLossAssessment.fieldsOnlyInNew.slice(0, 5).forEach(field => {
      console.log(`    - ${field.field}`.blue);
    });
    if (report.dataLossAssessment.fieldsOnlyInNew.length > 5) {
      console.log(`    - ... and ${report.dataLossAssessment.fieldsOnlyInNew.length - 5} more`.blue);
    }
  }
  
  console.log(`\n⚡ Risk Assessment:`.yellow);
  report.riskAssessment.forEach(risk => {
    const color = risk.severity === 'HIGH' ? 'red' : risk.severity === 'MEDIUM' ? 'yellow' : 'green';
    console.log(`  • ${risk.risk}: ${risk.severity}`[color]);
  });
  
  console.log(`\n📋 Top Recommendations:`.yellow);
  report.recommendations.slice(0, 3).forEach(rec => {
    const color = rec.priority === 'HIGH' ? 'red' : rec.priority === 'MEDIUM' ? 'yellow' : 'green';
    console.log(`  • [${rec.priority}] ${rec.action}`[color]);
  });
  
  console.log(`\n⏱️  Estimated Timeline: ${report.migrationStrategy.estimatedTimeline}`.cyan);
  console.log(`📄 Full report saved to: migration-analysis-report.json`.blue);
};

// Export for potential use in other tests
export { 
  migrationAnalysis,
  fetchLegacyCourses,
  fetchNewCourses,
  analyzeDataStructures 
};

// Run analysis if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrationAnalysis();
} 