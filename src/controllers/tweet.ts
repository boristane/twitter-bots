import mongoose from "mongoose";
import Tweet, { ITweet } from "../models/Tweet";

export async function create(id: string, text: string) {
  const created = new Date();
  const updated = created;
  const lineStatus = new Tweet({
    _id: mongoose.Types.ObjectId(),
    id,
    text,
    created,
    updated
  });
  await lineStatus.save();
}

export async function saveTweetToDB(id: string, text: string) {
  await create(id, text);
  console.log(`Saved tweet ${id}.`);
}

export async function findAllTweets(): Promise<ITweet[] | null> {
  const tweets = await Tweet.find()
    .lean()
    .exec();
  console.log(`Got all the tweets.`);
  return tweets;
}
