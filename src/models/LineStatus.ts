import mongoose, { Document, Schema } from "mongoose";

const LineStatusSchema: Schema = new Schema({
  _id: mongoose.Types.ObjectId,
  line: String,
  status: String,
  statusSeverity: Number,
  reason: String,
  fromDate: String,
  toDate: String,
  created: Date,
  updated: Date
});

export interface ILineStatus extends Document {
  line: string;
  status: string;
  statusSeverity: number;
  reason: string;
  fromDate: string;
  toDate: string;
  created: Date;
  updated: Date;
}

export default mongoose.model<ILineStatus>("line_status", LineStatusSchema);
