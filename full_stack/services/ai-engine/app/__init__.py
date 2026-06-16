from flask import Flask
from flask_cors import CORS


def create_app(config_overrides: dict | None = None) -> Flask:
    app = Flask(__name__)
    CORS(app)

    if config_overrides:
        app.config.update(config_overrides)

    from .routes.health import health_bp
    from .routes.chat import chat_bp
    from .routes.reindex import reindex_bp
    from .routes.conversations import conversations_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(reindex_bp)
    app.register_blueprint(conversations_bp)

    return app
