import mongoose, { Document, Schema } from "mongoose";

const TweetSchema: Schema = new Schema({
  _id: mongoose.Types.ObjectId,
  id: String,
  text: String,
  created: Date,
  updated: Date
});

export interface ITweet extends Document {
  id: string;
  text: string;
  created: Date;
  updated: Date;
}

export default mongoose.model<ITweet>("tweet", TweetSchema);
