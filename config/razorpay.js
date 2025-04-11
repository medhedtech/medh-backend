import Razorpay from "razorpay";

import { envVars } from "./envVars.js";

const razorpay = new Razorpay({
  key_id: envVars.RAZORPAY_KEY_ID,
  key_secret: envVars.RAZORPAY_KEY_SECRET,
});

export default razorpay;
