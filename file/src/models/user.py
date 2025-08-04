from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)

    def __repr__(self):
        return f'<User {self.username}>'

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email
        }

class Player(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to game scores
    scores = db.relationship('GameScore', backref='player', lazy=True)

    def __repr__(self):
        return f'<Player {self.name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at.isoformat()
        }

class GameScore(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    player_id = db.Column(db.Integer, db.ForeignKey('player.id'), nullable=False)
    game_type = db.Column(db.String(50), nullable=False)  # 'number_guess', 'rps', 'tictactoe', 'memory', 'snake'
    points = db.Column(db.Integer, default=0)
    attempts = db.Column(db.Integer, default=0)
    difficulty = db.Column(db.String(20), default='medium')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<GameScore {self.game_type}: {self.points}>'

    def to_dict(self):
        return {
            'id': self.id,
            'player_id': self.player_id,
            'player_name': self.player.name,
            'game_type': self.game_type,
            'points': self.points,
            'attempts': self.attempts,
            'difficulty': self.difficulty,
            'created_at': self.created_at.isoformat()
        }
