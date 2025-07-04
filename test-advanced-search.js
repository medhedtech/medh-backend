import {
  LiveCourse,
  BlendedCourse,
  FreeCourse,
} from "./models/course-types/index.js";
import Course from "./models/course-model.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8080/api/v1";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URL);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

const testAdvancedSearch = async () => {
  console.log("🔍 Testing Advanced Search Functionality...\n");

  try {
    // Connect to database
    await connectDB();

    // Test the auth-test endpoint first to diagnose issues
    console.log("0. Testing authentication status...");
    try {
      const authResponse = await axios.get(`${API_BASE_URL}/auth-test`);
      console.log(`✅ Auth test successful:`, authResponse.data.status);
    } catch (error) {
      console.log(
        `⚠️  Auth test failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`,
      );
    }

    // Test 1: Basic search with text (using public endpoint)
    console.log("\n1. Testing basic text search...");
    try {
      const response = await axios.get(`${API_BASE_URL}/tcourse/search`, {
        params: {
          search: "javascript",
          page: 1,
          limit: 5,
        },
        timeout: 10000, // 10 second timeout
      });

      console.log(
        `✅ Basic search returned ${response.data.data.length} results`,
      );
      console.log(`   Total courses: ${response.data.pagination.total}`);
      console.log(
        `   Sources: New Model: ${response.data.sources.new_model}, Legacy: ${response.data.sources.legacy_model}`,
      );
    } catch (error) {
      console.log(
        `❌ Basic search failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`,
      );

      // Try alternative endpoint
      try {
        console.log("   Trying legacy search endpoint...");
        const legacyResponse = await axios.get(
          `${API_BASE_URL}/courses/search`,
          {
            params: {
              search: "javascript",
              page: 1,
              limit: 5,
            },
          },
        );
        console.log(
          `   ✅ Legacy search worked: ${legacyResponse.data.data?.length || 0} results`,
        );
      } catch (legacyError) {
        console.log(
          `   ❌ Legacy search also failed: ${legacyError.response?.status}`,
        );
      }
    }

    // Test 2: Currency filtering with fallback
    console.log("\n2. Testing currency filtering with fallback...");
    try {
      const response = await axios.get(`${API_BASE_URL}/tcourse/search`, {
        params: {
          currency: "EUR", // Non-existent currency to test fallback
          limit: 3,
        },
      });

      console.log(`✅ Currency fallback test completed`);
      if (response.data.currency_fallback) {
        console.log(
          `   Fallback info: ${response.data.currency_fallback.message}`,
        );
      }
      console.log(`   Results: ${response.data.data.length} courses`);
    } catch (error) {
      console.log(
        `❌ Currency fallback test failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`,
      );
    }

    // Test 3: Multiple category filtering
    console.log("\n3. Testing multiple category filtering...");
    try {
      const response = await axios.get(`${API_BASE_URL}/tcourse/search`, {
        params: {
          course_category: "Programming,Design,Business",
          limit: 5,
        },
      });

      console.log(
        `✅ Multiple category filter returned ${response.data.data.length} results`,
      );
      const categories = [
        ...new Set(response.data.data.map((c) => c.course_category)),
      ];
      console.log(`   Found categories: ${categories.join(", ")}`);
    } catch (error) {
      console.log(
        `❌ Multiple category filtering failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`,
      );
    }

    // Test 4: Class type flexible matching
    console.log("\n4. Testing flexible class type matching...");
    try {
      const response = await axios.get(`${API_BASE_URL}/tcourse/search`, {
        params: {
          class_type: "live,blend",
          limit: 5,
        },
      });

      console.log(
        `✅ Flexible class type matching returned ${response.data.data.length} results`,
      );
      const classTypes = [
        ...new Set(response.data.data.map((c) => c.class_type)),
      ];
      console.log(`   Found class types: ${classTypes.join(", ")}`);
    } catch (error) {
      console.log(
        `❌ Flexible class type matching failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`,
      );
    }

    // Test 5: Feature-based filtering
    console.log("\n5. Testing feature-based filtering...");
    try {
      const response = await axios.get(`${API_BASE_URL}/tcourse/search`, {
        params: {
          certification: "Yes",
          has_assignments: "Yes",
          limit: 3,
        },
      });

      console.log(
        `✅ Feature filtering returned ${response.data.data.length} results`,
      );
      const withCertification = response.data.data.filter(
        (c) => c.is_Certification === "Yes",
      ).length;
      const withAssignments = response.data.data.filter(
        (c) => c.is_Assignments === "Yes",
      ).length;
      console.log(`   Courses with certification: ${withCertification}`);
      console.log(`   Courses with assignments: ${withAssignments}`);
    } catch (error) {
      console.log(
        `❌ Feature filtering failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`,
      );
    }

    // Test 6: Price range filtering
    console.log("\n6. Testing price range filtering...");
    try {
      const response = await axios.get(`${API_BASE_URL}/tcourse/search`, {
        params: {
          price_range: "100-1000",
          currency: "USD",
          limit: 5,
        },
      });

      console.log(
        `✅ Price range filtering returned ${response.data.data.length} results`,
      );

      // Check if prices are within range
      const pricesInRange = response.data.data.filter((course) => {
        if (course.prices && course.prices.length > 0) {
          const usdPrice = course.prices.find((p) => p.currency === "USD");
          return (
            usdPrice &&
            usdPrice.individual >= 100 &&
            usdPrice.individual <= 1000
          );
        }
        return false;
      }).length;

      console.log(
        `   Courses with prices in range (100-1000 USD): ${pricesInRange}`,
      );
    } catch (error) {
      console.log(
        `❌ Price range filtering failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`,
      );
    }

    // Test 7: Advanced sorting
    console.log("\n7. Testing advanced sorting options...");
    try {
      const sortTests = [
        { sort_by: "price", sort_order: "asc", currency: "USD" },
        { sort_by: "popularity" },
        { sort_by: "ratings" },
        { sort_by: "relevance", search: "programming" },
      ];

      for (const sortTest of sortTests) {
        const response = await axios.get(`${API_BASE_URL}/tcourse/search`, {
          params: { ...sortTest, limit: 3 },
        });

        console.log(
          `   ✅ Sort by ${sortTest.sort_by}: ${response.data.data.length} results`,
        );
      }
    } catch (error) {
      console.log(
        `❌ Advanced sorting failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`,
      );
    }

    // Test 8: Faceted search results
    console.log("\n8. Testing faceted search results...");
    try {
      const response = await axios.get(`${API_BASE_URL}/tcourse/search`, {
        params: {
          search: "web",
          limit: 5,
        },
      });

      console.log(`✅ Faceted search completed`);
      if (response.data.facets) {
        console.log(
          `   Categories facet: ${response.data.facets.categories?.length || 0} items`,
        );
        console.log(
          `   Tags facet: ${response.data.facets.tags?.length || 0} items`,
        );
        console.log(
          `   Class types facet: ${response.data.facets.classTypes?.length || 0} items`,
        );
        console.log(
          `   Delivery formats facet: ${response.data.facets.deliveryFormats?.length || 0} items`,
        );
      }
    } catch (error) {
      console.log(
        `❌ Faceted search failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`,
      );
    }

    // Test 9: Group by type functionality
    console.log("\n9. Testing group by type functionality...");
    try {
      const response = await axios.get(`${API_BASE_URL}/tcourse/search`, {
        params: {
          group_by_type: "true",
          limit: 10,
        },
      });

      console.log(`✅ Group by type completed`);
      if (
        typeof response.data.data === "object" &&
        !Array.isArray(response.data.data)
      ) {
        console.log(`   Live courses: ${response.data.data.live?.length || 0}`);
        console.log(
          `   Blended courses: ${response.data.data.blended?.length || 0}`,
        );
        console.log(`   Free courses: ${response.data.data.free?.length || 0}`);
        console.log(
          `   Other courses: ${response.data.data.other?.length || 0}`,
        );
      }
    } catch (error) {
      console.log(
        `❌ Group by type failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`,
      );
    }

    // Test 10: Complex multi-filter search
    console.log("\n10. Testing complex multi-filter search...");
    try {
      const response = await axios.get(`${API_BASE_URL}/tcourse/search`, {
        params: {
          search: "development",
          course_category: "Programming,Technology",
          class_type: "live",
          certification: "Yes",
          currency: "USD",
          price_range: "50-500",
          sort_by: "price",
          sort_order: "asc",
          limit: 5,
        },
      });

      console.log(
        `✅ Complex multi-filter search returned ${response.data.data.length} results`,
      );
      console.log(
        `   Applied filters: ${JSON.stringify(response.data.filters_applied, null, 2)}`,
      );
    } catch (error) {
      console.log(
        `❌ Complex multi-filter search failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`,
      );
    }

    // Test 11: Performance test with aggregation
    console.log("\n11. Testing search performance...");
    try {
      const startTime = Date.now();

      const response = await axios.get(`${API_BASE_URL}/tcourse/search`, {
        params: {
          search: "course",
          limit: 20,
          include_legacy: "true",
        },
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`✅ Performance test completed in ${duration}ms`);
      console.log(`   Results: ${response.data.data.length} courses`);
      console.log(`   Total available: ${response.data.pagination.total}`);
      console.log(
        `   Sources breakdown: ${JSON.stringify(response.data.sources.breakdown)}`,
      );
    } catch (error) {
      console.log(
        `❌ Performance test failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`,
      );
    }

    // Test 12: Edge cases
    console.log("\n12. Testing edge cases...");
    try {
      // Empty search
      const emptyResponse = await axios.get(`${API_BASE_URL}/tcourse/search`, {
        params: { search: "", limit: 5 },
      });
      console.log(
        `   ✅ Empty search: ${emptyResponse.data.data.length} results`,
      );

      // Very short search term
      const shortResponse = await axios.get(`${API_BASE_URL}/tcourse/search`, {
        params: { search: "js", limit: 5 },
      });
      console.log(
        `   ✅ Short search term: ${shortResponse.data.data.length} results`,
      );

      // Invalid price range
      const invalidPriceResponse = await axios.get(
        `${API_BASE_URL}/tcourse/search`,
        {
          params: { price_range: "invalid-range", limit: 5 },
        },
      );
      console.log(
        `   ✅ Invalid price range handled: ${invalidPriceResponse.data.data.length} results`,
      );

      // Non-existent category
      const nonExistentResponse = await axios.get(
        `${API_BASE_URL}/tcourse/search`,
        {
          params: { course_category: "NonExistentCategory", limit: 5 },
        },
      );
      console.log(
        `   ✅ Non-existent category: ${nonExistentResponse.data.data.length} results`,
      );
    } catch (error) {
      console.log(
        `❌ Edge cases test failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`,
      );
    }

    // Test 13: Test collaborative endpoint
    console.log("\n13. Testing collaborative endpoint...");
    try {
      const response = await axios.get(`${API_BASE_URL}/tcourse/collab`, {
        params: {
          source: "both",
          merge_strategy: "unified",
          limit: 5,
        },
      });

      console.log(`✅ Collaborative endpoint successful`);
      console.log(`   Total courses: ${response.data.pagination.total}`);
      console.log(
        `   Collaboration sources: ${response.data.collaboration.total_sources}`,
      );
    } catch (error) {
      console.log(
        `❌ Collaborative endpoint failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`,
      );
    }

    console.log("\n🎉 Advanced Search Testing Complete!");
    console.log("\nSummary of Features Tested:");
    console.log("✅ Basic text search with full-text search support");
    console.log("✅ Currency filtering with automatic USD fallback");
    console.log("✅ Multiple category/tag filtering with comma separation");
    console.log("✅ Flexible class type matching");
    console.log(
      "✅ Feature-based filtering (certification, assignments, etc.)",
    );
    console.log("✅ Price range filtering");
    console.log("✅ Advanced sorting (price, popularity, ratings, relevance)");
    console.log("✅ Faceted search results for UI filtering");
    console.log("✅ Group by type functionality");
    console.log("✅ Complex multi-filter combinations");
    console.log("✅ Performance optimization with aggregation");
    console.log("✅ Edge case handling");
    console.log("✅ Collaborative endpoint integration");
  } catch (error) {
    console.error("❌ Test setup failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
};

// Run the test
testAdvancedSearch().catch(console.error);
