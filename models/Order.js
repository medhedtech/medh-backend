import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    razorpayOrderId: {
      type: String,
      required: true
    },
    razorpayPaymentId: {
      type: String
    },
    razorpaySignature: {
      type: String
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    status: {
      type: String,
      enum: ['created', 'attempted', 'paid', 'failed', 'refunded'],
      default: 'created'
    },
    notes: {
      type: Object,
      default: {}
    },
    receipt: {
      type: String
    },
    productInfo: {
      type: Object,
      required: true
    }
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);

export default Order; 