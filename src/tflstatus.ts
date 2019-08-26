require("dotenv").config();
import Twit from "twit";
import { ITflTubeStatusResponseItem, ILineStatus } from "./interfaces/ITflTubeStatusResponseItem";
import moment from "moment-timezone";
import { findLatestStatus } from "./controllers/lineStatus";

import mongoose from "mongoose";
import { Context } from "aws-lambda";
import {
  saveStationsStatus,
  postTweets,
  getTubeStatus,
  authenticateTwitter,
  connectToDB,
  getMark
} from "./helpers";

export function constructTweets(data: ITflTubeStatusResponseItem[]): string[] {
  const linesText = data.map(line => {
    const status = line.lineStatuses[0];
    let text = getMark(status);

    text += ` ${line.name}: ${status.statusSeverityDescription}`;
    if (status.validityPeriods.length > 0) {
      const time = moment(status.validityPeriods[0].toDate).utc();
      const toTime = time.format("HH:mm");
      let toDate = time.format("DD/MM/YY");
      const today = moment()
        .utc()
        .format("DD/MM/YY");
      const tomorrow = moment()
        .add(1, "days")
        .utc()
        .format("DD/MM/YY");
      if (toDate === today) {
        toDate = "today";
      } else if (toDate === tomorrow) {
        toDate = "tomorrow";
      } else {
        toDate = `on ${toDate}`;
      }
      text += ` until ${toTime} ${toDate}`;
    }
    return text;
  });

  const now = moment()
    .tz("Europe/London")
    .format("DD/MM/YY HH:mm");
  const tweet1 = `${now}\n${linesText.slice(0, 5).join("\n")}`;
  const tweet2 = `${now}\n${linesText.slice(5).join("\n")}`;
  return [tweet1, tweet2];
}

async function saveData(data: ITflTubeStatusResponseItem[]): Promise<boolean> {
  let mustTweet = false;
  const savingPromises = [];
  const existingStatusPromises = [];
  for (let i = 0; i < data.length; i += 1) {
    const status = data[i].lineStatuses[0];
    status.lineId = data[i].id;
    existingStatusPromises.push(findLatestStatus(status.lineId));
    savingPromises.push(saveStationsStatus(status));
  }
  const existingStatuses = await Promise.all(existingStatusPromises);
  if (existingStatuses.length <= 0) {
    mustTweet = true;
  }
  existingStatuses.forEach((existingStatus, index) => {
    const status = data[index].lineStatuses[0];
    status.lineId = data[index].id;
    if (existingStatus && existingStatus.statusSeverity !== status.statusSeverity) {
      console.log(`There is a change in status severity at ${status.lineId} line. Will tweet.`);
      mustTweet = true;
    }
  });
  await Promise.all(savingPromises);
  console.log(`Saved data for all stations. I ${mustTweet ? "will" : "will not"} tweet.`);
  return mustTweet;
}

export async function main(event: any, context: Context) {
  await connectToDB();
  const appName = "@tflstatusnow";
  const Twitter = new Twit({
    consumer_key: process.env.TFL_CONSUMER_KEY || "",
    consumer_secret: process.env.TFL_CONSUMER_SECRET_KEY || "",
    access_token: process.env.TFL_ACCESS_TOKEN || "",
    access_token_secret: process.env.ACCESS_TOKEN_SECRET || ""
  });

  await authenticateTwitter(Twitter, appName);
  const data = await getTubeStatus();
  if (!data) return (process.exitCode = 1);
  const mustTweet = await saveData(data);
  if (!mustTweet) {
    const message = "Did not tweet as the statuses are the same.";
    console.log(message);
    await mongoose.connection.close();
    context.succeed(message);
    return;
  }
  const tweets = constructTweets(data);
  await postTweets(Twitter, tweets);
  const message = "Did tweet.";
  console.log(message);
  await mongoose.connection.close();
  context.succeed(message);
}
