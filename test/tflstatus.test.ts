import tflstatus from "./fixtures/tflstatus.json";
import { constructTweets } from "../src/tflstatus";
import moment from "moment";

it("should properly construct the tweets", () => {
  const now = moment()
    .tz("Europe/London")
    .format("DD/MM/YY HH:mm");
  const expectedTweets = [
    `${now}\n❗ Bakerloo: Part Suspended until 09:17 today\n✅ Central: Good Service\n❗ Circle: Part Closure until 01:29 on 29/07/19\n✅ District: Good Service\n❗ Hammersmith & City: Part Closure until 01:29 on 29/07/19`,
    `${now}\n✅ Jubilee: Good Service\n❗ Metropolitan: Part Closure until 01:29 on 29/07/19\n✅ Northern: Good Service\n✅ Piccadilly: Good Service\n✅ Victoria: Good Service\n❌ Waterloo & City: Service Closed until 07:47 today`
  ];

  const tweets = constructTweets(tflstatus);

  expect(tweets.length).toEqual(expectedTweets.length);
  tweets.forEach((tweet, index) => {
    expect(tweet).toEqual(expectedTweets[index]);
  });
});
