import Twit from "twit";
import {
  connectToDB,
  authenticateTwitter,
  lineIds,
  getTubeStatus,
  saveStationsStatus,
  getMark,
  replyToTweet
} from "./helpers";
import { ITflTubeStatusResponseItem } from "./interfaces/ITflTubeStatusResponseItem";
import moment from "moment-timezone";
require("dotenv").config();

async function saveData(data: ITflTubeStatusResponseItem[]) {
  console.log("Saving the data obtained from the TfL API in the database.");
  const savingPromises = [];
  for (let i = 0; i < data.length; i += 1) {
    const status = data[i].lineStatuses[0];
    status.lineId = data[i].id;
    savingPromises.push(saveStationsStatus(status));
  }
  await Promise.all(savingPromises);
  console.log(`Saved data for all stations. I will tweet.`);
}

function constructTweet(data: ITflTubeStatusResponseItem[], lineId: string, name: string) {
  const lineData = data.find(d => d.id === lineId) as ITflTubeStatusResponseItem;
  const status = lineData.lineStatuses[0];
  let text = `@${name}\n`;
  const now = moment()
    .tz("Europe/London")
    .format("DD/MM/YY HH:mm");
  text += `${now}\n`;
  text += `${getMark(status)} ${lineData.name} line - `;
  text += `${status.statusSeverityDescription}\n\n`;
  text += `${status.reason || ""}`;
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
    text += `\nUntil ${toTime} ${toDate}.`;
  }
  return text;
}

async function listenToStream() {
  await connectToDB();
  const appName = "@tflstatusnow";
  const Twitter = new Twit({
    consumer_key: process.env.TFL_CONSUMER_KEY || "",
    consumer_secret: process.env.TFL_CONSUMER_SECRET_KEY || "",
    access_token: process.env.TFL_ACCESS_TOKEN || "",
    access_token_secret: process.env.ACCESS_TOKEN_SECRET || ""
  });

  await authenticateTwitter(Twitter, appName);
  const stream = Twitter.stream("statuses/filter", { track: [appName] });
  console.log("Got the stream.");
  stream.on("tweet", async (message: any) => {
    console.log("Got a tweet event");
    const replyTo = message.in_reply_to_screen_name;
    if (replyTo !== "tflstatusnow") return;

    console.log(`Someone tweeted at me ${JSON.stringify(message.user.name)}`);
    const { text, id_str }: { text: string; id_str: string } = message;
    const name = message.user.screen_name;
    for (let i = 0; i < lineIds.length; i += 1) {
      const id = lineIds[i];
      console.log(`Checking "${text}" against "${id}".`);
      if (text.toLocaleLowerCase().includes(id.split("-")[0])) {
        console.log(`Matched "${text}" with "${id} line".`);
        const data = await getTubeStatus();
        if (!data) return (process.exitCode = 1);
        saveData(data);
        const tweet = constructTweet(data, lineIds[i], name);
        await replyToTweet(Twitter, tweet, id_str);
        return;
      }
    }
    await replyToTweet(
      Twitter,
      `@${name} I'm afraid I could not find a tube line matching your tweet...`,
      id_str
    );
  });
}

listenToStream();
