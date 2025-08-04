// Global variables
let currentGame = null;
let gameData = {};
let currentPlayer = null;

// API base URL
const API_BASE = '/api/games';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    loadLeaderboard();
    initializeAnimations();
    checkCurrentPlayer();
    loadPlayerBestScores();
});

// Custom smooth scroll function with better control
function smoothScrollTo(target) {
    const targetPosition = target.offsetTop - 80; // Offset for fixed header
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = 1000; // 1 second duration for smooth scroll
    let start = null;
    
    function animation(currentTime) {
        if (start === null) start = currentTime;
        const timeElapsed = currentTime - start;
        const run = ease(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(animation);
    }
    
    // Easing function for smooth animation
    function ease(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }
    
    requestAnimationFrame(animation);
}

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
                
                // Custom smooth scroll to section
                smoothScrollTo(targetSection);
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
    const gamesSection = document.getElementById('games');
    if (gamesSection) {
        smoothScrollTo(gamesSection);
    }
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

// Player management
async function checkCurrentPlayer() {
    try {
        const response = await fetch('/api/players/current');
        if (response.ok) {
            const data = await response.json();
            currentPlayer = data;
            updatePlayerUI();
        }
    } catch (error) {
        console.log('No player logged in');
    }
}

function updatePlayerUI() {
    // Show/hide profile link based on login status
    const profileLink = document.getElementById('profile-link');
    if (currentPlayer && profileLink) {
        profileLink.style.display = 'block';
    } else if (profileLink) {
        profileLink.style.display = 'none';
    }
    console.log('Current player:', currentPlayer);
    loadPlayerBestScores();
}

// Load player's best scores for each game
async function loadPlayerBestScores() {
    if (!currentPlayer) {
        // Reset all points to 0 if no player logged in
        document.getElementById('number-guess-points').textContent = '0 pts';
        document.getElementById('rps-points').textContent = '0 pts';
        document.getElementById('tictactoe-points').textContent = '0 pts';
        document.getElementById('memory-points').textContent = '0 pts';
        document.getElementById('snake-points').textContent = '0 pts';
        return;
    }
    
    try {
        const response = await fetch('/api/leaderboard');
        const data = await response.json();
        
        // Find current player's best scores
        const gameTypes = ['number_guess', 'rps', 'tictactoe', 'memory', 'snake'];
        gameTypes.forEach(gameType => {
            const scores = data[gameType] || [];
            const playerScore = scores.find(score => score.player_name === currentPlayer.name);
            const points = playerScore ? playerScore.points : 0;
            
            const gameKey = gameType.replace('_', '-');
            const pointsElement = document.getElementById(`${gameKey}-points`);
            if (pointsElement) {
                pointsElement.textContent = `${points} pts`;
            }
        });
    } catch (error) {
        console.error('Error loading player scores:', error);
    }
}

// Create Player Modal Functions
function showCreatePlayerModal() {
    const modal = document.getElementById('create-player-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Clear previous inputs
    document.getElementById('player-name-input').value = '';
    document.getElementById('player-password-input').value = '';
    document.getElementById('registration-feedback').innerHTML = '';
}

function closeCreatePlayerModal() {
    const modal = document.getElementById('create-player-modal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

async function registerPlayer() {
    const nameInput = document.getElementById('player-name-input');
    const passwordInput = document.getElementById('player-password-input');
    const feedback = document.getElementById('registration-feedback');
    
    const name = nameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!name || !password) {
        feedback.innerHTML = '<span style="color: #dc3545;">Please enter name and password!</span>';
        return;
    }
    
    try {
        const response = await fetch('/api/players/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentPlayer = data.player;
            // Save to local storage as backup
            savePlayerToStorage({ name, password });
            feedback.innerHTML = '<span style="color: #28a745;">Registration successful! You are now logged in.</span>';
            nameInput.value = '';
            passwordInput.value = '';
            updatePlayerUI();
            loadLeaderboard(); // Refresh leaderboard
            
            // Close modal after 2 seconds
            setTimeout(() => {
                closeCreatePlayerModal();
            }, 2000);
        } else {
            if (data.error === 'Player name already exists') {
                feedback.innerHTML = '<span style="color: #dc3545;">This Player Name has been taken. Please make another one.</span>';
            } else {
                feedback.innerHTML = `<span style="color: #dc3545;">${data.error}</span>`;
            }
        }
    } catch (error) {
        console.error('Error registering player:', error);
        // Fallback to local storage
        savePlayerToStorage({ name, password });
        currentPlayer = { name };
        feedback.innerHTML = '<span style="color: #28a745;">Registration successful! You are now logged in.</span>';
        nameInput.value = '';
        passwordInput.value = '';
        updatePlayerUI();
        
        setTimeout(() => {
            closeCreatePlayerModal();
        }, 2000);
    }
}

async function addScore(gameType, points, attempts = 0, difficulty = 'medium') {
    if (!currentPlayer) {
        console.log('No player logged in, score not saved');
        return;
    }
    
    try {
        const response = await fetch('/api/scores/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                game_type: gameType,
                points: points,
                attempts: attempts,
                difficulty: difficulty
            })
        });
        
        if (response.ok) {
            console.log('Score added successfully');
            loadLeaderboard(); // Refresh leaderboard
            loadPlayerBestScores(); // Refresh player's best scores
        }
    } catch (error) {
        console.error('Error adding score:', error);
    }
}

// Local Storage Functions for Player Data
function getPlayersFromStorage() {
    const players = localStorage.getItem('cagz_players');
    return players ? JSON.parse(players) : [];
}

function savePlayerToStorage(player) {
    const players = getPlayersFromStorage();
    players.push(player);
    localStorage.setItem('cagz_players', JSON.stringify(players));
}

function updatePlayerPassword(playerName, newPassword) {
    const players = getPlayersFromStorage();
    const playerIndex = players.findIndex(p => p.name === playerName);
    if (playerIndex !== -1) {
        players[playerIndex].password = newPassword;
        localStorage.setItem('cagz_players', JSON.stringify(players));
        return true;
    }
    return false;
}

// Login Modal Functions
function showLoginModal() {
    closeAllModals();
    const modal = document.getElementById('login-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Clear previous inputs
    document.getElementById('login-name-input').value = '';
    document.getElementById('login-password-input').value = '';
    document.getElementById('login-feedback').innerHTML = '';
}

function closeLoginModal() {
    const modal = document.getElementById('login-modal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function loginPlayer() {
    const nameInput = document.getElementById('login-name-input');
    const passwordInput = document.getElementById('login-password-input');
    const feedback = document.getElementById('login-feedback');
    
    const name = nameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!name || !password) {
        feedback.innerHTML = '<span style="color: #dc3545;">Please enter both name and password!</span>';
        return;
    }
    
    // Check local storage first
    const players = getPlayersFromStorage();
    const player = players.find(p => p.name === name && p.password === password);
    
    if (player) {
        currentPlayer = { name: player.name };
        feedback.innerHTML = '<span style="color: #28a745;">Login successful!</span>';
        updatePlayerUI();
        
        setTimeout(() => {
            closeLoginModal();
        }, 1500);
    } else {
        feedback.innerHTML = '<span style="color: #dc3545;">Invalid player name or password!</span>';
    }
}

// Forgot Password Modal Functions
function showForgotPasswordModal() {
    closeAllModals();
    const modal = document.getElementById('forgot-password-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeForgotPasswordModal() {
    const modal = document.getElementById('forgot-password-modal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Player Selection Modal Functions
let selectedPlayerData = null;
let selectedAction = null;

function selectPlayer(player) {
    selectedPlayerData = player;
    showPlayerSelectionModal();
}

function showPlayerSelectionModal() {
    closeAllModals();
    const modal = document.getElementById('player-selection-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    document.getElementById('selected-player-name').textContent = selectedPlayerData.name;
    document.getElementById('selection-feedback').innerHTML = '';
    
    selectedAction = null;
}

function closePlayerSelectionModal() {
    const modal = document.getElementById('player-selection-modal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function chooseAction(action) {
    selectedAction = action;
    const feedback = document.getElementById('selection-feedback');
    feedback.innerHTML = `<span style="color: #28a745;">Selected: ${action === 'see' ? 'See Password' : 'Change Password'}</span>`;
}

function selectPlayerAction(action) {
    selectedAction = action;
    // Simplified - directly proceed with the action
    if (action === 'see') {
        showPasswordShowModal();
    } else if (action === 'change') {
        showChangePasswordModal();
    }
}

// Password Show Modal Functions
function showPasswordShowModal() {
    closeAllModals();
    const modal = document.getElementById('password-show-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    document.getElementById('displayed-password').textContent = selectedPlayerData.password;
}

function closePasswordShowModal() {
    const modal = document.getElementById('password-show-modal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Change Password Modal Functions
function showChangePasswordModal() {
    closeAllModals();
    const modal = document.getElementById('change-password-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    document.getElementById('new-password-input').value = '';
    document.getElementById('change-password-feedback').innerHTML = '';
}

function closeChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function updatePassword() {
    const newPasswordInput = document.getElementById('new-password-input');
    const feedback = document.getElementById('change-password-feedback');
    
    const newPassword = newPasswordInput.value.trim();
    
    if (!newPassword) {
        feedback.innerHTML = '<span style="color: #dc3545;">Please enter a new password!</span>';
        return;
    }
    
    const success = updatePlayerPassword(selectedPlayerData.name, newPassword);
    
    if (success) {
        feedback.innerHTML = '<span style="color: #28a745;">Password updated successfully!</span>';
        setTimeout(() => {
            closeChangePasswordModal();
            showLoginModal();
        }, 2000);
    } else {
        feedback.innerHTML = '<span style="color: #dc3545;">Error updating password!</span>';
    }
}

// Utility function to close all modals
function closeAllModals() {
    const modals = [
        'create-player-modal',
        'login-modal', 
        'forgot-password-modal',
        'search-results-modal',
        'player-selection-modal',
        'password-show-modal',
        'change-password-modal'
    ];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    });
    
    document.body.style.overflow = 'auto';
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
            
            // Calculate points based on attempts and difficulty
            const maxAttempts = gameData.numberGuess.max_attempts || 10;
            const points = Math.max(1, maxAttempts - data.attempts + 1);
            await addScore('number_guess', points, data.attempts, gameData.numberGuess.difficulty);
            
        } else if (data.result === 'game_over') {
            feedback.innerHTML = `
                <div style="color: #dc3545; font-weight: bold;">
                    😞 Game Over! The number was ${data.target}
                </div>
            `;
            guessInput.disabled = true;
            // Add 0 points for game over
            await addScore('number_guess', 0, data.attempts, gameData.numberGuess.difficulty);
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
        setTimeout(async () => {
            let resultText = '';
            let resultColor = '';
            let points = 0;
            
            if (data.result === 'win') {
                resultText = '🎉 You Win!';
                resultColor = '#28a745';
                points = 1;
                gameData.rps.playerScore++;
                document.getElementById('player-score').textContent = gameData.rps.playerScore;
            } else if (data.result === 'lose') {
                resultText = '😞 You Lose!';
                resultColor = '#dc3545';
                points = 0;
                gameData.rps.computerScore++;
                document.getElementById('computer-score').textContent = gameData.rps.computerScore;
            } else {
                resultText = '🤝 It\'s a Tie!';
                resultColor = '#ffc107';
                points = 0;
            }
            
            resultDiv.innerHTML += `
                <div style="color: ${resultColor}; font-weight: bold; font-size: 1.3rem;">
                    ${resultText}
                </div>
            `;
            
            // Add score
            await addScore('rps', points, 1, 'normal');
            
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
            
            let points = 0;
            if (data.winner === 'X') {
                statusDiv.innerHTML = '<span style="color: #28a745; font-weight: bold;">🎉 You Win!</span>';
                points = 3;
            } else if (data.winner === 'O') {
                statusDiv.innerHTML = '<span style="color: #dc3545; font-weight: bold;">😞 Computer Wins!</span>';
                points = 0;
            } else {
                statusDiv.innerHTML = '<span style="color: #ffc107; font-weight: bold;">🤝 It\'s a Tie!</span>';
                points = 1;
            }
            
            // Add score
            await addScore('tictactoe', points, 1, 'normal');
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
                    
                    // Calculate points based on moves and difficulty
                    const maxMoves = gameData.memory.total_pairs * 3; // Generous max moves
                    const points = Math.max(1, maxMoves - data.moves + 1);
                    addScore('memory', points, data.moves, gameData.memory.difficulty);
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
            
            // Add score
            await addScore('snake', data.score, 1, 'normal');
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
        const response = await fetch('/api/leaderboard');
        const data = await response.json();
        
        // Update leaderboard tabs to include all games
        const tabsContainer = document.querySelector('.leaderboard-tabs');
        if (tabsContainer) {
            tabsContainer.innerHTML = `
                <button class="tab-button active" data-game="number_guess">Number Guess</button>
                <button class="tab-button" data-game="rps">Rock Paper Scissors</button>
                <button class="tab-button" data-game="tictactoe">Tic Tac Toe</button>
                <button class="tab-button" data-game="memory">Memory</button>
                <button class="tab-button" data-game="snake">Snake</button>
            `;
            
            // Add click listeners to tabs
            document.querySelectorAll('.tab-button').forEach(button => {
                button.addEventListener('click', function() {
                    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    displayLeaderboard(data[this.dataset.game] || [], this.dataset.game);
                });
            });
        }
        
        // Display first game's leaderboard by default
        displayLeaderboard(data.number_guess || [], 'number_guess');
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

function displayLeaderboard(scores, gameType) {
    const tableContainer = document.getElementById('leaderboard-table');
    if (!tableContainer) return;
    
    if (scores.length === 0) {
        tableContainer.innerHTML = '<p style="text-align: center; color: var(--text-gray);">No scores yet. Be the first to play!</p>';
        return;
    }
    
    // Group scores by player and sum their points
    const playerTotals = {};
    scores.forEach(score => {
        if (!playerTotals[score.player_name]) {
            playerTotals[score.player_name] = 0;
        }
        playerTotals[score.player_name] += score.points;
    });
    
    // Convert to array and sort by total points
    const sortedPlayers = Object.entries(playerTotals)
        .map(([name, points]) => ({ player_name: name, points }))
        .sort((a, b) => b.points - a.points);
    
    let html = '';
    sortedPlayers.forEach((player, index) => {
        html += `
            <div class="leaderboard-row">
                <div class="rank">#${index + 1}</div>
                <div class="player-name">${player.player_name}</div>
                <div class="score">${player.points} pts</div>
            </div>
        `;
    });
    
    tableContainer.innerHTML = html;
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
    const gameModal = document.getElementById('game-modal');
    const createPlayerModal = document.getElementById('create-player-modal');
    const loginModal = document.getElementById('login-modal');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    const searchResultsModal = document.getElementById('search-results-modal');
    const playerSelectionModal = document.getElementById('player-selection-modal');
    const passwordShowModal = document.getElementById('password-show-modal');
    const changePasswordModal = document.getElementById('change-password-modal');
    
    if (e.target === gameModal) {
        closeGameModal();
    }
    if (e.target === createPlayerModal) {
        closeCreatePlayerModal();
    }
    if (e.target === loginModal) {
        closeLoginModal();
    }
    if (e.target === forgotPasswordModal) {
        closeForgotPasswordModal();
    }
    if (e.target === searchResultsModal) {
        closeSearchResultsModal();
    }
    if (e.target === playerSelectionModal) {
        closePlayerSelectionModal();
    }
    if (e.target === passwordShowModal) {
        closePasswordShowModal();
    }
    if (e.target === changePasswordModal) {
        closeChangePasswordModal();
    }
});

// Prevent modal close when clicking inside modal content
document.addEventListener('click', function(e) {
    if (e.target.closest('.modal-content')) {
        e.stopPropagation();
    }
});



// Mobile navigation toggle functionality
document.addEventListener("DOMContentLoaded", function() {
    const navToggle = document.querySelector(".nav-toggle");
    const navLinks = document.querySelector(".nav-links");

    if (navToggle && navLinks) {
        navToggle.addEventListener("click", function() {
            navLinks.classList.toggle("active");
            navToggle.classList.toggle("open");
        });

        // Close nav menu when a link is clicked
        navLinks.querySelectorAll(".nav-link").forEach(link => {
            link.addEventListener("click", function() {
                navLinks.classList.remove("active");
                navToggle.classList.remove("open");
            });
        });
    }
});




// Global variables for password recovery flow
let foundPlayerId = null;

// Modal management functions
function showProfileModal() {
    if (!currentPlayer) {
        alert('Please log in first');
        return;
    }
    loadPlayerProfile();
    document.getElementById('profile-modal').style.display = 'flex';
}

function closeProfileModal() {
    document.getElementById('profile-modal').style.display = 'none';
}

function showAuthKeyModal() {
    document.getElementById('auth-key-modal').style.display = 'flex';
}

function closeAuthKeyModal() {
    document.getElementById('auth-key-modal').style.display = 'none';
}

function showChangePasswordModal() {
    document.getElementById('change-password-modal').style.display = 'flex';
}

function closeChangePasswordModal() {
    document.getElementById('change-password-modal').style.display = 'none';
}

// Load player profile data
async function loadPlayerProfile() {
    try {
        const response = await fetch('/api/players/profile');
        if (response.ok) {
            const player = await response.json();
            document.getElementById('profile-name').value = player.name;
            document.getElementById('profile-password').value = player.password;
            document.getElementById('profile-auth-key').value = player.authorized_key;
        } else {
            alert('Failed to load profile');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Error loading profile');
    }
}

// Password visibility toggle functions
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('profile-password');
    const eyeIcon = document.getElementById('password-eye');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

function toggleAuthKeyProfileVisibility() {
    const authKeyInput = document.getElementById('profile-auth-key');
    const eyeIcon = document.getElementById('auth-key-profile-eye');
    
    if (authKeyInput.type === 'password') {
        authKeyInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        authKeyInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

function toggleAuthKeyVisibility() {
    const authKeyInput = document.getElementById('auth-key-input');
    const eyeIcon = document.getElementById('auth-key-eye');
    
    if (authKeyInput.type === 'password') {
        authKeyInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        authKeyInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}
