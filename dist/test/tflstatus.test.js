"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tflstatus_json_1 = __importDefault(require("./fixtures/tflstatus.json"));
const tflstatus_js_1 = require("../src/tflstatus.js");
it("should properly construct the tweets", () => {
    const expectedTweets = [
        "✅ Bakerloo: Good Service.\n✅ Central: Good Service.\n❗ Circle: Part Closure until 01:29 on 29/07/19.\n✅ District: Good Service.\n❗ Hammersmith & City: Part Closure until 01:29 on 29/07/19.",
        "✅ Jubilee: Good Service.\n❗ Metropolitan: Part Closure until 01:29 on 29/07/19.\n✅ Northern: Good Service.\n✅ Piccadilly: Good Service.\n✅ Victoria: Good Service.\n❌ Waterloo & City: Service Closed until 07:47 today."
    ];
    const tweets = tflstatus_js_1.constructTweets(tflstatus_json_1.default);
    expect(tweets.length).toEqual(expectedTweets.length);
    tweets.forEach((tweet, index) => {
        expect(tweet).toEqual(expectedTweets[index]);
    });
});
//# sourceMappingURL=tflstatus.test.js.map