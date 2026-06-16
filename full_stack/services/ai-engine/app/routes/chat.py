import json
import openai
from flask import Blueprint, request, Response, stream_with_context, abort
from .. import config
from ..auth import get_user_id
from ..db import get_db
from .. import embeddings as emb
from .. import structured

chat_bp = Blueprint('chat', __name__)

SOURCE_ROUTES = {
    'interventions':    '/interventions/{}',
    'pneu_inspections': '/pneus/{}',
    'composants':       '/composants/{}',
    'suivi_vidanges':   '/vidanges/{}',
    'vehicules':        '/vehicules/{}',
}


def _source_url(source_table: str, source_id: int) -> str:
    return SOURCE_ROUTES.get(source_table, '/{}').format(source_id)


def _get_or_create_conversation(user_id: int, conversation_id: int | None) -> int:
    with get_db() as conn:
        with conn.cursor() as cur:
            if conversation_id is not None:
                cur.execute(
                    "SELECT id FROM ai_conversations WHERE id=%s AND user_id=%s",
                    (conversation_id, user_id))
                row = cur.fetchone()
                if not row:
                    abort(404, description='Conversation not found')
                return row[0]
            else:
                cur.execute(
                    "INSERT INTO ai_conversations (user_id) VALUES (%s) RETURNING id",
                    (user_id,))
                return cur.fetchone()[0]


def _insert_message(conversation_id: int, role: str, content: str, sources: list) -> None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO ai_messages (conversation_id, role, content, sources) "
                "VALUES (%s, %s, %s, %s::jsonb)",
                (conversation_id, role, content, json.dumps(sources)))
            cur.execute(
                "UPDATE ai_conversations SET updated_at=now() WHERE id=%s",
                (conversation_id,))


def _update_title(conversation_id: int, first_message: str) -> None:
    title = (first_message[:40] + '…') if len(first_message) > 40 else first_message
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE ai_conversations SET titre=%s WHERE id=%s "
                "AND titre='Nouvelle conversation'",
                (title, conversation_id))


def _sse(chunk: dict) -> str:
    return f"data: {json.dumps(chunk)}\n\n"


@chat_bp.route('/ai/chat', methods=['POST'])
def chat():
    user_id = get_user_id()
    body = request.get_json(silent=True) or {}
    message = (body.get('message') or '').strip()
    if not message:
        abort(400, description='message_invalid')
    if len(message) > 2000:
        abort(400, description='message_invalid')

    conversation_id = body.get('conversation_id')
    conv_id = _get_or_create_conversation(user_id, conversation_id)
    _insert_message(conv_id, 'user', message, [])
    _update_title(conv_id, message)

    def generate():
        full_response = ''
        source_chunks = []
        try:
            passages = emb.search_similar(message)
            fleet_summary = emb.get_fleet_summary()
            structured_text, structured_sources = structured.run_intent(message)
            if not passages and not fleet_summary and not structured_text:
                yield _sse({'type': 'text', 'content': 'Aucune donnée trouvée pour cette question. Reformulez ou précisez le numéro de véhicule ou la période.'})
                yield _sse({'type': 'done'})
                _insert_message(conv_id, 'assistant', 'Aucune donnée trouvée.', [])
                return

            passages_text = '\n\n'.join(
                f"[{p['source_table']} #{p['source_id']}]: {p['contenu']}"
                for p in passages)
            context_parts = []
            if fleet_summary:
                context_parts.append(f"Statistiques du parc :\n{fleet_summary}")
            if structured_text:
                context_parts.append(f"== Données structurées (DB) ==\n{structured_text}")
            if passages_text:
                context_parts.append(f"Données détaillées :\n{passages_text}")
            context_text = '\n\n'.join(context_parts)
            system_prompt = (
                "Tu es l'assistant IA de INTERSIG FleetTracker, spécialisé dans le suivi du parc "
                "de véhicules. Réponds en français, de façon concise et factuelle. "
                "Cite les données fournies. Ne réponds qu'aux questions relatives au parc. "
                "Pour les questions de dénombrement (combien de véhicules, camions, composants…), "
                "utilise les Statistiques du parc fournies. "
                "Pour les questions sur un véhicule identifié par son code (ex. CAM-403) ou par "
                "son matricule, ou pour les questions « qui est le chauffeur de X », utilise "
                "prioritairement le bloc de contexte préfixé « Données structurées (DB) ». "
                "Si la phrase « Chauffeur non renseigné dans la base » apparaît, recopie-la "
                "telle quelle.\n\n"
                f"Données disponibles :\n{context_text}")

            client_ai = openai.OpenAI(base_url=config.OLLAMA_BASE_URL, api_key='ollama')
            stream = client_ai.chat.completions.create(
                model=config.OLLAMA_MODEL,
                messages=[
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user',   'content': message}],
                stream=True)

            for chunk in stream:
                token = chunk.choices[0].delta.content or ''
                if token:
                    full_response += token
                    yield _sse({'type': 'text', 'content': token})

            for p in passages:
                src = {
                    'title': f"{p['source_table'].replace('_', ' ').title()} #{p['source_id']}",
                    'url':   _source_url(p['source_table'], p['source_id'])}
                source_chunks.append(src)
                yield _sse({'type': 'source', 'source': src})

            for src in structured_sources:
                source_chunks.append(src)
                yield _sse({'type': 'source', 'source': src})

            _insert_message(conv_id, 'assistant', full_response, source_chunks)
            yield _sse({'type': 'done'})

        except Exception:
            yield _sse({'type': 'error', 'content': 'Erreur interne du service IA.'})
            yield _sse({'type': 'done'})

    response = Response(
        stream_with_context(generate()),
        mimetype='text/event-stream')
    response.headers['X-Conversation-Id'] = str(conv_id)
    response.headers['X-Accel-Buffering'] = 'no'
    response.headers['Cache-Control'] = 'no-cache'
    return response
