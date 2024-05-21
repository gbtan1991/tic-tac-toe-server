const express = require('express');
const { Server } = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new Server({ server });

let gameState = Array(9).fill(null); // Represents the Tic-Tac-Toe board
let currentPlayer = 'X';
let players = {}; // Map to store player connections

wss.on('connection', (ws) => {
  console.log('New client connected');

  const playerNumber = Object.keys(players).length + 1;
  if (playerNumber > 2) {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'Game is full' }));
    ws.close();
    return;
  }
  players[ws] = playerNumber;

  ws.on('message', (message) => {
    const { type, index } = JSON.parse(message);

    if (type === 'MOVE' && gameState[index] === null) {
      if ((currentPlayer === 'X' && playerNumber === 1) || (currentPlayer === 'O' && playerNumber === 2)) {
        gameState[index] = currentPlayer;
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        broadcastGameState();
        checkWinner();
      }
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    delete players[ws];
  });

  ws.send(JSON.stringify({ type: 'INITIAL_STATE', gameState, playerNumber }));
});

const broadcastGameState = () => {
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify({ type: 'GAME_STATE', gameState, currentPlayer }));
    }
  });
};

const checkWinner = () => {
  const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6] // diagonals
  ];

  for (const [a, b, c] of winningCombinations) {
    if (gameState[a] && gameState[a] === gameState[b] && gameState[a] === gameState[c]) {
      broadcastWinner(gameState[a]);
      resetGame();
      return;
    }
  }

  if (gameState.every(cell => cell)) {
    broadcastWinner(null); // Draw
    
  }
};

const broadcastWinner = (winner) => {
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify({ type: 'GAME_OVER', winner }));
    }
  });
};

const resetGame = () => {
  gameState = Array(9).fill(null);
  currentPlayer = 'X';
  broadcastGameState();
};

server.listen(8080, () => {
  console.log('Server is listening on port 8080');
});
