from flask import Blueprint, jsonify, abort
from ..auth import get_user_id
from ..db import get_db

conversations_bp = Blueprint('conversations', __name__)


@conversations_bp.route('/ai/conversations', methods=['GET'])
def list_conversations():
    user_id = get_user_id()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT c.id, c.titre, c.favori, c.updated_at,
                       (SELECT LEFT(m.content, 40)
                        FROM ai_messages m
                        WHERE m.conversation_id = c.id
                        ORDER BY m.created_at DESC LIMIT 1) AS last_message
                FROM ai_conversations c
                WHERE c.user_id = %s
                ORDER BY c.updated_at DESC
                """, (user_id,))
            rows = cur.fetchall()
    return jsonify([{
        'id': r[0], 'titre': r[1], 'favori': r[2],
        'updatedAt': r[3].isoformat() if r[3] else None,
        'lastMessage': r[4]
    } for r in rows])


@conversations_bp.route('/ai/conversations', methods=['POST'])
def create_conversation():
    user_id = get_user_id()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO ai_conversations (user_id) VALUES (%s) RETURNING id, titre",
                (user_id,))
            row = cur.fetchone()
    return jsonify({'id': row[0], 'titre': row[1]}), 201


@conversations_bp.route('/ai/conversations/<int:conv_id>/messages', methods=['GET'])
def get_messages(conv_id: int):
    user_id = get_user_id()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM ai_conversations WHERE id=%s AND user_id=%s",
                (conv_id, user_id))
            if not cur.fetchone():
                abort(404, description='Conversation not found')
            cur.execute(
                "SELECT role, content, sources, created_at "
                "FROM ai_messages WHERE conversation_id=%s ORDER BY created_at ASC",
                (conv_id,))
            rows = cur.fetchall()
    return jsonify([{
        'role': r[0], 'content': r[1],
        'sources': r[2] or [],
        'timestamp': r[3].isoformat() if r[3] else None
    } for r in rows])


@conversations_bp.route('/ai/conversations/<int:conv_id>', methods=['DELETE'])
def delete_conversation(conv_id: int):
    user_id = get_user_id()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM ai_conversations WHERE id=%s AND user_id=%s",
                (conv_id, user_id))
            if not cur.fetchone():
                abort(404, description='Conversation not found')
            # ai_messages rows cascade-delete via ON DELETE CASCADE (V118).
            cur.execute("DELETE FROM ai_conversations WHERE id=%s", (conv_id,))
    return '', 204


@conversations_bp.route('/ai/conversations/<int:conv_id>/pin', methods=['PATCH'])
def toggle_pin(conv_id: int):
    user_id = get_user_id()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM ai_conversations WHERE id=%s AND user_id=%s",
                (conv_id, user_id))
            if not cur.fetchone():
                abort(404, description='Conversation not found')
            cur.execute(
                "UPDATE ai_conversations SET favori=NOT favori WHERE id=%s RETURNING favori",
                (conv_id,))
            new_favori = cur.fetchone()[0]
    return jsonify({'id': conv_id, 'favori': new_favori})
