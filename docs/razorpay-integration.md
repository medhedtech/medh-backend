# Razorpay Integration Guide

This guide explains how to integrate Razorpay payments into your frontend application.

## Backend Integration

The backend now supports Razorpay payments with the following endpoints:

- `POST /api/v1/payments/create-order` - Create a Razorpay payment order
- `POST /api/v1/payments/verify-payment` - Verify a Razorpay payment
- `GET /api/v1/payments/key` - Get the Razorpay API key for frontend
- `GET /api/v1/payments/orders` - Get all orders for the logged-in user
- `GET /api/v1/payments/:paymentId` - Get details of a specific payment

## Frontend Integration

### Step 1: Install Razorpay Checkout

```bash
npm install --save razorpay
```

### Step 2: Create a Payment Component

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RazorpayCheckout = ({ 
  amount, 
  courseId, 
  enrollmentType,
  planId,
  planName,
  durationType,
  paymentType,
  isSelfPaced = false,
  onSuccess, 
  onError 
}) => {
  const [loading, setLoading] = useState(false);
  const [razorpayKey, setRazorpayKey] = useState('');

  useEffect(() => {
    // Fetch Razorpay key from backend
    axios.get('/api/v1/payments/key')
      .then(response => {
        setRazorpayKey(response.data.data.key);
      })
      .catch(error => {
        console.error('Failed to fetch Razorpay key:', error);
        onError && onError('Failed to fetch payment gateway configuration');
      });
  }, []);

  const handlePayment = async () => {
    try {
      setLoading(true);

      // Prepare payload based on payment type
      let payload = {
        amount,
        currency: 'INR',
        payment_type: paymentType,
        productInfo: {
          // Common product info for tracking
          item_name: paymentType === 'course' ? 'Course Enrollment' : 'Subscription Plan',
          description: paymentType === 'course' ? `Enrollment for course ${courseId}` : `Subscription plan: ${planName}`
        }
      };

      // Add payment type specific fields
      if (paymentType === 'course') {
        payload = {
          ...payload,
          course_id: courseId,
          enrollment_type: enrollmentType,
          is_self_paced: isSelfPaced
        };
      } else if (paymentType === 'subscription') {
        payload = {
          ...payload,
          plan_id: planId,
          plan_name: planName,
          duration_months: durationType
        };
      }

      // Create an order
      const orderResponse = await axios.post('/api/v1/payments/create-order', payload);
      const { id: orderId, amount: orderAmount } = orderResponse.data.data;

      // Load the Razorpay SDK
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key: razorpayKey,
          amount: orderAmount, // Amount in smallest currency unit (paise)
          currency: 'INR',
          name: 'MEDH Learning Platform',
          description: paymentType === 'course' ? 'Course Enrollment' : 'Subscription Plan',
          order_id: orderId,
          handler: function (response) {
            // Handle payment success
            verifyPayment(response);
          },
          prefill: {
            name: 'Student Name', // Can be dynamically populated
            email: 'student@example.com',
            contact: '+91XXXXXXXXXX'
          },
          theme: {
            color: '#3399cc'
          }
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.open();
        paymentObject.on('payment.failed', function (response) {
          setLoading(false);
          onError && onError('Payment failed: ' + response.error.description);
        });
      };
    } catch (error) {
      setLoading(false);
      console.error('Payment initialization failed:', error);
      onError && onError('Failed to initialize payment');
    }
  };

  const verifyPayment = async (paymentResponse) => {
    try {
      const response = await axios.post('/api/v1/payments/verify-payment', {
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_signature: paymentResponse.razorpay_signature
      });

      setLoading(false);
      onSuccess && onSuccess(response.data);
    } catch (error) {
      setLoading(false);
      console.error('Payment verification failed:', error);
      onError && onError('Payment verification failed');
    }
  };

  return (
    <button 
      onClick={handlePayment} 
      disabled={loading || !razorpayKey}
      className="payment-button"
    >
      {loading ? 'Processing...' : 'Pay Now'}
    </button>
  );
};

export default RazorpayCheckout;
```

### Step 3: Using the Payment Component

```jsx
<RazorpayCheckout
  amount={9900} // amount in lowest currency unit (99.00)
  courseId="60d21b4667d0d8992e610c85"
  enrollmentType="individual"
  paymentType="course"
  isSelfPaced={true}
  onSuccess={(data) => {
    console.log("Payment successful!", data);
    // Navigate to success page or enrolled courses
  }}
  onError={(message) => {
    console.error("Payment error:", message);
    // Show error notification
  }}
/>

// OR for subscription

<RazorpayCheckout
  amount={29900} // amount in lowest currency unit (299.00)
  planId="60d21b4667d0d8992e610c86"
  planName="Premium Plan"
  durationType={3} // 3 months
  paymentType="subscription"
  onSuccess={(data) => {
    console.log("Subscription successful!", data);
    // Navigate to success page
  }}
  onError={(message) => {
    console.error("Subscription error:", message);
    // Show error notification
  }}
/>
```

## Payment Flow

1. The user clicks on the "Pay Now" button
2. The frontend creates an order via the `/api/v1/payments/create-order` endpoint
3. The Razorpay payment form opens for the user to enter payment details
4. After payment, Razorpay redirects back to your handler with payment details
5. The frontend verifies the payment with your backend via `/api/v1/payments/verify-payment`
6. The backend verifies the payment with Razorpay and then processes the enrollment/subscription

## Environment Configuration

Ensure you have the following environment variables set:

```
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```


## Testing

For testing, you can use Razorpay's test mode and the following test card:

- Card Number: 4111 1111 1111 1111
- Expiry: Any future date
- CVV: Any 3 digits
- OTP: 1234

## Troubleshooting

If you encounter issues:

1. Check that Razorpay keys are correctly configured
2. Verify that the amount is in the smallest currency unit (paise for INR)
3. Ensure your server is correctly handling the verification callback
4. Check the network requests for any error responses 