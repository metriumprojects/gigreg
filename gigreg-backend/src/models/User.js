import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    buyerName: { type: String },
    sellerName: { type: String },
    dateOfBirth: { type: Date },
    country: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String, index: true, sparse: true },
    role: { type: String, default: "user" },
    reverseRole: { type: Boolean, default: false },
    money:{type: Number, default: 0 },
    moneyTotal:{type: Number, default: 0 },
    moneyPending:{type: Number, default: 0 },
    image: {
      url: { type: String },
      public_id: { type: String },
    },
    bio: String,
    currency: { type: String, default: "USD" },
    balances: {
      available: { type: Map, of: Number, default: {} },
      pending: { type: Map, of: Number, default: {} },
      total: { type: Map, of: Number, default: {} },
    },
    stripeConnectAccountId: { type: String, index: true, sparse: true },
    stripeConnect: {
      country: String,
      defaultCurrency: String,
      detailsSubmitted: { type: Boolean, default: false },
      chargesEnabled: { type: Boolean, default: false },
      payoutsEnabled: { type: Boolean, default: false },
      payoutCurrencies: [{ type: String, uppercase: true }],
      requirementsCurrentlyDue: [String],
      disabledReason: String,
      lastSyncedAt: Date,
    },

    youtube: String,
    instagram: String,
    hideLesson: { type: Boolean, default: false },
    publicType: { type: Boolean, default: false },
    classHosted: { type: Boolean, default: false },
    classesHost: { type: Number, default: 0 },
    classesAttended: {type: Number, default: 0},
    lession: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 100 },
    
verifyEmailToken: String,
verifyEmailExpires: Date,
isVerified: { type: Boolean, default: false },

    resetPasswordToken: String,
    resetPasswordExpire: Date,
     averageRating:{type:Number,default:0},
    totalRatings:{type:Number,default:0},
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate reset password token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};


export default mongoose.model("User", userSchema);
