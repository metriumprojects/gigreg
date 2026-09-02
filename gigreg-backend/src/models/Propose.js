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
        status: { type: String, default: "Active" }
    },

    { timestamps: true }
);

export default mongoose.model("Propose", proposeSchema);
