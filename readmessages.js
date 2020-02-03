require("dotenv").config();

var openpgp = require("openpgp");
const prompts = require("prompts");
const fs = require("fs");

var GitHub = require("github-api");

var gh = new GitHub({
  username: process.env.GITHUB_USER,
  password: process.env.GITHUB_PASS
});

var me = gh.getUser();

const questions = [
  {
    type: "text",
    name: "dir",
    message: "PGP Secret Key Directory:"
  },
  {
    type: "text",
    name: "pass",
    message: "PGP Passphrase: "
  }
];

const decryptMessage = async (message, privKey, pass) => {
  const {
    keys: [privateKey]
  } = await openpgp.key.readArmored(privKey);
  await privateKey.decrypt(pass);

  const options = {
    message: await openpgp.message.readArmored(message),
    privateKeys: [privateKey]
  };

  let decrypted = await openpgp.decrypt(options);
  const { title, author, body } = JSON.parse(decrypted["data"]);
  console.log(`\n\nTitle: ${title}\nAuthor: ${author}\nBody: ${body}\n\n`);
};

const readGist = async (id, privKey, pass) => {
  let gist = gh.getGist(id);
  let gistData = await gist.read();
  gistData = Object.values(gistData["data"]["files"])[0]["content"];

  if (gistData.startsWith("-----BEGIN PGP MESSAGE-----"))
    decryptMessage(gistData, privKey, pass);
};

(async () => {
  await openpgp.initWorker({ path: "openpgp.worker.js" });

  const response = await prompts(questions);

  const keyDir = response["dir"];

  if (!fs.existsSync(keyDir)) {
    console.log("No file found.");
    return;
  }

  const privKey = fs.readFileSync(keyDir, "utf-8");

  console.log("Loaded private key.");

  let gists = await me.listGists();

  for (let gist of gists["data"])
    await readGist(gist["id"], privKey, response["pass"]);
})();
