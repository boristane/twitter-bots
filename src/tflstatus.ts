require("dotenv").config();
import Twit from "twit";
import axios from "axios";
import { ITflTubeStatusResponseItem, ILineStatus } from "./interfaces/ITflTubeStatusResponseItem";
import moment from "moment-timezone";
import { saveToDB, findLatestStatus } from "./controllers/lineStatus";

import mongoose from "mongoose";
import { Context } from "aws-lambda";
import { saveTweetToDB, findAllTweets } from "./controllers/tweet";

const expectedEnvVariables: string[] = [
  "TFL_CONSUMER_KEY",
  "TFL_CONSUMER_SECRET_KEY",
  "TFL_ACCESS_TOKEN",
  "ACCESS_TOKEN_SECRET",
  "MONGO_ATLAS_PASSWORD",
  "MONGO_ATLAS_DATABASE"
];
const missingEnvVariables: string[] = [];
expectedEnvVariables.forEach(variable => {
  if (!process.env[variable]) {
    missingEnvVariables.push(variable);
  }
});
if (missingEnvVariables.length >= 1) {
  const text = `Missing environement variables: ${missingEnvVariables.join(", ")}`;
  console.error(text);
  process.exit(1);
}

async function connectToDB() {
  const mongoDBURI = `mongodb+srv://boristane:${
    process.env.MONGO_ATLAS_PASSWORD
  }@blog-fy3jk.gcp.mongodb.net/${process.env.MONGO_ATLAS_DATABASE}?retryWrites=true&w=majority`;
  await mongoose.connect(mongoDBURI, { useNewUrlParser: true });
}

async function getTubeStatus(): Promise<ITflTubeStatusResponseItem[] | undefined> {
  try {
    const tubeStatusUrl = "https://api.tfl.gov.uk/line/mode/tube/status";
    const { data } = await axios.get(tubeStatusUrl);
    console.log("Successfully retrieved data from TFL.");
    return data;
  } catch (err) {
    const text = `Error fetching data from TFL. Error: ${err}`;
    console.error(text);
    process.exitCode = 1;
  }
}

async function saveStationsStatus(status: ILineStatus) {
  const reason = status.reason ? status.reason : "";
  let from = "";
  let to = "";
  if (status.validityPeriods.length > 0) {
    from = status.validityPeriods[0].fromDate;
    to = status.validityPeriods[0].toDate;
  }
  saveToDB(
    status.lineId,
    status.statusSeverity,
    status.statusSeverityDescription,
    reason,
    from,
    to
  );
}

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

function getMark(status: ILineStatus) {
  switch (status.statusSeverity) {
    case 10:
      return "✅";
    case 1:
    case 2:
    case 16:
    case 20:
      return "❌";
    default:
      return "❗";
  }
}

async function authenticateTwitter(Twitter: Twit, appName: string) {
  try {
    await Twitter.get("account/verify_credentials", {
      include_entities: false,
      skip_status: true,
      include_email: false
    });
    console.log(`Authentication ${appName} successful.`);
  } catch (err) {
    const text = `Error authenticating ${appName}. Error: ${err}`;
    console.error(text);
    return (process.exitCode = 1);
  }
}

async function postTweets(Twitter: Twit, tweets: string[]) {
  for (let i = tweets.length - 1; i > -1; i -= 1) {
    const tweet = tweets[i];
    try {
      const data = await Twitter.post("statuses/update", { status: tweet });
      // await deleteTweets(Twitter);
      if (data.hasOwnProperty("data")) {
        // @ts-ignore
        await saveTweetToDB(data.data.id, data.data.text);
        console.log("Saved the tweet");
      }
      console.log(`Successfully tweeted ${tweet}`);
    } catch (err) {
      const text = `Error posting new tweet ${tweet}. Error: ${err}`;
      console.error(text);
      return (process.exitCode = 1);
    }
  }
}

async function deleteTweets(Twitter: Twit) {
  const tweets = await findAllTweets();
  if (!(tweets && tweets.length > 0)) {
    return;
  }
  for (let i = 0; i < tweets.length; i += 1) {
    const id = tweets[i].id;
    try {
      console.log(typeof id);
      await Twitter.post("statuses/destroy/:id", { id });
      console.log(`Deleted tweet ${id}`);
    } catch (err) {
      const text = `Error deleting ${id}. Error: ${err}`;
      console.error(text);
      // return (process.exitCode = 1);
    }
  }
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
