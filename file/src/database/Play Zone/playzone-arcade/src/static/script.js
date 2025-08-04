// Global variables
let currentGame = null;
let gameData = {};

// API base URL
const API_BASE = '/api/games';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    loadLeaderboard();
    initializeAnimations();
});

// Navigation functionality
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                // Update active nav link
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                
                // Smooth scroll to section
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Mobile navigation toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navLinksContainer = document.querySelector('.nav-links');
    
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navLinksContainer.classList.toggle('active');
        });
    }
}

// Scroll to games section
function scrollToGames() {
    document.getElementById('games').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

// Initialize animations and interactions
function initializeAnimations() {
    // Add intersection observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe game cards
    document.querySelectorAll('.game-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}

// Game management functions
function startGame(gameType) {
    currentGame = gameType;
    const modal = document.getElementById('game-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    // Set modal title
    const gameTitles = {
        'number-guess': 'Number Guessing Game',
        'rps': 'Rock Paper Scissors',
        'tictactoe': 'Tic Tac Toe',
        'memory': 'Memory Cards',
        'snake': 'Snake Game'
    };
    
    modalTitle.textContent = gameTitles[gameType];
    
    // Load game interface
    switch(gameType) {
        case 'number-guess':
            loadNumberGuessGame();
            break;
        case 'rps':
            loadRPSGame();
            break;
        case 'tictactoe':
            loadTicTacToeGame();
            break;
        case 'memory':
            loadMemoryGame();
            break;
        case 'snake':
            loadSnakeGame();
            break;
    }
    
    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeGameModal() {
    const modal = document.getElementById('game-modal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Clean up any running games
    if (currentGame === 'snake' && gameData.snakeInterval) {
        clearInterval(gameData.snakeInterval);
    }
    
    currentGame = null;
    gameData = {};
}

// Number Guessing Game
function loadNumberGuessGame() {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div class="game-container">
            <div class="game-board">
                <h3>Choose Difficulty</h3>
                <div class="difficulty-buttons">
                    <button class="game-button" onclick="startNumberGuess('easy')">Easy (1-50)</button>
                    <button class="game-button" onclick="startNumberGuess('medium')">Medium (1-100)</button>
                    <button class="game-button" onclick="startNumberGuess('hard')">Hard (1-200)</button>
                </div>
            </div>
        </div>
    `;
}

async function startNumberGuess(difficulty) {
    try {
        const response = await fetch(`${API_BASE}/number-guess/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ difficulty })
        });
        
        const data = await response.json();
        gameData.numberGuess = data;
        
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <div class="game-container">
                <div class="game-info">
                    <div class="info-item">
                        <span class="info-label">Range</span>
                        <span class="info-value">${data.min} - ${data.max}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Attempts Left</span>
                        <span class="info-value" id="attempts-left">${data.max_attempts}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Difficulty</span>
                        <span class="info-value">${data.difficulty}</span>
                    </div>
                </div>
                <div class="game-board">
                    <h3>Guess the Number!</h3>
                    <input type="number" id="guess-input" class="game-input" 
                           placeholder="Enter your guess" min="${data.min}" max="${data.max}">
                    <br>
                    <button class="game-button" onclick="makeGuess()">Submit Guess</button>
                    <div id="guess-feedback" style="margin-top: 1rem; font-size: 1.1rem;"></div>
                </div>
            </div>
        `;
        
        // Focus on input
        document.getElementById('guess-input').focus();
        
        // Add enter key listener
        document.getElementById('guess-input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                makeGuess();
            }
        });
        
    } catch (error) {
        console.error('Error starting number guess game:', error);
    }
}

async function makeGuess() {
    const guessInput = document.getElementById('guess-input');
    const guess = parseInt(guessInput.value);
    const feedback = document.getElementById('guess-feedback');
    
    if (isNaN(guess)) {
        feedback.innerHTML = '<span style="color: #dc3545;">Please enter a valid number!</span>';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/number-guess/guess`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                game_id: gameData.numberGuess.game_id,
                guess: guess
            })
        });
        
        const data = await response.json();
        
        if (data.result === 'correct') {
            feedback.innerHTML = `
                <div style="color: #28a745; font-weight: bold;">
                    🎉 Congratulations! You guessed it in ${data.attempts} attempts!
                </div>
            `;
            guessInput.disabled = true;
        } else if (data.result === 'game_over') {
            feedback.innerHTML = `
                <div style="color: #dc3545; font-weight: bold;">
                    😞 Game Over! The number was ${data.target}
                </div>
            `;
            guessInput.disabled = true;
        } else {
            feedback.innerHTML = `
                <div style="color: #ffc107;">
                    Try ${data.hint}! You have ${data.remaining} attempts left.
                </div>
            `;
            document.getElementById('attempts-left').textContent = data.remaining;
        }
        
        guessInput.value = '';
        guessInput.focus();
        
    } catch (error) {
        console.error('Error making guess:', error);
        feedback.innerHTML = '<span style="color: #dc3545;">Error making guess. Please try again.</span>';
    }
}

// Rock Paper Scissors Game
function loadRPSGame() {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div class="game-container">
            <div class="game-info">
                <div class="info-item">
                    <span class="info-label">Your Score</span>
                    <span class="info-value" id="player-score">0</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Computer Score</span>
                    <span class="info-value" id="computer-score">0</span>
                </div>
            </div>
            <div class="game-board">
                <h3>Choose Your Move</h3>
                <div class="rps-choices">
                    <button class="game-button rps-button" onclick="playRPS('rock')">
                        🪨 Rock
                    </button>
                    <button class="game-button rps-button" onclick="playRPS('paper')">
                        📄 Paper
                    </button>
                    <button class="game-button rps-button" onclick="playRPS('scissors')">
                        ✂️ Scissors
                    </button>
                </div>
                <div id="rps-result" style="margin-top: 2rem; font-size: 1.2rem; min-height: 60px;"></div>
            </div>
        </div>
    `;
    
    gameData.rps = { playerScore: 0, computerScore: 0 };
}

async function playRPS(choice) {
    const resultDiv = document.getElementById('rps-result');
    const buttons = document.querySelectorAll('.rps-button');
    
    // Disable buttons during animation
    buttons.forEach(btn => btn.disabled = true);
    
    try {
        const response = await fetch(`${API_BASE}/rps/play`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ choice })
        });
        
        const data = await response.json();
        
        // Show choices with animation
        const choiceEmojis = {
            rock: '🪨',
            paper: '📄',
            scissors: '✂️'
        };
        
        resultDiv.innerHTML = `
            <div style="display: flex; justify-content: space-around; align-items: center; margin-bottom: 1rem;">
                <div style="text-align: center;">
                    <div style="font-size: 3rem;">${choiceEmojis[data.player_choice]}</div>
                    <div>You</div>
                </div>
                <div style="font-size: 2rem;">VS</div>
                <div style="text-align: center;">
                    <div style="font-size: 3rem;">${choiceEmojis[data.computer_choice]}</div>
                    <div>Computer</div>
                </div>
            </div>
        `;
        
        // Show result after a delay
        setTimeout(() => {
            let resultText = '';
            let resultColor = '';
            
            if (data.result === 'win') {
                resultText = '🎉 You Win!';
                resultColor = '#28a745';
                gameData.rps.playerScore++;
                document.getElementById('player-score').textContent = gameData.rps.playerScore;
            } else if (data.result === 'lose') {
                resultText = '😞 You Lose!';
                resultColor = '#dc3545';
                gameData.rps.computerScore++;
                document.getElementById('computer-score').textContent = gameData.rps.computerScore;
            } else {
                resultText = '🤝 It\'s a Tie!';
                resultColor = '#ffc107';
            }
            
            resultDiv.innerHTML += `
                <div style="color: ${resultColor}; font-weight: bold; font-size: 1.3rem;">
                    ${resultText}
                </div>
            `;
            
            // Re-enable buttons
            buttons.forEach(btn => btn.disabled = false);
        }, 1000);
        
    } catch (error) {
        console.error('Error playing RPS:', error);
        buttons.forEach(btn => btn.disabled = false);
    }
}

// Tic Tac Toe Game
function loadTicTacToeGame() {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div class="game-container">
            <div class="game-board">
                <h3>Tic Tac Toe</h3>
                <p>You are X, Computer is O</p>
                <div class="ttt-grid" id="ttt-grid">
                    ${Array(9).fill(0).map((_, i) => 
                        `<div class="ttt-cell" onclick="makeTTTMove(${i})" data-index="${i}"></div>`
                    ).join('')}
                </div>
                <div id="ttt-status" style="margin-top: 1rem; font-size: 1.1rem;"></div>
                <button class="game-button" onclick="startNewTTTGame()" style="margin-top: 1rem;">
                    New Game
                </button>
            </div>
        </div>
    `;
    
    startNewTTTGame();
}

async function startNewTTTGame() {
    try {
        const response = await fetch(`${API_BASE}/tictactoe/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        gameData.tictactoe = data;
        
        // Clear board
        const cells = document.querySelectorAll('.ttt-cell');
        cells.forEach(cell => {
            cell.textContent = '';
            cell.className = 'ttt-cell';
            cell.style.pointerEvents = 'auto';
        });
        
        document.getElementById('ttt-status').textContent = 'Your turn! Click a cell to place X.';
        
    } catch (error) {
        console.error('Error starting Tic Tac Toe game:', error);
    }
}

async function makeTTTMove(position) {
    const cell = document.querySelector(`[data-index="${position}"]`);
    
    if (cell.textContent !== '' || !gameData.tictactoe) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/tictactoe/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                game_id: gameData.tictactoe.game_id,
                position: position
            })
        });
        
        const data = await response.json();
        
        // Update board
        updateTTTBoard(data.board);
        
        const statusDiv = document.getElementById('ttt-status');
        
        if (data.status === 'finished') {
            const cells = document.querySelectorAll('.ttt-cell');
            cells.forEach(cell => cell.style.pointerEvents = 'none');
            
            if (data.winner === 'X') {
                statusDiv.innerHTML = '<span style="color: #28a745; font-weight: bold;">🎉 You Win!</span>';
            } else if (data.winner === 'O') {
                statusDiv.innerHTML = '<span style="color: #dc3545; font-weight: bold;">😞 Computer Wins!</span>';
            } else {
                statusDiv.innerHTML = '<span style="color: #ffc107; font-weight: bold;">🤝 It\'s a Tie!</span>';
            }
        } else {
            statusDiv.textContent = 'Your turn! Click a cell to place X.';
        }
        
    } catch (error) {
        console.error('Error making TTT move:', error);
    }
}

function updateTTTBoard(board) {
    const cells = document.querySelectorAll('.ttt-cell');
    board.forEach((value, index) => {
        if (value) {
            cells[index].textContent = value;
            cells[index].classList.add(value.toLowerCase());
        }
    });
}

// Memory Game
function loadMemoryGame() {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div class="game-container">
            <div class="game-board">
                <h3>Memory Cards</h3>
                <p>Choose Difficulty</p>
                <div class="difficulty-buttons">
                    <button class="game-button" onclick="startMemoryGame('easy')">Easy (4x4)</button>
                    <button class="game-button" onclick="startMemoryGame('medium')">Medium (6x6)</button>
                    <button class="game-button" onclick="startMemoryGame('hard')">Hard (8x8)</button>
                </div>
            </div>
        </div>
    `;
}

async function startMemoryGame(difficulty) {
    try {
        const response = await fetch(`${API_BASE}/memory/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ difficulty })
        });
        
        const data = await response.json();
        gameData.memory = data;
        gameData.memory.revealed = [];
        gameData.memory.matched = [];
        gameData.memory.moves = 0;
        gameData.memory.waitingForHide = false;
        
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <div class="game-container">
                <div class="game-info">
                    <div class="info-item">
                        <span class="info-label">Moves</span>
                        <span class="info-value" id="memory-moves">0</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Matches</span>
                        <span class="info-value" id="memory-matches">0 / ${data.total_pairs}</span>
                    </div>
                </div>
                <div class="game-board">
                    <div class="memory-grid" id="memory-grid" style="grid-template-columns: repeat(${data.grid_size}, 1fr);">
                        ${Array(data.grid_size * data.grid_size).fill(0).map((_, i) => 
                            `<div class="memory-card" onclick="flipMemoryCard(${i})" data-index="${i}">?</div>`
                        ).join('')}
                    </div>
                    <div id="memory-status" style="margin-top: 1rem; font-size: 1.1rem;"></div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error starting memory game:', error);
    }
}

async function flipMemoryCard(cardIndex) {
    if (gameData.memory.waitingForHide || 
        gameData.memory.revealed.includes(cardIndex) || 
        gameData.memory.matched.includes(cardIndex)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/memory/flip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                game_id: gameData.memory.game_id,
                card_index: cardIndex
            })
        });
        
        const data = await response.json();
        
        // Update card display
        const card = document.querySelector(`[data-index="${cardIndex}"]`);
        card.textContent = data.card_value;
        card.classList.add('flipped');
        
        if (data.status === 'match') {
            // Handle match
            setTimeout(() => {
                const firstCard = document.querySelector(`[data-index="${data.first_card || gameData.memory.firstCard}"]`);
                const secondCard = document.querySelector(`[data-index="${cardIndex}"]`);
                
                firstCard.classList.remove('flipped');
                firstCard.classList.add('matched');
                secondCard.classList.remove('flipped');
                secondCard.classList.add('matched');
                
                gameData.memory.matched.push(...[data.first_card || gameData.memory.firstCard, cardIndex]);
                gameData.memory.moves = data.moves;
                
                document.getElementById('memory-moves').textContent = data.moves;
                document.getElementById('memory-matches').textContent = `${data.matches} / ${gameData.memory.total_pairs}`;
                
                if (data.game_status === 'completed') {
                    document.getElementById('memory-status').innerHTML = 
                        '<span style="color: #28a745; font-weight: bold;">🎉 Congratulations! You completed the game!</span>';
                }
            }, 500);
            
        } else if (data.status === 'no_match') {
            // Handle no match
            gameData.memory.waitingForHide = true;
            gameData.memory.moves = data.moves;
            document.getElementById('memory-moves').textContent = data.moves;
            
            setTimeout(async () => {
                // Hide cards
                await fetch(`${API_BASE}/memory/hide-cards`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ game_id: gameData.memory.game_id })
                });
                
                const firstCard = document.querySelector(`[data-index="${data.first_card}"]`);
                const secondCard = document.querySelector(`[data-index="${cardIndex}"]`);
                
                firstCard.textContent = '?';
                firstCard.classList.remove('flipped');
                secondCard.textContent = '?';
                secondCard.classList.remove('flipped');
                
                gameData.memory.waitingForHide = false;
            }, 1500);
        } else {
            // First card of pair
            gameData.memory.firstCard = cardIndex;
        }
        
    } catch (error) {
        console.error('Error flipping memory card:', error);
    }
}

// Snake Game
function loadSnakeGame() {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div class="game-container">
            <div class="game-info">
                <div class="info-item">
                    <span class="info-label">Score</span>
                    <span class="info-value" id="snake-score">0</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Length</span>
                    <span class="info-value" id="snake-length">1</span>
                </div>
            </div>
            <div class="game-board">
                <canvas id="snake-canvas" class="snake-canvas" width="400" height="400"></canvas>
                <div style="margin-top: 1rem;">
                    <p>Use WASD or Arrow Keys to move</p>
                    <button class="game-button" onclick="startSnakeGame()">Start Game</button>
                    <button class="game-button" onclick="pauseSnakeGame()" id="pause-btn" style="display: none;">Pause</button>
                </div>
                <div id="snake-status" style="margin-top: 1rem; font-size: 1.1rem;"></div>
            </div>
        </div>
    `;
    
    setupSnakeControls();
}

async function startSnakeGame() {
    try {
        const response = await fetch(`${API_BASE}/snake/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        gameData.snake = data;
        gameData.snake.isRunning = true;
        gameData.snake.isPaused = false;
        
        document.getElementById('snake-score').textContent = '0';
        document.getElementById('snake-length').textContent = '1';
        document.getElementById('snake-status').textContent = '';
        
        // Show pause button, hide start button
        document.querySelector('button[onclick="startSnakeGame()"]').style.display = 'none';
        document.getElementById('pause-btn').style.display = 'inline-block';
        
        // Start game loop
        gameData.snakeInterval = setInterval(updateSnakeGame, 200);
        
        // Initial draw
        drawSnakeGame();
        
    } catch (error) {
        console.error('Error starting snake game:', error);
    }
}

function pauseSnakeGame() {
    if (gameData.snake && gameData.snake.isRunning) {
        if (gameData.snake.isPaused) {
            // Resume
            gameData.snake.isPaused = false;
            gameData.snakeInterval = setInterval(updateSnakeGame, 200);
            document.getElementById('pause-btn').textContent = 'Pause';
        } else {
            // Pause
            gameData.snake.isPaused = true;
            clearInterval(gameData.snakeInterval);
            document.getElementById('pause-btn').textContent = 'Resume';
        }
    }
}

async function updateSnakeGame() {
    if (!gameData.snake || !gameData.snake.isRunning || gameData.snake.isPaused) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/snake/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                game_id: gameData.snake.game_id,
                direction: gameData.snake.direction
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'game_over') {
            gameData.snake.isRunning = false;
            clearInterval(gameData.snakeInterval);
            
            document.getElementById('snake-status').innerHTML = 
                `<span style="color: #dc3545; font-weight: bold;">Game Over! Final Score: ${data.score}</span>`;
            
            // Show start button, hide pause button
            document.querySelector('button[onclick="startSnakeGame()"]').style.display = 'inline-block';
            document.getElementById('pause-btn').style.display = 'none';
        } else {
            gameData.snake.snake = data.snake;
            gameData.snake.food = data.food;
            gameData.snake.score = data.score;
            
            document.getElementById('snake-score').textContent = data.score;
            document.getElementById('snake-length').textContent = data.snake.length;
            
            drawSnakeGame();
        }
        
    } catch (error) {
        console.error('Error updating snake game:', error);
    }
}

function drawSnakeGame() {
    const canvas = document.getElementById('snake-canvas');
    const ctx = canvas.getContext('2d');
    const gridSize = 20;
    const tileCount = canvas.width / gridSize;
    
    // Clear canvas
    ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw snake
    ctx.fillStyle = '#007BFF';
    gameData.snake.snake.forEach((segment, index) => {
        if (index === 0) {
            // Head
            ctx.fillStyle = '#28A745';
        } else {
            ctx.fillStyle = '#007BFF';
        }
        ctx.fillRect(segment[0] * gridSize, segment[1] * gridSize, gridSize - 2, gridSize - 2);
    });
    
    // Draw food
    ctx.fillStyle = '#dc3545';
    ctx.fillRect(gameData.snake.food[0] * gridSize, gameData.snake.food[1] * gridSize, gridSize - 2, gridSize - 2);
}

function setupSnakeControls() {
    document.addEventListener('keydown', function(e) {
        if (!gameData.snake || !gameData.snake.isRunning || gameData.snake.isPaused) {
            return;
        }
        
        const key = e.key.toLowerCase();
        let newDirection = null;
        
        switch(key) {
            case 'w':
            case 'arrowup':
                newDirection = 'up';
                break;
            case 's':
            case 'arrowdown':
                newDirection = 'down';
                break;
            case 'a':
            case 'arrowleft':
                newDirection = 'left';
                break;
            case 'd':
            case 'arrowright':
                newDirection = 'right';
                break;
        }
        
        if (newDirection) {
            gameData.snake.direction = newDirection;
            e.preventDefault();
        }
    });
}

// Leaderboard functionality
async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_BASE}/leaderboard`);
        const data = await response.json();
        
        // Setup tab switching
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                const gameType = this.getAttribute('data-game');
                displayLeaderboard(data[gameType], gameType);
            });
        });
        
        // Display initial leaderboard
        displayLeaderboard(data.number_guess, 'number_guess');
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

function displayLeaderboard(scores, gameType) {
    const table = document.getElementById('leaderboard-table');
    
    if (!scores || scores.length === 0) {
        table.innerHTML = '<p style="text-align: center; color: var(--text-gray);">No scores yet!</p>';
        return;
    }
    
    let html = '';
    scores.forEach((score, index) => {
        let scoreText = '';
        if (gameType === 'number_guess') {
            scoreText = `${score.score} attempts (${score.difficulty})`;
        } else if (gameType === 'memory') {
            scoreText = `${score.moves} moves (${score.difficulty})`;
        } else if (gameType === 'snake') {
            scoreText = `${score.score} points`;
        }
        
        html += `
            <div class="leaderboard-row">
                <div class="rank">#${index + 1}</div>
                <div class="player-name">${score.name}</div>
                <div class="score">${scoreText}</div>
            </div>
        `;
    });
    
    table.innerHTML = html;
}

// Utility functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '100px',
        right: '20px',
        background: type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007BFF',
        color: 'white',
        padding: '1rem 1.5rem',
        borderRadius: '10px',
        zIndex: '3000',
        opacity: '0',
        transform: 'translateX(100%)',
        transition: 'all 0.3s ease'
    });
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('game-modal');
    if (e.target === modal) {
        closeGameModal();
    }
});

// Prevent modal close when clicking inside modal content
document.addEventListener('click', function(e) {
    if (e.target.closest('.modal-content')) {
        e.stopPropagation();
    }
});

