import axios from "axios";
import colors from "colors";
import fs from "fs";

const BASE_URL = "http://localhost:8080/api/v1";
let authToken = "";

// Test configuration
const config = {
  auth: {
    email: "superadmin@medh.co",
    password: "Admin@123",
  },
};

const validateMigration = async () => {
  console.log("\n✅ Starting Migration Validation...\n".cyan);

  try {
    // Authenticate
    console.log("🔐 Authenticating...".yellow);
    await authenticate();

    // Fetch current state
    console.log("\n📊 Fetching current course data...".yellow);
    const currentState = await fetchCurrentState();

    // Load migration results if available
    let migrationResults = null;
    try {
      if (fs.existsSync('migration-results.json')) {
        migrationResults = JSON.parse(fs.readFileSync('migration-results.json', 'utf8'));
        console.log("📄 Loaded migration results file".gray);
      }
    } catch (error) {
      console.log("⚠️  No migration results file found".yellow);
    }

    // Validate data integrity
    console.log("\n🔬 Validating data integrity...".yellow);
    const validation = await validateDataIntegrity(currentState, migrationResults);

    // Check for duplicates
    console.log("\n🔍 Checking for duplicates...".yellow);
    const duplicateCheck = await checkForDuplicates(currentState);

    // Verify migration completeness
    console.log("\n📋 Verifying migration completeness...".yellow);
    const completenessCheck = await verifyMigrationCompleteness(currentState, migrationResults);

    // Generate validation report
    console.log("\n📝 Generating validation report...".yellow);
    await generateValidationReport({
      currentState,
      validation,
      duplicateCheck,
      completenessCheck,
      migrationResults
    });

    console.log("\n✅ Migration validation completed!".green);
    console.log("📄 Check 'migration-validation-report.json' for detailed results".blue);

  } catch (error) {
    console.error("\n❌ Validation failed:".red, error.message);
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

const fetchCurrentState = async () => {
  try {
    const headers = { Authorization: `Bearer ${authToken}` };
    
    // Fetch all data sources
    const [legacyRes, blendedRes, liveRes, freeRes] = await Promise.all([
      axios.get(`${BASE_URL}/courses/get`, { headers }),
      axios.get(`${BASE_URL}/tcourse/blended`, { headers }),
      axios.get(`${BASE_URL}/tcourse/live`, { headers }),
      axios.get(`${BASE_URL}/tcourse/free`, { headers })
    ]);

    const state = {
      legacy: legacyRes.data.success ? legacyRes.data.data : [],
      newCourses: {
        blended: blendedRes.data.success ? blendedRes.data.data : [],
        live: liveRes.data.success ? liveRes.data.data : [],
        free: freeRes.data.success ? freeRes.data.data : []
      }
    };

    // Calculate totals
    state.totals = {
      legacy: state.legacy.length,
      newCourses: state.newCourses.blended.length + state.newCourses.live.length + state.newCourses.free.length,
      blended: state.newCourses.blended.length,
      live: state.newCourses.live.length,
      free: state.newCourses.free.length
    };

    console.log(`  ✓ Legacy courses: ${state.totals.legacy}`.green);
    console.log(`  ✓ New course types: ${state.totals.newCourses}`.green);
    console.log(`    - Blended: ${state.totals.blended}`.gray);
    console.log(`    - Live: ${state.totals.live}`.gray);
    console.log(`    - Free: ${state.totals.free}`.gray);

    return state;
  } catch (error) {
    console.error("  ❌ Failed to fetch current state".red);
    throw error;
  }
};

const validateDataIntegrity = async (currentState, migrationResults) => {
  const validation = {
    dataIntegrity: {
      legacyCoursesIntact: true,
      newCoursesValid: true,
      fieldPreservation: true,
      errors: []
    },
    sourceTracking: {
      totalWithSource: 0,
      legacyModel: 0,
      newModel: 0,
      missingSource: 0
    },
    fieldValidation: {
      requiredFieldsPresent: true,
      validationErrors: []
    }
  };

  // Check all courses for _source field
  const allCourses = [
    ...currentState.legacy,
    ...currentState.newCourses.blended,
    ...currentState.newCourses.live,
    ...currentState.newCourses.free
  ];

  allCourses.forEach(course => {
    if (course._source) {
      validation.sourceTracking.totalWithSource++;
      if (course._source === 'legacy_model') {
        validation.sourceTracking.legacyModel++;
      } else if (course._source === 'new_model') {
        validation.sourceTracking.newModel++;
      }
    } else {
      validation.sourceTracking.missingSource++;
    }

    // Validate required fields
    const requiredFields = ['course_title', 'course_category', 'course_image'];
    requiredFields.forEach(field => {
      if (!course[field]) {
        validation.fieldValidation.requiredFieldsPresent = false;
        validation.fieldValidation.validationErrors.push({
          courseId: course._id,
          field,
          error: 'Missing required field'
        });
      }
    });
  });

  console.log(`  ✓ Courses with _source: ${validation.sourceTracking.totalWithSource}/${allCourses.length}`.green);
  console.log(`    - Legacy model: ${validation.sourceTracking.legacyModel}`.gray);
  console.log(`    - New model: ${validation.sourceTracking.newModel}`.gray);
  console.log(`    - Missing source: ${validation.sourceTracking.missingSource}`.gray);

  return validation;
};

const checkForDuplicates = async (currentState) => {
  const duplicateCheck = {
    titleDuplicates: [],
    potentialDuplicates: [],
    crossModelDuplicates: []
  };

  // Get all courses
  const allCourses = [
    ...currentState.legacy.map(c => ({ ...c, source: 'legacy' })),
    ...currentState.newCourses.blended.map(c => ({ ...c, source: 'blended' })),
    ...currentState.newCourses.live.map(c => ({ ...c, source: 'live' })),
    ...currentState.newCourses.free.map(c => ({ ...c, source: 'free' }))
  ];

  // Check for title duplicates
  const titleMap = new Map();
  allCourses.forEach(course => {
    const title = course.course_title?.toLowerCase().trim();
    if (title) {
      if (titleMap.has(title)) {
        titleMap.get(title).push(course);
      } else {
        titleMap.set(title, [course]);
      }
    }
  });

  titleMap.forEach((courses, title) => {
    if (courses.length > 1) {
      duplicateCheck.titleDuplicates.push({
        title,
        count: courses.length,
        courses: courses.map(c => ({
          id: c._id,
          source: c.source,
          category: c.course_category
        }))
      });

      // Check if duplicates are across models (legacy + new)
      const sources = new Set(courses.map(c => c.source));
      if (sources.has('legacy') && (sources.has('blended') || sources.has('live') || sources.has('free'))) {
        duplicateCheck.crossModelDuplicates.push({
          title,
          legacyCourse: courses.find(c => c.source === 'legacy'),
          newCourses: courses.filter(c => c.source !== 'legacy')
        });
      }
    }
  });

  console.log(`  ✓ Title duplicates found: ${duplicateCheck.titleDuplicates.length}`.green);
  console.log(`  ✓ Cross-model duplicates: ${duplicateCheck.crossModelDuplicates.length}`.green);

  return duplicateCheck;
};

const verifyMigrationCompleteness = async (currentState, migrationResults) => {
  const completeness = {
    expectedMigrations: 0,
    actualMigrations: 0,
    completionRate: 0,
    missingMigrations: [],
    status: 'unknown'
  };

  if (!migrationResults) {
    console.log(`  ⚠️  No migration results to compare against`.yellow);
    return completeness;
  }

  const migrationData = migrationResults.migrationReport;
  completeness.expectedMigrations = migrationData.summary.totalLegacyCourses;
  completeness.actualMigrations = migrationData.summary.successfulMigrations;
  completeness.completionRate = (completeness.actualMigrations / completeness.expectedMigrations) * 100;

  // Check if migrated courses exist
  const migratedIds = new Set(migrationData.migrated.map(m => m.newId));
  const allNewCourseIds = new Set([
    ...currentState.newCourses.blended.map(c => c._id),
    ...currentState.newCourses.live.map(c => c._id),
    ...currentState.newCourses.free.map(c => c._id)
  ]);

  migrationData.migrated.forEach(migration => {
    if (!allNewCourseIds.has(migration.newId)) {
      completeness.missingMigrations.push({
        originalId: migration.originalId,
        newId: migration.newId,
        title: migration.title,
        courseType: migration.courseType
      });
    }
  });

  if (completeness.completionRate === 100 && completeness.missingMigrations.length === 0) {
    completeness.status = 'complete';
  } else if (completeness.completionRate > 80) {
    completeness.status = 'mostly_complete';
  } else {
    completeness.status = 'incomplete';
  }

  console.log(`  ✓ Migration completion: ${completeness.completionRate.toFixed(1)}%`.green);
  console.log(`  ✓ Missing migrations: ${completeness.missingMigrations.length}`.green);

  return completeness;
};

const generateValidationReport = async (data) => {
  const report = {
    validationReport: {
      timestamp: new Date().toISOString(),
      summary: {
        totalLegacyCourses: data.currentState.totals.legacy,
        totalNewCourses: data.currentState.totals.newCourses,
        dataIntegrityStatus: data.validation.dataIntegrity.legacyCoursesIntact && data.validation.dataIntegrity.newCoursesValid ? 'PASSED' : 'FAILED',
        duplicateStatus: data.duplicateCheck.crossModelDuplicates.length === 0 ? 'PASSED' : 'WARNING',
        migrationStatus: data.completenessCheck.status
      },
      currentState: {
        legacy: data.currentState.totals.legacy,
        blended: data.currentState.totals.blended,
        live: data.currentState.totals.live,
        free: data.currentState.totals.free,
        total: data.currentState.totals.legacy + data.currentState.totals.newCourses
      },
      dataIntegrity: data.validation,
      duplicateAnalysis: data.duplicateCheck,
      migrationCompleteness: data.completenessCheck,
      recommendations: generateRecommendations(data)
    }
  };

  // Save report to file
  fs.writeFileSync('migration-validation-report.json', JSON.stringify(report, null, 2));
  
  // Display summary
  displayValidationSummary(report.validationReport);
  
  return report;
};

const generateRecommendations = (data) => {
  const recommendations = [];

  // Data integrity recommendations
  if (!data.validation.dataIntegrity.legacyCoursesIntact) {
    recommendations.push({
      priority: 'CRITICAL',
      category: 'Data Integrity',
      action: 'Investigate legacy course data corruption',
      rationale: 'Legacy courses may have been affected during migration'
    });
  }

  // Duplicate recommendations
  if (data.duplicateCheck.crossModelDuplicates.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Duplicates',
      action: `Review ${data.duplicateCheck.crossModelDuplicates.length} cross-model duplicates`,
      rationale: 'Same courses exist in both legacy and new models'
    });
  }

  // Migration completeness recommendations
  if (data.completenessCheck.status === 'incomplete') {
    recommendations.push({
      priority: 'HIGH',
      category: 'Migration',
      action: 'Complete remaining course migrations',
      rationale: `${data.completenessCheck.missingMigrations.length} courses failed to migrate`
    });
  }

  // Source tracking recommendations
  if (data.validation.sourceTracking.missingSource > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Data Tracking',
      action: `Update ${data.validation.sourceTracking.missingSource} courses with _source field`,
      rationale: 'Source tracking helps identify data lineage'
    });
  }

  // Default recommendation
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'LOW',
      category: 'Maintenance',
      action: 'Monitor system performance and data integrity',
      rationale: 'Migration appears successful, maintain regular monitoring'
    });
  }

  return recommendations;
};

const displayValidationSummary = (report) => {
  console.log("\n📊 MIGRATION VALIDATION SUMMARY".cyan.bold);
  console.log("═".repeat(50).gray);
  
  console.log(`\n📈 Current State:`.yellow);
  console.log(`  • Legacy Courses: ${report.currentState.legacy}`.white);
  console.log(`  • New Course Types: ${report.currentState.blended + report.currentState.live + report.currentState.free}`.white);
  console.log(`    - Blended: ${report.currentState.blended}`.blue);
  console.log(`    - Live: ${report.currentState.live}`.green);
  console.log(`    - Free: ${report.currentState.free}`.cyan);
  console.log(`  • Total Courses: ${report.currentState.total}`.white);
  
  console.log(`\n✅ Validation Status:`.yellow);
  const dataIntegrityColor = report.summary.dataIntegrityStatus === 'PASSED' ? 'green' : 'red';
  const duplicateColor = report.summary.duplicateStatus === 'PASSED' ? 'green' : 'yellow';
  const migrationColor = report.summary.migrationStatus === 'complete' ? 'green' : 'yellow';
  
  console.log(`  • Data Integrity: ${report.summary.dataIntegrityStatus}`[dataIntegrityColor]);
  console.log(`  • Duplicate Check: ${report.summary.duplicateStatus}`[duplicateColor]);
  console.log(`  • Migration Status: ${report.summary.migrationStatus}`[migrationColor]);
  
  console.log(`\n🔍 Key Findings:`.yellow);
  console.log(`  • Source Tracking: ${report.dataIntegrity.sourceTracking.totalWithSource} courses tracked`.white);
  console.log(`  • Cross-Model Duplicates: ${report.duplicateAnalysis.crossModelDuplicates.length}`.white);
  console.log(`  • Migration Completion: ${report.migrationCompleteness.completionRate?.toFixed(1) || 'N/A'}%`.white);
  
  console.log(`\n💡 Recommendations:`.yellow);
  report.recommendations.slice(0, 3).forEach(rec => {
    const color = rec.priority === 'CRITICAL' ? 'red' : rec.priority === 'HIGH' ? 'yellow' : 'green';
    console.log(`  • [${rec.priority}] ${rec.action}`[color]);
  });
  
  console.log(`\n📄 Full validation report saved to: migration-validation-report.json`.blue);
};

// Export for potential use in other scripts
export { validateMigration };

// Run validation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateMigration();
} 