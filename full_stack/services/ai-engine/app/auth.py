from flask import request, abort


def get_user_id() -> int:
    """Read X-Authenticated-User-Id injected by gateway-proxy. Aborts 401 if absent."""
    header = request.headers.get('X-Authenticated-User-Id')
    if not header:
        abort(401, description='Missing X-Authenticated-User-Id')
    try:
        return int(header.strip())
    except ValueError:
        abort(401, description='Invalid X-Authenticated-User-Id')


def get_user_roles() -> list[str]:
    """Read X-Authenticated-User-Roles. Returns empty list if absent."""
    header = request.headers.get('X-Authenticated-User-Roles', '')
    return [r.strip() for r in header.split(',') if r.strip()]
