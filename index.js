const dotenv = require("dotenv");
const { MezonClient } = require("mezon-sdk");
const WordChain = require("./word-chain");
const GeminiClient = require("./gemini");
const Gomoku = require("./gomoku");
const { sendMessage, sendMessageString } = require("./chat-utils")

dotenv.config();

async function main() {
  const client = new MezonClient(process.env.APPLICATION_TOKEN);
  // Example usage in your main function
  const gomoku = new Gomoku(client); // Create a new Gomoku instance
  const aiClient = new GeminiClient();
  const wordChain = new WordChain(aiClient, client);


  await client.authenticate();

  client.on("channel_message", async (event) => {
    console.log("event", event);
    if (typeof event.content.t !== 'string') {
      return;
    }
    if (event?.content?.t === "*ping") {
      sendMessageString(client, event, "pong", false, false);
    } else if (event?.content?.t.startsWith("*wordchain")) {
      const userCommand = event.content.t;
      const channelId = event?.channel_id;
      const response = await wordChain.handleCommand(event, userCommand, channelId);
      sendMessageString(client, event, response, false, false);
    } else if (event?.content?.t.startsWith("*gomoku")) {
      const userCommand = event?.content?.t;
      const username  = event?.username;
      const channelId = event?.channel_id;
      const response = await gomoku.handleCommand(event, userCommand, username, channelId);
      sendMessage(client, event, response, false);
    }
  });
}

main()
  .then(() => {
    console.log("bot start!");
  })
  .catch((error) => {
    console.error(error);
  });
