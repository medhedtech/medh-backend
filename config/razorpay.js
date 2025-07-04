import { ENV_VARS } from "./envVars.js";

let razorpay = null;
let initializationAttempted = false;

// Lazy initialization function
const getRazorpayInstance = async () => {
  if (initializationAttempted) {
    return razorpay;
  }

  initializationAttempted = true;

  if (ENV_VARS.RAZORPAY_KEY_ID && ENV_VARS.RAZORPAY_KEY_SECRET) {
    console.log("✅ Razorpay credentials found, initializing...");
    try {
      const { default: Razorpay } = await import("razorpay");
      razorpay = new Razorpay({
        key_id: ENV_VARS.RAZORPAY_KEY_ID,
        key_secret: ENV_VARS.RAZORPAY_KEY_SECRET,
      });
      console.log("✅ Razorpay initialized successfully");
    } catch (error) {
      console.warn("⚠️ Razorpay initialization failed:", error.message);
      console.warn("⚠️ Payment features will work in mock mode");
      razorpay = null;
    }
  } else {
    console.warn("⚠️ Razorpay credentials not found in environment variables");
    console.warn("⚠️ Payment system will operate in mock mode for testing");
    console.warn("⚠️ To enable live payments, set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file");
  }
  return razorpay;
};

// Export both the lazy getter and the instance
export default {
  getInstance: getRazorpayInstance,
  get current() {
    return razorpay;
  }
};
