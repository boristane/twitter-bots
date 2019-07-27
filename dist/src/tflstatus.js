"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const twit_1 = __importDefault(require("twit"));
const axios_1 = __importDefault(require("axios"));
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const expectedEnvVariables = [
    "TFL_CONSUMER_KEY",
    "TFL_CONSUMER_SECRET_KEY",
    "TFL_ACCESS_TOKEN",
    "ACCESS_TOKEN_SECRET"
];
const missingEnvVariables = [];
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
function getTubeStatus() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const tubeStatusUrl = "https://api.tfl.gov.uk/line/mode/tube/status";
            const { data } = yield axios_1.default.get(tubeStatusUrl);
            return data;
        }
        catch (err) {
            const text = `Error fetching data from TFL. Error: ${err}`;
            console.error(text);
            process.exit(1);
        }
    });
}
function constructTweets(data) {
    const linesText = data.map(line => {
        const status = line.lineStatuses[0];
        let text = getMark(status);
        text += ` ${line.name}: ${status.statusSeverityDescription}`;
        if (status.validityPeriods.length > 0) {
            const time = moment_timezone_1.default(status.validityPeriods[0].toDate).utc();
            const toTime = time.format("HH:mm");
            let toDate = time.format("DD/MM/YY");
            const today = moment_timezone_1.default()
                .utc()
                .format("DD/MM/YY");
            const tomorrow = moment_timezone_1.default()
                .add(1, "days")
                .utc()
                .format("DD/MM/YY");
            if (toDate === today) {
                toDate = "today";
            }
            else if (toDate === tomorrow) {
                toDate = "tomorrow";
            }
            else {
                toDate = `on ${toDate}`;
            }
            text += ` until ${toTime} ${toDate}`;
        }
        text += ".";
        return text;
    });
    const tweet1 = linesText.slice(0, 5).join("\n");
    const tweet2 = linesText.slice(5).join("\n");
    return [tweet1, tweet2];
}
exports.constructTweets = constructTweets;
function getMark(status) {
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
function authenticateTwitter(Twitter, appName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield Twitter.get("account/verify_credentials", {
                include_entities: false,
                skip_status: true,
                include_email: false
            });
            console.log(`Authentication ${appName} successful.`);
        }
        catch (err) {
            const text = `Error authenticating ${appName}. Error: ${err}`;
            console.error(text);
            process.exit(1);
        }
    });
}
function postTweets(Twitter, tweets) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let i = tweets.length - 1; i > -1; i -= 1) {
            const tweet = tweets[i];
            try {
                yield Twitter.post("statuses/update", { status: tweet });
            }
            catch (err) {
                const text = `Error posting new tweet ${tweet}. Error: ${err}`;
                console.error(text);
            }
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const appName = "@tflstatusnow";
        const Twitter = new twit_1.default({
            consumer_key: process.env.TFL_CONSUMER_KEY,
            consumer_secret: process.env.TFL_CONSUMER_SECRET_KEY,
            access_token: process.env.TFL_ACCESS_TOKEN,
            access_token_secret: process.env.ACCESS_TOKEN_SECRET
        });
        yield authenticateTwitter(Twitter, appName);
        const data = yield getTubeStatus();
        const tweets = constructTweets(data);
        yield postTweets(Twitter, tweets);
    });
}
exports.main = main;
//# sourceMappingURL=tflstatus.js.map