from flask import Blueprint, jsonify, request, session
from src.models.user import User, Player, GameScore, db
from sqlalchemy import desc

user_bp = Blueprint('user', __name__)

@user_bp.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@user_bp.route('/users', methods=['POST'])
def create_user():
    
    data = request.json
    user = User(username=data['username'], email=data['email'])
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

@user_bp.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())

@user_bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.json
    user.username = data.get('username', user.username)
    user.email = data.get('email', user.email)
    db.session.commit()
    return jsonify(user.to_dict())

@user_bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return '', 204

# Player routes
@user_bp.route('/players/register', methods=['POST'])
def register_player():
    """Register a new player"""
    data = request.json
    name = data.get('name')
    password = data.get('password')
    
    if not name or not password:
        return jsonify({'error': 'Name and password are required'}), 400
    
    # Check if player already exists
    existing_player = Player.query.filter_by(name=name).first()
    if existing_player:
        return jsonify({'error': 'Player name already exists'}), 400
    
    # Create new player
    player = Player(name=name, password=password)
    db.session.add(player)
    db.session.commit()
    
    # Store player in session
    session['player_id'] = player.id
    session['player_name'] = player.name
    
    return jsonify({
        'message': 'Player registered successfully',
        'player': player.to_dict()
    }), 201

@user_bp.route('/players/login', methods=['POST'])
def login_player():
    """Login a player"""
    data = request.json
    name = data.get('name')
    password = data.get('password')
    
    if not name or not password:
        return jsonify({'error': 'Name and password are required'}), 400
    
    # Find player
    player = Player.query.filter_by(name=name, password=password).first()
    if not player:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Store player in session
    session['player_id'] = player.id
    session['player_name'] = player.name
    
    return jsonify({
        'message': 'Login successful',
        'player': player.to_dict()
    })

@user_bp.route('/players/current', methods=['GET'])
def get_current_player():
    """Get current logged in player"""
    if 'player_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    player = Player.query.get(session['player_id'])
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    
    return jsonify(player.to_dict())

@user_bp.route('/players/logout', methods=['POST'])
def logout_player():
    """Logout current player"""
    session.pop('player_id', None)
    session.pop('player_name', None)
    return jsonify({'message': 'Logged out successfully'})

# Score routes
@user_bp.route('/scores/add', methods=['POST'])
def add_score():
    """Add a score for the current player"""
    if 'player_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    data = request.json
    game_type = data.get('game_type')
    points = data.get('points', 0)
    attempts = data.get('attempts', 0)
    difficulty = data.get('difficulty', 'medium')
    
    if not game_type:
        return jsonify({'error': 'Game type is required'}), 400
    
    # Create new score
    score = GameScore(
        player_id=session['player_id'],
        game_type=game_type,
        points=points,
        attempts=attempts,
        difficulty=difficulty
    )
    db.session.add(score)
    db.session.commit()
    
    return jsonify({
        'message': 'Score added successfully',
        'score': score.to_dict()
    }), 201

@user_bp.route('/leaderboard/<game_type>', methods=['GET'])
def get_game_leaderboard(game_type):
    """Get leaderboard for a specific game"""
    # Get top scores for the game type
    scores = GameScore.query.filter_by(game_type=game_type)\
                           .order_by(desc(GameScore.points))\
                           .limit(10)\
                           .all()
    
    return jsonify([score.to_dict() for score in scores])

@user_bp.route('/leaderboard', methods=['GET'])
def get_all_leaderboards():
    """Get leaderboards for all games"""
    game_types = ['number_guess', 'rps', 'tictactoe', 'memory', 'snake']
    leaderboards = {}
    
    for game_type in game_types:
        scores = GameScore.query.filter_by(game_type=game_type)\
                               .order_by(desc(GameScore.points))\
                               .limit(10)\
                               .all()
        leaderboards[game_type] = [score.to_dict() for score in scores]
    
    return jsonify(leaderboards)
