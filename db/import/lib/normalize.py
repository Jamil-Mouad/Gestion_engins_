"""
Normalisation helpers: French labels → DB enums, cleaning, category mapping.
"""

import re
from datetime import datetime, date
from typing import Optional

# ---- vehicle type mapping ------------------------------------------------
_TYPE_MAP = {
    "camion": "camion",
    "tracteur": "camion",           # tracteur routier → camion
    "semi remorque": "semi_remorque",
    "semi-remorque": "semi_remorque",
    "chariot élévateur": "chariot",
    "chariot elevateur": "chariot",
    "chariot": "chariot",
    "chargeur": "chargeur",
    "voiture de fonction": "voiture",
    "voiture": "voiture",
    "bus": "bus",
    "balayeuse": "balayeuse",
    "pick-up": "pick_up",
    "pick up": "pick_up",
    "pickup": "pick_up",
}

_TYPE_PREFIX = {
    "camion":        "CAM",
    "semi_remorque": "SRM",
    "chariot":       "CHR",
    "chargeur":      "CHG",
    "voiture":       "VCL",
    "bus":           "BUS",
    "balayeuse":     "BAL",
    "pick_up":       "PKP",
}


def normalize_type(raw: str) -> str:
    key = str(raw).strip().lower()
    return _TYPE_MAP.get(key, "voiture")


def build_code(raw_code, vtype: str) -> str:
    prefix = _TYPE_PREFIX.get(vtype, "VCL")
    num = str(raw_code).strip().zfill(3)
    return f"{prefix}-{num}"


# ---- intervention category -----------------------------------------------
_CATEGORIE_MAP = {
    "vidange":      "preventive",
    "préparation":  "preventive",
    "preparation":  "preventive",
    "contrôle":     "preventive",
    "controle":     "preventive",
    "amélioration": "preventive",
    "amelioration": "preventive",
    "réparation":   "corrective",
    "reparation":   "corrective",
    "changement":   "corrective",
    "rénovation":   "corrective",
    "renovation":   "corrective",
    "rectification":"corrective",
    "confection":   "corrective",
    "dépannage":    "depannage",
    "depannage":    "depannage",
    "diagnostic":   "depannage",
    "démontage":    "depannage",
    "demontage":    "depannage",
    "purge":        "depannage",
    "montage":      "depannage",
    "essai":        "controle",
    "réglage":      "controle",
    "reglage":      "controle",
}


def intervention_categorie(type_label: Optional[str]) -> str:
    if not type_label:
        return "corrective"
    key = str(type_label).strip().lower()
    cat = _CATEGORIE_MAP.get(key)
    if cat is None:
        return "corrective"
    return cat


# ---- generic helpers -------------------------------------------------------
def clean_str(v, max_len: int = 255) -> Optional[str]:
    if v is None:
        return None
    s = str(v).strip()
    return s[:max_len] if s else None


def to_int(v) -> Optional[int]:
    if v is None:
        return None
    try:
        return int(float(str(v).replace(",", ".")))
    except (ValueError, TypeError):
        return None


def to_float(v) -> Optional[float]:
    if v is None:
        return None
    try:
        return float(str(v).replace(",", "."))
    except (ValueError, TypeError):
        return None


def to_date(v) -> Optional[date]:
    if v is None:
        return None
    if isinstance(v, (datetime, date)):
        return v.date() if isinstance(v, datetime) else v
    s = str(v).strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None
