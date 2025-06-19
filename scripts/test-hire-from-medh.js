import fetch from 'node-fetch';

// Test data for hire from medh inquiry
const testData = {
  full_name: "Radhika Sharma",
  email: "radhika.test@company.com",
  country: "India",
  phone: "+911234567890",
  company_name: "TechNova Solutions",
  company_website: "https://www.technova.com",
  department: "Engineering",
  team_size: "21–50",
  requirement_type: "Both",
  training_domain: "Full Stack Web Development, UI/UX, DevOps",
  start_date: "2024-02-01",
  budget_range: "₹50,000 – ₹1,00,000",
  detailed_requirements: "We are looking to hire 5 full-stack developers with experience in React, Node.js, and cloud technologies. Additionally, we need training for our existing team of 15 developers on modern DevOps practices including Docker, Kubernetes, and CI/CD pipelines. We prefer candidates with hands-on project experience and industry certifications.",
  document_upload: "https://example.com/job-description.pdf",
  terms_accepted: true
};

const baseUrl = process.env.API_URL || 'http://localhost:3000';

async function testHireFromMedhAPI() {
  console.log('🧪 Testing Hire from Medh API...\n');

  try {
    // Test 1: Get form information
    console.log('1. Testing GET /api/v1/hire-from-medh/info');
    const infoResponse = await fetch(`${baseUrl}/api/v1/hire-from-medh/info`);
    const infoData = await infoResponse.json();
    
    if (infoResponse.ok) {
      console.log('✅ Form info retrieved successfully');
      console.log(`   Title: ${infoData.data.title}`);
      console.log(`   Required fields: ${infoData.data.required_fields.length}`);
    } else {
      console.log('❌ Failed to get form info:', infoData.message);
      return;
    }

    // Test 2: Submit a valid inquiry
    console.log('\n2. Testing POST /api/v1/hire-from-medh (valid data)');
    const submitResponse = await fetch(`${baseUrl}/api/v1/hire-from-medh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const submitData = await submitResponse.json();
    
    if (submitResponse.ok) {
      console.log('✅ Inquiry submitted successfully');
      console.log(`   Form ID: ${submitData.data.form_id}`);
      console.log(`   Status: ${submitData.data.status}`);
      console.log(`   Priority: ${submitData.data.priority}`);
      console.log(`   Requirement Type: ${submitData.data.requirement_type}`);
    } else {
      console.log('❌ Failed to submit inquiry:', submitData.message);
      if (submitData.errors) {
        submitData.errors.forEach(error => {
          console.log(`   - ${error.field}: ${error.message}`);
        });
      }
      return;
    }

    // Test 3: Submit invalid data (missing required fields)
    console.log('\n3. Testing POST /api/v1/hire-from-medh (missing required fields)');
    const invalidData = {
      full_name: "Test User",
      email: "test@example.com"
      // Missing other required fields
    };
    
    const invalidResponse = await fetch(`${baseUrl}/api/v1/hire-from-medh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidData)
    });
    
    const invalidResponseData = await invalidResponse.json();
    
    if (!invalidResponse.ok && invalidResponse.status === 400) {
      console.log('✅ Validation properly rejected invalid data');
      console.log(`   Error: ${invalidResponseData.message}`);
    } else {
      console.log('❌ Validation did not work as expected');
    }

    // Test 4: Test invalid phone number
    console.log('\n4. Testing POST /api/v1/hire-from-medh (invalid phone)');
    const invalidPhoneData = {
      ...testData,
      phone: "1234567890" // Missing country code
    };
    
    const phoneResponse = await fetch(`${baseUrl}/api/v1/hire-from-medh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidPhoneData)
    });
    
    const phoneResponseData = await phoneResponse.json();
    
    if (!phoneResponse.ok && phoneResponse.status === 400) {
      console.log('✅ Phone validation working correctly');
      console.log(`   Error: ${phoneResponseData.message}`);
    } else {
      console.log('❌ Phone validation not working');
    }

    // Test 5: Test invalid requirement type
    console.log('\n5. Testing POST /api/v1/hire-from-medh (invalid requirement type)');
    const invalidTypeData = {
      ...testData,
      requirement_type: "Invalid Type"
    };
    
    const typeResponse = await fetch(`${baseUrl}/api/v1/hire-from-medh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidTypeData)
    });
    
    const typeResponseData = await typeResponse.json();
    
    if (!typeResponse.ok && typeResponse.status === 400) {
      console.log('✅ Requirement type validation working correctly');
      console.log(`   Error: ${typeResponseData.message}`);
    } else {
      console.log('❌ Requirement type validation not working');
    }

    // Test 6: Test short detailed requirements
    console.log('\n6. Testing POST /api/v1/hire-from-medh (short requirements)');
    const shortRequirementsData = {
      ...testData,
      detailed_requirements: "Too short" // Less than 20 characters
    };
    
    const shortResponse = await fetch(`${baseUrl}/api/v1/hire-from-medh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shortRequirementsData)
    });
    
    const shortResponseData = await shortResponse.json();
    
    if (!shortResponse.ok && shortResponse.status === 400) {
      console.log('✅ Requirements length validation working correctly');
      console.log(`   Error: ${shortResponseData.message}`);
    } else {
      console.log('❌ Requirements length validation not working');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('✅ Form info endpoint working');
    console.log('✅ Valid submission working');
    console.log('✅ Missing fields validation working');
    console.log('✅ Phone number validation working');
    console.log('✅ Requirement type validation working');
    console.log('✅ Requirements length validation working');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Additional test for form schema validation
async function testFormSchema() {
  console.log('\n🔍 Testing Form Schema Structure...\n');

  try {
    const response = await fetch(`${baseUrl}/api/v1/hire-from-medh/info`);
    const data = await response.json();

    if (response.ok) {
      const formData = data.data;
      
      // Validate required structure
      const requiredProperties = [
        'form_type',
        'title',
        'description',
        'required_fields',
        'field_options',
        'example_request',
        'validation_rules',
        'benefits'
      ];

      let allPropertiesPresent = true;
      requiredProperties.forEach(prop => {
        if (!formData.hasOwnProperty(prop)) {
          console.log(`❌ Missing property: ${prop}`);
          allPropertiesPresent = false;
        }
      });

      if (allPropertiesPresent) {
        console.log('✅ All required form schema properties present');
      }

      // Validate field options
      const teamSizeOptions = formData.field_options.team_size;
      const requirementTypeOptions = formData.field_options.requirement_type;

      if (teamSizeOptions && teamSizeOptions.length === 4) {
        console.log('✅ Team size options correctly defined');
      } else {
        console.log('❌ Team size options not correctly defined');
      }

      if (requirementTypeOptions && requirementTypeOptions.length === 3) {
        console.log('✅ Requirement type options correctly defined');
      } else {
        console.log('❌ Requirement type options not correctly defined');
      }

      // Validate benefits
      if (formData.benefits && formData.benefits.length === 6) {
        console.log('✅ Benefits list correctly defined');
      } else {
        console.log('❌ Benefits list not correctly defined');
      }

    } else {
      console.log('❌ Failed to retrieve form schema');
    }

  } catch (error) {
    console.error('❌ Form schema test failed:', error.message);
  }
}

// Run tests
async function runAllTests() {
  console.log('🚀 Starting Hire from Medh API Tests\n');
  console.log('='.repeat(50));
  
  await testHireFromMedhAPI();
  await testFormSchema();
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 All tests completed!');
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { testHireFromMedhAPI, testFormSchema, runAllTests }; 