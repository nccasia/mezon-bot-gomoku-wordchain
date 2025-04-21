const { sendMessageString } = require("./chat-utils")

class WordChain {
    constructor(aiClient, chatClient) {
        this.games = {}
        this.aiClient = aiClient;
        this.chatClient = chatClient;
    }

    handleCommand(event, command, channelId) {
        const currentGame = this.games[channelId];
        if (currentGame) {
            return currentGame.handleCommand(event, command);
        } else {
            const newGame = new WordChainGame(this.aiClient, this.chatClient);
            this.games[channelId] = newGame;
            return newGame.handleCommand(event, command);
        }
    }
}


class WordChainGame {
    constructor(aiClient, chatClient) {
        this.aiClient = aiClient;
        this.chatClient = chatClient;
        this.initializeGame();
    }

    initializeGame() {
        this.history = []; // To keep track of conversation history
        this.lastWord = null;
        this.timeoutDuration = 20000;
        this.warningDuration = 10000;
        this.timeoutId = null;
        this.warningId = null;
    }

    startTurnTimeout(event) {
        // Set warning timeout
        this.warningId = setTimeout(() => {
          const warning = `Ei chú ý! Chỉ còn 10 giây để thực hiện nước đi.`;
          sendMessageString(this.chatClient, event, warning, false, true);
        }, this.warningDuration);
    
        // Set the main timeout for switching turns
        this.timeoutId = setTimeout(() => {
          clearTimeout(this.warningId); // Clear warning timeout
          // Notify players that the turn has timed out
          const endGame = `Thời gian đã kết! Tôi thắng!`;
          sendMessageString(this.chatClient, event, endGame, false, true);
          this.initializeGame();
        }, this.timeoutDuration);
      }

    // Method to handle user commands
    async handleCommand(event, command) {
        const parts = command.split(' ');
        if (parts.length == 1) {
            return `Chào mừng bạn đến với trò chơi nối từ tiếng Anh.
- *wordchain [word] để thực hiện lượt chơi.
- Kí tự đầu tiên của từ sau phải giống kí tự cuối cùng của từ trước đó.
- Bạn có 20 giây để suy nghĩ cho mỗi lượt.`
        }
        if (parts.length != 2) {
            return "Lượt đi không hợp lệ, *wordchain [word] để thực hiện lượt chơi."
        }
        const word = parts[1];
        clearTimeout(this.timeoutId);
        clearTimeout(this.warningId);
        const isValid = this.validateWordChain(word);
        if (isValid) {
            try {
                const responseWord = await this.getReponse(word);
                this.lastWord = word;
                const isResponseWordValid = this.validateWordChain(responseWord);
                if (!isResponseWordValid) {
                    this.initializeGame();
                    return `${responseWord}\nOops! Từ này không hợp lệ. Bạn thắng rồi! GGWP`;
                }

                // Add word and responseWord to history
                this.history.push(
                    { role: "user", parts: [{ text: word }] },
                    { role: "model", parts: [{ text: responseWord }] }
                );
                this.lastWord = responseWord;
                this.startTurnTimeout(event);
                return responseWord;
            } catch (e) {
                this.initializeGame();
                return `Khó quá tôi không nghĩ ra từ nào! Bạn thắng! GGWP!`;
            }
        } else {
            this.initializeGame();
            return "Từ này không hợp lệ! Bạn thua rồi! Gàaaaa!";
        }
    }

    // Method to validate the user's command
    validateWordChain(currentWord) {
        if (typeof currentWord !== 'string' || currentWord.length < 2) return false;
        if (this.history.length == 0 || this.lastWord == null) return true;

        const firstChar = currentWord.charAt(0).toLowerCase();
        const lastChar = this.lastWord.charAt(this.lastWord.length - 1).toLowerCase();
        // Check if the first character matches the last character of the last word
        if (firstChar !== lastChar) {
            return false; // Invalid if it doesn't match
        }
        // Check if the currentWord has been used before in history
        const hasBeenUsedBefore = this.history.some(entry =>
            entry.parts[0].text.toLowerCase() === currentWord.toLowerCase()
        );

        return !hasBeenUsedBefore;
    }

    // Method to execute the command and generate a response
    async getReponse(command) {
        const aiReponse = await this.aiClient.run(this.history, command);
        return aiReponse.trim();
    }
}

// Export the WordChain class
module.exports = WordChain;