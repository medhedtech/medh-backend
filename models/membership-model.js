const mongoose = require("mongoose");

const MembershipSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    category_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    amount: {
      type: Number,
      required: true,
    },
    plan_type: {
      type: String,
      enum: ["silver", "gold"],
      required: true,
    },
    max_courses: {
      type: Number,
      required: true,
    },
    duration: {
      type: String,
      enum: ["monthly", "quarterly", "half-yearly", "yearly"],
      required: true,
    },
    start_date: {
      type: Date,
      default: Date.now,
    },
    expiry_date: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["success", "pending", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Middleware to validate the number of courses based on plan type
MembershipSchema.pre("save", function (next) {
  if (this.plan_type === "silver" && this.category_ids.length > 1) {
    return next(
      new Error("Silver plan allows only one course to be selected.")
    );
  }
  if (this.plan_type === "gold" && this.category_ids.length > 3) {
    return next(
      new Error("Gold plan allows a maximum of three courses to be selected.")
    );
  }

  // Calculate expiry date based on the selected duration
  const durationMap = {
    monthly: 1,
    quarterly: 3,
    "half-yearly": 6,
    yearly: 12,
  };

  const durationMonths = durationMap[this.duration];
  if (!durationMonths) {
    return next(new Error("Invalid duration specified."));
  }

  const expiry = new Date(this.start_date);
  expiry.setMonth(expiry.getMonth() + durationMonths);
  this.expiry_date = expiry;

  next();
});

const Membership = mongoose.model("Membership", MembershipSchema);

module.exports = Membership;
