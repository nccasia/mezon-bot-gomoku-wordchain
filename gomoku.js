const { sendMessageString } = require("./chat-utils")

class Gomoku {
  constructor(chatClient) {
    this.games = {};
    this.chatClient = chatClient;
  }

  handleCommand(event, command, username, channelId) {
    const currentGame = this.games[channelId];
    if (currentGame) {
      return currentGame.handleCommand(event, command, username);
    } else {
      const newGame = new GomokuGame(this.chatClient);
      this.games[channelId] = newGame;
      return newGame.handleCommand(event, command, username);
    }
  }
}

class GomokuGame {
  constructor(chatClient) {
    this.chatClient = chatClient;
    this.initializeGame();
  }

  initializeGame() {
    this.maxSize = 20;
    this.board = this.initializeBoard();
    this.currentPlayer = 'x'; // X always starts
    this.players = {
      "x": null,
      "o": null
    }
    this.timeoutDuration = 30000;
    this.warningDuration = 20000;
    this.timeoutId = null;
    this.warningId = null;
  }

  startTurnTimeout(event) {
    // Set warning timeout
    this.warningId = setTimeout(() => {
      const warning = `${this.players[this.currentPlayer]}! Chỉ còn 10 giây để thực hiện nước đi.`;
      sendMessageString(this.chatClient, event, warning, false, true);
    }, this.warningDuration);

    // Set the main timeout for switching turns
    this.timeoutId = setTimeout(() => {
      clearTimeout(this.warningId); // Clear warning timeout
      // Notify players that the turn has timed out
      const winner = this.currentPlayer ==  'x' ? 'o' : 'x';
      const endGame = `Thời gian đã kết! ${this.players[winner]} thắng!`;
      sendMessageString(this.chatClient, event, endGame, false, true);
      this.initializeGame();
    }, this.timeoutDuration);
  }

  initializeBoard() {
    return Array.from({ length: this.maxSize }, () => Array(this.maxSize).fill(null));
  }

  makeMove(x, y, username) {
    if (this.players["x"] && this.players["x"] != username
      && this.players["o"] && this.players["o"] != username) {
      return { winner: null, error: `Đang diễn ra trận của ${this.players["x"]} và ${this.players["o"]}, chờ trận sau nhé bạn.` };
    }
    if (this.players["x"] && this.players["o"] && this.players[this.currentPlayer] != username) {
      return { winner: null, error: 'Không phải lượt của bạn, chờ tới lượt đê.' };
    }
    if (this.board[x][y] || x < 0 || x >= this.maxSize || y < 0 || y >= this.maxSize) {
      return { winner: null, error: 'Vị trí này đã được đánh rồi, đi lại đi bạn êi!' };
    }
    if (!this.players[this.currentPlayer]) {
      this.players[this.currentPlayer] = username;
    }
    this.board[x][y] = this.currentPlayer;
    const winner = this.checkWinner(x, y);
    this.currentPlayer = this.currentPlayer === 'x' ? 'o' : 'x'; // Switch player
    return { winner: winner, message: winner ? `${this.players[winner]} (${winner}) wins! GGWP` : 'Ngon! Mời lượt chơi tiếp theo.' };
  }

  checkWinner(x, y) {
    const directions = [
      { dx: 1, dy: 0 }, // horizontal
      { dx: 0, dy: 1 }, // vertical
      { dx: 1, dy: 1 }, // diagonal \
      { dx: 1, dy: -1 }, // diagonal /
    ];

    for (const { dx, dy } of directions) {
      let count = 1;
      count += this.countInDirection(x, y, dx, dy);
      count += this.countInDirection(x, y, -dx, -dy);
      if (count >= 5) {
        return this.board[x][y]; // Return the winner
      }
    }
    return null; // No winner yet
  }

  countInDirection(x, y, dx, dy) {
    let count = 0;
    let player = this.board[x][y];
    while (true) {
      x += dx;
      y += dy;
      if (x < 0 || x >= this.maxSize || y < 0 || y >= this.maxSize || this.board[x][y] !== player) {
        break;
      }
      count++;
    }
    return count;
  }

  displayBoard() {
    // Create the header with column indices
    const header = '   |' + Array.from({ length: this.maxSize }, (_, index) => {
      return index < 10 ? `  ${index}` : ` ${index}`;
    }).join('|') + '|';

    // Create the board display
    const boardDisplay = this.board.map((row, rowIndex) => {
      const rowIndexString = rowIndex < 10 ? ` ${rowIndex}` : rowIndex;
      const rowString = row.map(cell => cell || ' ').join(' | '); // Use '|' to separate columns
      return `${rowIndexString} | ${rowString} |`;
    }).join('\n'); // Add a separator line between rows

    // Combine header and board display
    return `${header}\n${boardDisplay}`;
  }

  handleCommand(event, command, username) {
    const parts = command.split(' ');
    if (parts.length == 1) {
      return { t: `Chào mừng bạn đến với trò chơi cờ caro:
- *gomoku [x] [y]: thực hiện nước đi của bạn (0 <= i, j <= 19), ví dụ *gomoku 5 5. Người đi trước sẽ chơi quân 'x'.
- Sau khi người chơi thứ hai tham chiến. Bạn có 30 giây để suy nghĩ cho mỗi lượt đi.
- *gomoku reset để reset bàn cờ.
- *gomoku status để xem trạng thái hiện tại của bàn cờ.`}
    }

    if (parts.length == 2) {
      const param = parts[1];
      if (param == 'reset') {
        this.initializeGame();
        return { t: "Trận đấu đã được reset! *gomoku [i] [j] để bắt đầu trận đấu." };
      } else if (param == 'status') {
        if (!this.players['x']) {
          return { t: "Chưa có ai tham gia trận đấu ở room này! *gomoku [i] [j] để bắt đầu trận đấu." };
        } else {
          const statusNessage = (this.players['o']) ? `Trận đấu giữa ${this.players['x']}(quân 'x') và ${this.players['o']}( quân 'o').`
            : `Người chơi thứ nhất ${this.players['x']}(quân 'x') đã tham gia trận đấu.`;
          const nextTurnMessage = (this.players[this.currentPlayer]) ? `Lượt tiếp theo ${this.players[this.currentPlayer]}(quân ${this.currentPlayer}) thực hiện nước đi.`
            : `Lượt tiếp theo của người chơi thứ hai (quân 'o').`;
          const boardDisplay = this.displayBoard();
          const fullResponse = `\`\`\`${statusNessage}\n${nextTurnMessage}\n${boardDisplay}\`\`\``;
          return {
            t: fullResponse,
            mk: [
              {
                "type": "t",
                "s": 0,
                "e": fullResponse.length,
              }
            ]
          }
        }
      } else {
        return { t: "Command chưa hỗ trợ, *gomoku để xem hướng dẫn." };
      }
    }

    if (parts.length !== 3 || parts[0] !== '*gomoku') {
      return { t: "Sai command rồi. Sử dụng cú pháp *gomoku [i] [j]." };
    }

    const x = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);

    if (isNaN(x) || isNaN(y)) {
      return { t: "Tọa độ phải là số nguyên." };
    }

    const { winner, error, message } = this.makeMove(x, y, username);
    if (error) return { t: error };
    const boardDisplay = this.displayBoard();
    clearTimeout(this.timeoutId);
    clearTimeout(this.warningId);
    if (winner) {
      this.initializeGame();
    } else if (this.players['o']) {
      this.startTurnTimeout(event);
    }
    const fullResponse = `\`\`\`${message}\n${boardDisplay}\`\`\``;
    return {
      t: fullResponse,
      mk: [
        {
          "type": "t",
          "s": 0,
          "e": fullResponse.length,
        }
      ]
    }
  }
}

module.exports = Gomoku;