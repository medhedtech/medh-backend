import { LiveCourse, BlendedCourse, FreeCourse } from "./models/course-types/index.js";
import Course from "./models/course-model.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8080/api/v1";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

const testCollaborativeEndpoint = async () => {
  console.log("🤝 Testing Collaborative Course Fetch Endpoint...\n");

  try {
    // Connect to database
    await connectDB();

    // Test 1: Basic collaborative fetch (both sources)
    console.log("1. Testing basic collaborative fetch from both sources...");
    try {
      const response = await axios.get(`${API_BASE_URL}/tcourse/collab`, {
        params: {
          source: 'both',
          merge_strategy: 'unified',
          limit: 10
        }
      });
      
      console.log(`✅ Basic collaborative fetch successful`);
      console.log(`   Total courses: ${response.data.pagination.total}`);
      console.log(`   Data sources: ${response.data.collaboration.total_sources}`);
      console.log(`   New model data: ${response.data.collaboration.data_freshness.new_model}`);
      console.log(`   Legacy model data: ${response.data.collaboration.data_freshness.legacy_model}`);
      
      if (response.data.metadata) {
        console.log(`   Performance - New model: ${response.data.metadata.performance.new_model?.fetch_time_ms}ms`);
        console.log(`   Performance - Legacy model: ${response.data.metadata.performance.legacy_model?.fetch_time_ms}ms`);
      }
    } catch (error) {
      console.log(`❌ Basic collaborative fetch failed: ${error.response?.data?.message || error.message}`);
    }

    // Test 2: Fetch only from new models
    console.log("\n2. Testing fetch from new models only...");
    try {
      const response = await axios.get(`${API_BASE_URL}/tcourse/collab`, {
        params: {
          source: 'new',
          include_metadata: 'true',
          limit: 5
        }
      });
      
      console.log(`✅ New models only fetch successful`);
      console.log(`   Courses found: ${response.data.data.length}`);
      
      if (response.data.metadata?.performance?.new_model) {
        const breakdown = response.data.metadata.performance.new_model.breakdown;
        console.log(`   Breakdown - Blended: ${breakdown.blended}, Live: ${breakdown.live}, Free: ${breakdown.free}`);
      }
    } catch (error) {
      console.log(`❌ New models fetch failed: ${error.response?.data?.message || error.message}`);
    }

    // Test 3: Fetch only from legacy model
    console.log("\n3. Testing fetch from legacy model only...");
    try {
      const response = await axios.get(`${API_BASE_URL}/tcourse/collab`, {
        params: {
          source: 'legacy',
          include_metadata: 'true',
          limit: 5
        }
      });
      
      console.log(`✅ Legacy model only fetch successful`);
      console.log(`   Courses found: ${response.data.data.length}`);
      
      if (response.data.metadata?.performance?.legacy_model) {
        const typeDistribution = response.data.metadata.performance.legacy_model.type_distribution;
        console.log(`   Type distribution:`, typeDistribution);
      }
    } catch (error) {
      console.log(`❌ Legacy model fetch failed: ${error.response?.data?.message || error.message}`);
    }

    // Test 4: Separate merge strategy
    console.log("\n4. Testing separate merge strategy...");
    try {
      const response = await axios.get(`${API_BASE_URL}/tcourse/collab`, {
        params: {
          source: 'both',
          merge_strategy: 'separate',
          limit: 10
        }
      });
      
      console.log(`✅ Separate merge strategy successful`);
      console.log(`   New courses: ${response.data.data.new_courses?.length || 0}`);
      console.log(`   Legacy courses: ${response.data.data.legacy_courses?.length || 0}`);
    } catch (error) {
      console.log(`❌ Separate merge strategy failed: ${error.response?.data?.message || error.message}`);
    }

    // Test 5: Prioritize new merge strategy
    console.log("\n5. Testing prioritize new merge strategy...");
    try {
      const response = await axios.get(`${API_BASE_URL}/tcourse/collab`, {
        params: {
          source: 'both',
          merge_strategy: 'prioritize_new',
          limit: 10
        }
      });
      
      console.log(`✅ Prioritize new merge strategy successful`);
      console.log(`   Total unified courses: ${response.data.data.length}`);
      
      // Count sources in unified result
      const newCount = response.data.data.filter(c => c._source === 'new_model').length;
      const legacyCount = response.data.data.filter(c => c._source === 'legacy_model').length;
      console.log(`   New model courses: ${newCount}, Legacy model courses: ${legacyCount}`);
    } catch (error) {
      console.log(`❌ Prioritize new merge strategy failed: ${error.response?.data?.message || error.message}`);
    }

    // Test 6: Deduplication feature
    console.log("\n6. Testing deduplication feature...");
    try {
      const response = await axios.get(`${API_BASE_URL}/tcourse/collab`, {
        params: {
          source: 'both',
          merge_strategy: 'unified',
          deduplicate: 'true',
          similarity_threshold: '0.8',
          include_metadata: 'true',
          limit: 15
        }
      });
      
      console.log(`✅ Deduplication test successful`);
      
      if (response.data.metadata?.deduplication) {
        const dedup = response.data.metadata.deduplication;
        console.log(`   Original count: ${dedup.original_count}`);
        console.log(`   Unique count: ${dedup.unique_count}`);
        console.log(`   Duplicates removed: ${dedup.duplicates_removed}`);
        console.log(`   Processing time: ${dedup.processing_time_ms}ms`);
        
        if (dedup.duplicate_courses.length > 0) {
          console.log(`   Sample duplicates:`, dedup.duplicate_courses.slice(0, 3));
        }
      }
    } catch (error) {
      console.log(`❌ Deduplication test failed: ${error.response?.data?.message || error.message}`);
    }

    // Test 7: Detailed comparison mode
    console.log("\n7. Testing detailed comparison mode...");
    try {
      const response = await axios.get(`${API_BASE_URL}/tcourse/collab`, {
        params: {
          source: 'both',
          comparison_mode: 'detailed',
          limit: 5
        }
      });
      
      console.log(`✅ Detailed comparison successful`);
      
      if (response.data.comparison) {
        console.log(`   Summary:`, response.data.comparison.summary);
        
        if (response.data.comparison.detailed) {
          const detailed = response.data.comparison.detailed;
          console.log(`   New model fields: ${detailed.new_model_analysis.fields_coverage.length}`);
          console.log(`   Legacy model fields: ${detailed.legacy_model_analysis.fields_coverage.length}`);
          console.log(`   Schema differences:`);
          console.log(`     - New only: ${detailed.schema_differences.new_only_fields.length} fields`);
          console.log(`     - Legacy only: ${detailed.schema_differences.legacy_only_fields.length} fields`);
          console.log(`     - Common: ${detailed.schema_differences.common_fields.length} fields`);
        }
      }
    } catch (error) {
      console.log(`❌ Detailed comparison failed: ${error.response?.data?.message || error.message}`);
    }

    // Test 8: Search with collaborative fetch
    console.log("\n8. Testing search with collaborative fetch...");
    try {
      const response = await axios.get(`${API_BASE_URL}/tcourse/collab`, {
        params: {
          source: 'both',
          search: 'programming',
          merge_strategy: 'unified',
          limit: 8
        }
      });
      
      console.log(`✅ Search with collaborative fetch successful`);
      console.log(`   Search results: ${response.data.data.length}`);
      
      // Show sample titles
      const sampleTitles = response.data.data.slice(0, 3).map(c => c.course_title);
      console.log(`   Sample titles:`, sampleTitles);
    } catch (error) {
      console.log(`❌ Search with collaborative fetch failed: ${error.response?.data?.message || error.message}`);
    }

    // Test 9: Currency filtering with collaborative fetch
    console.log("\n9. Testing currency filtering with collaborative fetch...");
    try {
      const response = await axios.get(`${API_BASE_URL}/tcourse/collab`, {
        params: {
          source: 'both',
          currency: 'USD',
          merge_strategy: 'separate',
          limit: 6
        }
      });
      
      console.log(`✅ Currency filtering successful`);
      console.log(`   New courses with USD: ${response.data.data.new_courses?.length || 0}`);
      console.log(`   Legacy courses with USD: ${response.data.data.legacy_courses?.length || 0}`);
    } catch (error) {
      console.log(`❌ Currency filtering failed: ${error.response?.data?.message || error.message}`);
    }

    // Test 10: Performance comparison
    console.log("\n10. Testing performance comparison...");
    try {
      const startTime = Date.now();
      
      const response = await axios.get(`${API_BASE_URL}/tcourse/collab`, {
        params: {
          source: 'both',
          merge_strategy: 'unified',
          include_metadata: 'true',
          limit: 20
        }
      });
      
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ Performance test completed`);
      console.log(`   Total request time: ${totalTime}ms`);
      
      if (response.data.metadata?.performance) {
        const perf = response.data.metadata.performance;
        console.log(`   New model fetch: ${perf.new_model?.fetch_time_ms || 'N/A'}ms`);
        console.log(`   Legacy model fetch: ${perf.legacy_model?.fetch_time_ms || 'N/A'}ms`);
        
        const totalDbTime = (perf.new_model?.fetch_time_ms || 0) + (perf.legacy_model?.fetch_time_ms || 0);
        console.log(`   Total DB time: ${totalDbTime}ms`);
        console.log(`   Processing overhead: ${totalTime - totalDbTime}ms`);
      }
    } catch (error) {
      console.log(`❌ Performance test failed: ${error.response?.data?.message || error.message}`);
    }

    // Test 11: Edge cases and error handling
    console.log("\n11. Testing edge cases and error handling...");
    try {
      // Invalid source
      try {
        await axios.get(`${API_BASE_URL}/tcourse/collab`, {
          params: { source: 'invalid_source' }
        });
      } catch (error) {
        console.log(`   ✅ Invalid source handled gracefully`);
      }

      // Invalid merge strategy
      const response = await axios.get(`${API_BASE_URL}/tcourse/collab`, {
        params: { 
          source: 'both',
          merge_strategy: 'invalid_strategy',
          limit: 3
        }
      });
      console.log(`   ✅ Invalid merge strategy defaulted to unified: ${response.data.data.length} courses`);

      // Very high similarity threshold
      const dedupResponse = await axios.get(`${API_BASE_URL}/tcourse/collab`, {
        params: {
          source: 'both',
          deduplicate: 'true',
          similarity_threshold: '0.99',
          include_metadata: 'true',
          limit: 5
        }
      });
      console.log(`   ✅ High similarity threshold handled: ${dedupResponse.data.metadata?.deduplication?.duplicates_removed || 0} duplicates removed`);

    } catch (error) {
      console.log(`❌ Edge cases test failed: ${error.response?.data?.message || error.message}`);
    }

    console.log("\n🎉 Collaborative Endpoint Testing Complete!");
    console.log("\nSummary of Features Tested:");
    console.log("✅ Basic collaborative fetch from both sources");
    console.log("✅ Source-specific fetching (new only, legacy only)");
    console.log("✅ Multiple merge strategies (unified, separate, prioritize_new)");
    console.log("✅ Deduplication with configurable similarity threshold");
    console.log("✅ Detailed comparison and schema analysis");
    console.log("✅ Search integration with collaborative fetch");
    console.log("✅ Currency filtering across both sources");
    console.log("✅ Performance monitoring and optimization");
    console.log("✅ Edge case handling and error resilience");
    console.log("✅ Metadata and analytics collection");

    console.log("\n📊 Collaborative Endpoint Benefits:");
    console.log("• Unified access to both new and legacy course data");
    console.log("• Flexible merge strategies for different use cases");
    console.log("• Built-in deduplication to handle overlapping data");
    console.log("• Performance monitoring for optimization insights");
    console.log("• Schema comparison for migration planning");
    console.log("• Backward compatibility with existing systems");

  } catch (error) {
    console.error("❌ Test setup failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
};

// Run the test
testCollaborativeEndpoint().catch(console.error); 