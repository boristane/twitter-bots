require("dotenv").config();
import Twit from "twit";
import { IncomingMessage } from "http";
import axios from "axios";
import { ITflTubeStatusResponseItem, ILineStatus } from "./interfaces/ITflTubeStatusResponseItem";
import moment from "moment-timezone";

const expectedEnvVariables: string[] = [
  "TFL_CONSUMER_KEY",
  "TFL_CONSUMER_SECRET_KEY",
  "TFL_ACCESS_TOKEN",
  "ACCESS_TOKEN_SECRET"
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

async function getTubeStatus(): Promise<ITflTubeStatusResponseItem[]> {
  try {
    const tubeStatusUrl = "https://api.tfl.gov.uk/line/mode/tube/status";
    const { data } = await axios.get(tubeStatusUrl);
    return data;
  } catch (err) {
    const text = `Error fetching data from TFL. Error: ${err}`;
    console.error(text);
    process.exit(1);
  }
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
    process.exit(1);
  }
}

async function postTweets(Twitter: Twit, tweets: string[]) {
  for (let i = tweets.length - 1; i > -1; i -= 1) {
    const tweet = tweets[i];
    try {
      await Twitter.post("statuses/update", { status: tweet });
      console.log(`Successfully tweeted ${tweet}`);
    } catch (err) {
      const text = `Error posting new tweet ${tweet}. Error: ${err}`;
      console.error(text);
    }
  }
}

export async function main() {
  const appName = "@tflstatusnow";

  const Twitter = new Twit({
    consumer_key: process.env.TFL_CONSUMER_KEY,
    consumer_secret: process.env.TFL_CONSUMER_SECRET_KEY,
    access_token: process.env.TFL_ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET
  });

  await authenticateTwitter(Twitter, appName);
  const data = await getTubeStatus();
  const tweets = constructTweets(data);
  await postTweets(Twitter, tweets);
}
