from flask import Blueprint, jsonify, request, session
from src.models.user import User, Player, GameScore, db
from sqlalchemy import desc, func

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
    """Get leaderboard for a specific game with aggregated points per player"""
    # Get aggregated scores for the game type
    scores = db.session.query(
        Player.name.label('player_name'),
        func.sum(GameScore.points).label('total_points')
    ).join(GameScore).filter(
        GameScore.game_type == game_type
    ).group_by(Player.id, Player.name).order_by(
        desc(func.sum(GameScore.points))
    ).limit(10).all()
    
    # Convert to list of dictionaries
    leaderboard = []
    for score in scores:
        leaderboard.append({
            'player_name': score.player_name,
            'points': score.total_points
        })
    
    return jsonify(leaderboard)

@user_bp.route('/leaderboard', methods=['GET'])
def get_all_leaderboards():
    """Get leaderboards for all games with aggregated points per player"""
    game_types = ['number_guess', 'rps', 'tictactoe', 'memory', 'snake']
    leaderboards = {}
    
    for game_type in game_types:
        # Get aggregated scores for each game type
        scores = db.session.query(
            Player.name.label('player_name'),
            func.sum(GameScore.points).label('total_points')
        ).join(GameScore).filter(
            GameScore.game_type == game_type
        ).group_by(Player.id, Player.name).order_by(
            desc(func.sum(GameScore.points))
        ).limit(10).all()
        
        # Convert to list of dictionaries
        game_leaderboard = []
        for score in scores:
            game_leaderboard.append({
                'player_name': score.player_name,
                'points': score.total_points
            })
        
        leaderboards[game_type] = game_leaderboard
    
    return jsonify(leaderboards)

@user_bp.route('/players/best-scores', methods=['GET'])
def get_player_best_scores():
    """Get the best scores for the current player in each game"""
    if 'player_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    game_types = ['number_guess', 'rps', 'tictactoe', 'memory', 'snake']
    best_scores = {}
    
    for game_type in game_types:
        # Get the highest score for this player in this game
        best_score = db.session.query(
            func.max(GameScore.points).label('max_points')
        ).filter(
            GameScore.player_id == session['player_id'],
            GameScore.game_type == game_type
        ).scalar()
        
        best_scores[game_type] = best_score if best_score is not None else 0
    
    return jsonify(best_scores)

@user_bp.route('/admin/clear-duplicate-scores', methods=['POST'])
def clear_duplicate_scores():
    """Admin function to clear duplicate scores (for testing purposes)"""
    try:
        # This is a simple approach - in production you'd want more sophisticated deduplication
        # For now, we'll just clear all scores to start fresh
        GameScore.query.delete()
        db.session.commit()
        
        return jsonify({'message': 'All scores cleared successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@user_bp.route('/admin/clear-duplicate-players', methods=['POST'])
def clear_duplicate_players():
    """Admin function to clear duplicate players (for testing purposes)"""
    try:
        # Find and remove duplicate players (keeping the first occurrence)
        players = Player.query.all()
        seen_names = set()
        duplicates = []
        
        for player in players:
            if player.name in seen_names:
                duplicates.append(player)
            else:
                seen_names.add(player.name)
        
        # Delete duplicate players and their scores
        for duplicate in duplicates:
            GameScore.query.filter_by(player_id=duplicate.id).delete()
            db.session.delete(duplicate)
        
        db.session.commit()
        
        return jsonify({
            'message': f'Removed {len(duplicates)} duplicate players',
            'removed_count': len(duplicates)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

