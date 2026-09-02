import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",  
    },
    curriculum: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Curriculum",  
    },
    propose: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Propose",  
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
    },
    type:String,
  },
  { timestamps: true }
);


export default mongoose.model("Favorite", favoriteSchema);
