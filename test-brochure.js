// A simple script to test the brochure download endpoint
import axios from 'axios';

const testBrochureDownload = async () => {
  const courseId = '67bd596b8a56e7688dd02274'; // Valid course ID from our database
  const url = `http://localhost:8080/api/v1/broucher/download/${courseId}`;
  
  const data = {
    full_name: 'Test User',
    email: 'test@example.com',
    phone_number: '1234567890'
  };

  try {
    console.log(`Sending POST request to: ${url}`);
    console.log('With data:', data);
    const response = await axios.post(url, data);
    console.log('Success!', response.data);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      // Print the full error path to help debug
      console.log('Full error URL:', error.config.url);
      console.log('Request method:', error.config.method.toUpperCase());
    }
  }
};

testBrochureDownload(); 