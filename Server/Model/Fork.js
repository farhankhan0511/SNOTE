// Server/Model/Fork.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const ForkSchema = new Schema({
 
  originalNote: { type: Schema.Types.ObjectId, ref: "Note", required: true },
  forkNote: { type: Schema.Types.ObjectId, ref: "Note", required: true },
  forkedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Fork", ForkSchema);
