"""
Excel helpers — know how to open each workbook and locate real headers.

gm parc auto.xlsm has 4 decorative title rows before the real header on most
sheets (row 5 for BDD interv, row 3 for Code Véhicule, etc.).  We resolve this
per-sheet rather than applying a fixed offset.
"""

from pathlib import Path
import openpyxl

DATA_DIR = Path(__file__).resolve().parents[3]  # data/
GM_FILE  = DATA_DIR / "gm parc auto.xlsm"
SUIVI_FILE = DATA_DIR / "Suivi  véhicule.xlsx"


def _rows_as_dicts(ws, header_row: int):
    """Yield dicts keyed by the header row, skipping blank rows."""
    headers = [c.value for c in ws[header_row]]
    for row in ws.iter_rows(min_row=header_row + 1, values_only=True):
        if all(v is None for v in row):
            continue
        yield dict(zip(headers, row))


def read_code_vehicule():
    """Code Véhicule sheet — header on row 3, 42 rows."""
    wb = openpyxl.load_workbook(GM_FILE, read_only=True, keep_vba=False, data_only=True)
    ws = wb["Code Véhicule"]
    yield from _rows_as_dicts(ws, header_row=3)
    wb.close()


def read_bdd_interv():
    """BDD interv sheet — header on row 5, ~1095 data rows."""
    wb = openpyxl.load_workbook(GM_FILE, read_only=True, keep_vba=False, data_only=True)
    ws = wb["BDD interv"]
    yield from _rows_as_dicts(ws, header_row=5)
    wb.close()


def read_bdd_pneu():
    """bdd pneu sheet — header on row 7, 25 vehicles (wide format)."""
    wb = openpyxl.load_workbook(GM_FILE, read_only=True, keep_vba=False, data_only=True)
    ws = wb["bdd pneu"]
    yield from _rows_as_dicts(ws, header_row=7)
    wb.close()


def read_suivi_vidanges():
    """Suivi des vidanges sheet — header on row 5, 25 vehicles."""
    wb = openpyxl.load_workbook(GM_FILE, read_only=True, keep_vba=False, data_only=True)
    ws = wb["Suivi des vidanges"]
    yield from _rows_as_dicts(ws, header_row=5)
    wb.close()


def read_suivi_vehicule():
    """Suivi véhicule.xlsx Feuil1 — header on row 2, 37 vehicles."""
    wb = openpyxl.load_workbook(SUIVI_FILE, read_only=True, data_only=True)
    ws = wb["Feuil1"]
    yield from _rows_as_dicts(ws, header_row=2)
    wb.close()
