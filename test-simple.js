async function testStudentDataExtraction() {
  try {
    console.log('🧪 Testing student data extraction logic...');
    
    // Make the same API call that the frontend makes
    const response = await fetch('http://localhost:8080/api/v1/live-classes/students');
    const apiResponse = await response.json();
    
    console.log('📡 Raw API Response:');
    console.log('Status:', response.status);
    console.log('Data structure:', Object.keys(apiResponse));
    
    // Test the same extraction logic as frontend
    console.log('\n🔧 Testing frontend extraction logic:');
    
    // Method 1: studentsRes.value.data?.data?.items
    const method1 = apiResponse?.data?.items;
    console.log('Method 1 (data?.data?.items):', method1 ? `${method1.length} students` : 'undefined');
    
    // Method 2: studentsRes.value.data?.items
    const method2 = apiResponse?.items;
    console.log('Method 2 (data?.items):', method2 ? `${method2.length} students` : 'undefined');
    
    // Method 3: studentsRes.value.data
    const method3 = apiResponse;
    console.log('Method 3 (data):', method3 ? 'has data' : 'undefined');
    
    // Final extraction (frontend logic)
    const finalStudents = apiResponse?.data?.items || apiResponse?.items || apiResponse || [];
    console.log('\n🎯 Final extraction result:');
    console.log('Final students array:', Array.isArray(finalStudents) ? `${finalStudents.length} students` : 'Not an array');
    console.log('Type:', typeof finalStudents);
    console.log('Is Array:', Array.isArray(finalStudents));
    
    if (Array.isArray(finalStudents) && finalStudents.length > 0) {
      console.log('\n📋 Sample students:');
      finalStudents.slice(0, 3).forEach((student, index) => {
        console.log(`${index + 1}. ${student.full_name} (${student.email})`);
      });
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testStudentDataExtraction();
