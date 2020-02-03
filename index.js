require("dotenv").config();

var openpgp = require("openpgp");
const prompts = require("prompts");
const fs = require("fs");

var GitHub = require("github-api");

var gh = new GitHub({
  username: process.env.GITHUB_USER,
  password: process.env.GITHUB_PASS
});

const pubkey = fs.readFileSync("publickey.txt").toString();

const questions = [
  {
    type: "text",
    name: "title",
    message: "Blog Title:"
  },
  {
    type: "text",
    name: "author",
    message: "Blog Author:"
  },
  {
    type: "text",
    name: "body",
    message: "Blog Body:"
  }
];

const createGist = content => {
  let gist = gh.getGist();
  let randName =
    Math.random()
      .toString(36)
      .substring(2, 15) +
    Math.random()
      .toString(36)
      .substring(2, 15) +
    ".txt";
  gist
    .create({
      public: false,
      files: {
        [randName]: {
          content
        }
      }
    })
    .then(function({ data }) {
      let createdGist = data;
      console.log("Created @ " + createdGist["html_url"]);
      return gist.read();
    });
};

const encryptMessage = async message => {
  const options = {
    message: openpgp.message.fromText(message),
    publicKeys: (await openpgp.key.readArmored(pubkey)).keys
  };

  let encrypted = await openpgp.encrypt(options);
  return encrypted["data"];
};

(async () => {
  await openpgp.initWorker({ path: "openpgp.worker.js" });

  const response = await prompts(questions);

  response["uploadDate"] = new Date().toISOString();

  let encrypted = await encryptMessage(JSON.stringify(response));

  createGist(encrypted);
})();
