import mongoose from "mongoose";

const proposeSchema = new mongoose.Schema(
    {
        title: String,
        description: String,
        category: String,
        location: String,
        address: String,
        placeId: String,
        lat: { type: Number },
        lng: { type: Number },
        price: Number,
        pricingType: { type: String, enum: ["fixed", "hourly"], default: "fixed" },
        isOnline: { type: Boolean, default: false },
        supportsInPerson: { type: Boolean, default: false },
        images: [
            {
                url: String,
                public_id: String,
            },
        ],
        recieveBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        status: { type: String, enum: ["Active", "Draft", "Inactive", "Closed"], default: "Active" }
    },

    { timestamps: true }
);

proposeSchema.index({ status: 1, createdAt: -1 });
proposeSchema.index({ status: 1, category: 1, createdAt: -1 });
proposeSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Propose", proposeSchema);
