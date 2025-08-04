from flask import Blueprint, jsonify, request, session
import random
import uuid

games_bp = Blueprint('games', __name__)

# Game sessions storage (in production, use Redis or database)
game_sessions = {}

@games_bp.route('/number-guess/start', methods=['POST'])
def start_number_guess():
    """Start a new number guessing game"""
    game_id = str(uuid.uuid4())
    difficulty = request.json.get('difficulty', 'medium')
    
    # Set range based on difficulty
    ranges = {
        'easy': (1, 50),
        'medium': (1, 100),
        'hard': (1, 200)
    }
    min_num, max_num = ranges.get(difficulty, (1, 100))
    
    game_sessions[game_id] = {
        'type': 'number_guess',
        'target': random.randint(min_num, max_num),
        'min': min_num,
        'max': max_num,
        'attempts': 0,
        'max_attempts': 10,
        'difficulty': difficulty,
        'status': 'active'
    }
    
    return jsonify({
        'game_id': game_id,
        'min': min_num,
        'max': max_num,
        'max_attempts': 10,
        'difficulty': difficulty
    })

@games_bp.route('/number-guess/guess', methods=['POST'])
def make_guess():
    """Make a guess in number guessing game"""
    data = request.json
    game_id = data.get('game_id')
    guess = data.get('guess')
    
    if game_id not in game_sessions:
        return jsonify({'error': 'Game not found'}), 404
    
    game = game_sessions[game_id]
    if game['status'] != 'active':
        return jsonify({'error': 'Game is not active'}), 400
    
    game['attempts'] += 1
    target = game['target']
    
    if guess == target:
        game['status'] = 'won'
        return jsonify({
            'result': 'correct',
            'attempts': game['attempts'],
            'target': target,
            'status': 'won'
        })
    elif game['attempts'] >= game['max_attempts']:
        game['status'] = 'lost'
        return jsonify({
            'result': 'game_over',
            'attempts': game['attempts'],
            'target': target,
            'status': 'lost'
        })
    else:
        hint = 'higher' if guess < target else 'lower'
        return jsonify({
            'result': 'incorrect',
            'hint': hint,
            'attempts': game['attempts'],
            'remaining': game['max_attempts'] - game['attempts']
        })

@games_bp.route('/rps/play', methods=['POST'])
def play_rps():
    """Play Rock Paper Scissors"""
    data = request.json
    player_choice = data.get('choice')
    
    choices = ['rock', 'paper', 'scissors']
    if player_choice not in choices:
        return jsonify({'error': 'Invalid choice'}), 400
    
    computer_choice = random.choice(choices)
    
    # Determine winner
    if player_choice == computer_choice:
        result = 'tie'
    elif (player_choice == 'rock' and computer_choice == 'scissors') or \
         (player_choice == 'paper' and computer_choice == 'rock') or \
         (player_choice == 'scissors' and computer_choice == 'paper'):
        result = 'win'
    else:
        result = 'lose'
    
    return jsonify({
        'player_choice': player_choice,
        'computer_choice': computer_choice,
        'result': result
    })

@games_bp.route('/tictactoe/start', methods=['POST'])
def start_tictactoe():
    """Start a new Tic Tac Toe game"""
    game_id = str(uuid.uuid4())
    
    game_sessions[game_id] = {
        'type': 'tictactoe',
        'board': ['' for _ in range(9)],
        'current_player': 'X',
        'status': 'active',
        'winner': None
    }
    
    return jsonify({
        'game_id': game_id,
        'board': game_sessions[game_id]['board'],
        'current_player': 'X'
    })

@games_bp.route('/tictactoe/move', methods=['POST'])
def make_tictactoe_move():
    """Make a move in Tic Tac Toe"""
    data = request.json
    game_id = data.get('game_id')
    position = data.get('position')
    
    if game_id not in game_sessions:
        return jsonify({'error': 'Game not found'}), 404
    
    game = game_sessions[game_id]
    if game['status'] != 'active':
        return jsonify({'error': 'Game is not active'}), 400
    
    if game['board'][position] != '':
        return jsonify({'error': 'Position already taken'}), 400
    
    # Player move
    game['board'][position] = 'X'
    
    # Check for win or tie
    winner = check_tictactoe_winner(game['board'])
    if winner:
        game['status'] = 'finished'
        game['winner'] = winner
        return jsonify({
            'board': game['board'],
            'status': 'finished',
            'winner': winner
        })
    
    if '' not in game['board']:
        game['status'] = 'finished'
        game['winner'] = 'tie'
        return jsonify({
            'board': game['board'],
            'status': 'finished',
            'winner': 'tie'
        })
    
    # AI move
    ai_position = get_ai_move(game['board'])
    game['board'][ai_position] = 'O'
    
    # Check for win again
    winner = check_tictactoe_winner(game['board'])
    if winner:
        game['status'] = 'finished'
        game['winner'] = winner
    elif '' not in game['board']:
        game['status'] = 'finished'
        game['winner'] = 'tie'
    
    return jsonify({
        'board': game['board'],
        'status': game['status'],
        'winner': game.get('winner'),
        'ai_move': ai_position
    })

def check_tictactoe_winner(board):
    """Check for Tic Tac Toe winner"""
    winning_combinations = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],  # rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8],  # columns
        [0, 4, 8], [2, 4, 6]              # diagonals
    ]
    
    for combo in winning_combinations:
        if board[combo[0]] == board[combo[1]] == board[combo[2]] != '':
            return board[combo[0]]
    return None

def get_ai_move(board):
    """Simple AI for Tic Tac Toe"""
    # Try to win
    for i in range(9):
        if board[i] == '':
            board[i] = 'O'
            if check_tictactoe_winner(board) == 'O':
                board[i] = ''
                return i
            board[i] = ''
    
    # Try to block player
    for i in range(9):
        if board[i] == '':
            board[i] = 'X'
            if check_tictactoe_winner(board) == 'X':
                board[i] = ''
                return i
            board[i] = ''
    
    # Take center if available
    if board[4] == '':
        return 4
    
    # Take corners
    corners = [0, 2, 6, 8]
    available_corners = [i for i in corners if board[i] == '']
    if available_corners:
        return random.choice(available_corners)
    
    # Take any available space
    available = [i for i in range(9) if board[i] == '']
    return random.choice(available)

@games_bp.route('/memory/start', methods=['POST'])
def start_memory():
    """Start a new Memory Card game"""
    game_id = str(uuid.uuid4())
    difficulty = request.json.get('difficulty', 'medium')
    
    # Set grid size based on difficulty
    grid_sizes = {
        'easy': 4,    # 4x4 = 16 cards (8 pairs)
        'medium': 6,  # 6x6 = 36 cards (18 pairs)
        'hard': 8     # 8x8 = 64 cards (32 pairs)
    }
    grid_size = grid_sizes.get(difficulty, 6)
    total_cards = grid_size * grid_size
    pairs = total_cards // 2
    
    # Create card deck with pairs
    cards = list(range(1, pairs + 1)) * 2
    random.shuffle(cards)
    
    game_sessions[game_id] = {
        'type': 'memory',
        'cards': cards,
        'revealed': [False] * total_cards,
        'matched': [False] * total_cards,
        'grid_size': grid_size,
        'moves': 0,
        'matches': 0,
        'total_pairs': pairs,
        'status': 'active',
        'first_card': None,
        'second_card': None
    }
    
    return jsonify({
        'game_id': game_id,
        'grid_size': grid_size,
        'total_pairs': pairs,
        'difficulty': difficulty
    })

@games_bp.route('/memory/flip', methods=['POST'])
def flip_memory_card():
    """Flip a card in Memory game"""
    data = request.json
    game_id = data.get('game_id')
    card_index = data.get('card_index')
    
    if game_id not in game_sessions:
        return jsonify({'error': 'Game not found'}), 404
    
    game = game_sessions[game_id]
    if game['status'] != 'active':
        return jsonify({'error': 'Game is not active'}), 400
    
    if game['revealed'][card_index] or game['matched'][card_index]:
        return jsonify({'error': 'Card already revealed or matched'}), 400
    
    # Flip the card
    game['revealed'][card_index] = True
    card_value = game['cards'][card_index]
    
    if game['first_card'] is None:
        # First card of the pair
        game['first_card'] = card_index
        return jsonify({
            'card_index': card_index,
            'card_value': card_value,
            'status': 'first_card',
            'revealed': game['revealed']
        })
    else:
        # Second card of the pair
        game['second_card'] = card_index
        game['moves'] += 1
        
        first_value = game['cards'][game['first_card']]
        
        if first_value == card_value:
            # Match found
            game['matched'][game['first_card']] = True
            game['matched'][card_index] = True
            game['matches'] += 1
            
            # Check if game is complete
            if game['matches'] == game['total_pairs']:
                game['status'] = 'completed'
            
            game['first_card'] = None
            game['second_card'] = None
            
            return jsonify({
                'card_index': card_index,
                'card_value': card_value,
                'status': 'match',
                'moves': game['moves'],
                'matches': game['matches'],
                'game_status': game['status'],
                'matched': game['matched'],
                'revealed': game['revealed']
            })
        else:
            # No match - cards will be hidden again
            return jsonify({
                'card_index': card_index,
                'card_value': card_value,
                'status': 'no_match',
                'moves': game['moves'],
                'first_card': game['first_card'],
                'second_card': card_index,
                'revealed': game['revealed']
            })

@games_bp.route('/memory/hide-cards', methods=['POST'])
def hide_memory_cards():
    """Hide non-matching cards in Memory game"""
    data = request.json
    game_id = data.get('game_id')
    
    if game_id not in game_sessions:
        return jsonify({'error': 'Game not found'}), 404
    
    game = game_sessions[game_id]
    
    if game['first_card'] is not None and game['second_card'] is not None:
        # Hide the cards that didn't match
        game['revealed'][game['first_card']] = False
        game['revealed'][game['second_card']] = False
        game['first_card'] = None
        game['second_card'] = None
    
    return jsonify({
        'revealed': game['revealed']
    })

@games_bp.route('/snake/start', methods=['POST'])
def start_snake():
    """Start a new Snake game"""
    game_id = str(uuid.uuid4())
    
    game_sessions[game_id] = {
        'type': 'snake',
        'snake': [[10, 10]],  # Starting position
        'direction': 'right',
        'food': [15, 15],
        'score': 0,
        'status': 'active',
        'grid_size': 20
    }
    
    return jsonify({
        'game_id': game_id,
        'snake': game_sessions[game_id]['snake'],
        'food': game_sessions[game_id]['food'],
        'score': 0,
        'grid_size': 20
    })

@games_bp.route('/snake/move', methods=['POST'])
def move_snake():
    """Move snake and update game state"""
    data = request.json
    game_id = data.get('game_id')
    direction = data.get('direction')
    
    if game_id not in game_sessions:
        return jsonify({'error': 'Game not found'}), 404
    
    game = game_sessions[game_id]
    if game['status'] != 'active':
        return jsonify({'error': 'Game is not active'}), 400
    
    # Update direction (prevent reverse direction)
    opposite_directions = {
        'up': 'down', 'down': 'up',
        'left': 'right', 'right': 'left'
    }
    
    if direction and direction != opposite_directions.get(game['direction']):
        game['direction'] = direction
    
    # Move snake
    head = game['snake'][0].copy()
    
    if game['direction'] == 'up':
        head[1] -= 1
    elif game['direction'] == 'down':
        head[1] += 1
    elif game['direction'] == 'left':
        head[0] -= 1
    elif game['direction'] == 'right':
        head[0] += 1
    
    # Check wall collision
    if (head[0] < 0 or head[0] >= game['grid_size'] or 
        head[1] < 0 or head[1] >= game['grid_size']):
        game['status'] = 'game_over'
        return jsonify({
            'status': 'game_over',
            'score': game['score'],
            'reason': 'wall_collision'
        })
    
    # Check self collision
    if head in game['snake']:
        game['status'] = 'game_over'
        return jsonify({
            'status': 'game_over',
            'score': game['score'],
            'reason': 'self_collision'
        })
    
    # Add new head
    game['snake'].insert(0, head)
    
    # Check food collision
    if head == game['food']:
        game['score'] += 10
        # Generate new food
        while True:
            new_food = [random.randint(0, game['grid_size']-1), 
                       random.randint(0, game['grid_size']-1)]
            if new_food not in game['snake']:
                game['food'] = new_food
                break
    else:
        # Remove tail if no food eaten
        game['snake'].pop()
    
    return jsonify({
        'snake': game['snake'],
        'food': game['food'],
        'score': game['score'],
        'status': game['status']
    })

@games_bp.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get leaderboard data"""
    # In a real app, this would come from database
    # For demo purposes, return sample data
    leaderboard = {
        'number_guess': [
            {'name': 'Player1', 'score': 3, 'difficulty': 'hard'},
            {'name': 'Player2', 'score': 5, 'difficulty': 'medium'},
            {'name': 'Player3', 'score': 7, 'difficulty': 'easy'}
        ],
        'memory': [
            {'name': 'Player1', 'moves': 15, 'difficulty': 'hard'},
            {'name': 'Player2', 'moves': 20, 'difficulty': 'medium'},
            {'name': 'Player3', 'moves': 25, 'difficulty': 'easy'}
        ],
        'snake': [
            {'name': 'Player1', 'score': 150},
            {'name': 'Player2', 'score': 120},
            {'name': 'Player3', 'score': 100}
        ]
    }
    
    return jsonify(leaderboard)

