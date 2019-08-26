import mongoose from "mongoose";
import { ILineStatus, ITflTubeStatusResponseItem } from "./interfaces/ITflTubeStatusResponseItem";
import { saveToDB } from "./controllers/lineStatus";
import axios from "axios";
import Twit from "twit";
import { saveTweetToDB, findAllTweets } from "./controllers/tweet";

export const lineNames = [
  "Bakerloo",
  "Central",
  "Circle",
  "District",
  "Hammersmith & City",
  "Jubilee",
  "Metropolitan",
  "Northern",
  "Piccadilly",
  "Victoria",
  "Waterloo & City"
];

export const lineIds = [
  "bakerloo",
  "central",
  "circle",
  "district",
  "hammersmith-city",
  "jubilee",
  "metropolitan",
  "northern",
  "piccadilly",
  "victoria",
  "waterloo-city"
];

export function checkEnvVariables() {
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
}

export async function connectToDB() {
  console.log("Connecting to the database.");
  const mongoDBURI = `mongodb+srv://boristane:${process.env.MONGO_ATLAS_PASSWORD}@blog-fy3jk.gcp.mongodb.net/${process.env.MONGO_ATLAS_DATABASE}?retryWrites=true&w=majority`;
  await mongoose.connect(mongoDBURI, { useNewUrlParser: true });
}

export async function getTubeStatus(): Promise<ITflTubeStatusResponseItem[] | undefined> {
  console.log("Fetching thr TfL API for tube line statuses.");
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

export async function saveStationsStatus(status: ILineStatus) {
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

export async function authenticateTwitter(Twitter: Twit, appName: string) {
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

export async function postTweets(Twitter: Twit, tweets: string[]) {
  for (let i = tweets.length - 1; i > -1; i -= 1) {
    const tweet = tweets[i];
    try {
      const data = (await Twitter.post("statuses/update", { status: tweet })) as {
        data: { id: string; text: string };
      };
      if (data.hasOwnProperty("data")) {
        await saveTweetToDB(data.data.id, data.data.text);
      }
      console.log(`Successfully tweeted ${tweet}`);
    } catch (err) {
      const text = `Error posting new tweet ${tweet}. Error: ${err}`;
      console.error(text);
    }
  }
}

export async function replyToTweet(T: Twit, tweet: string, replyTo: string) {
  var params = {
    status: tweet,
    in_reply_to_status_id: replyTo
  };

  try {
    const data = (await T.post("statuses/update", params)) as {
      data: { id: string; text: string };
    };
    if (data.hasOwnProperty("data")) {
      await saveTweetToDB(data.data.id, data.data.text);
    }
    console.log(`Successfully tweeted ${tweet}\nas a reply to ${replyTo}`);
  } catch (err) {
    const text = `Error posting new tweet ${tweet}\nas a reply to ${replyTo}. Error: ${err}`;
    console.error(text);
  }
}

export async function deleteTweets(Twitter: Twit) {
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
    }
  }
}

export function getMark(status: ILineStatus) {
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
