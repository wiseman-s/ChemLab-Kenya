# backend/chemistry/compound_routes.py
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import JSONResponse

from .explorer import explore, NotFound, Unavailable

router = APIRouter(prefix="/api/compound")


@router.get("/search")
async def compound_search(q: str, mode: str = "auto"):
    try:
        return await explore(q, mode)

    except NotFound as e:
        return JSONResponse(
            status_code=404,
            content={
                "error": str(e),
                "suggestions": getattr(e, "suggestions", []),
                "kind": "not_found",
            },
        )

    except Unavailable:
        # Never expose internal error details ("PubChem 500", "503", etc.)
        return JSONResponse(
            status_code=200,  # return 200 with empty results — the UI handles it
            content={
                "error": None,
                "kind": "unavailable",
                "message": (
                    "Compound databases are busy right now. "
                    "You can still draw the structure directly in the editor below, "
                    "or try again in a moment."
                ),
                "results": [],
                "unavailable": True,
            },
        )


@router.get("/structure")
async def compound_structure(smiles: str):
    try:
        from rdkit import Chem
        from rdkit.Chem.Draw import rdMolDraw2D
    except ImportError:
        raise HTTPException(status_code=501, detail="RDKit not installed")

    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise HTTPException(status_code=400, detail="Invalid SMILES")

    drawer = rdMolDraw2D.MolDraw2DSVG(320, 260)
    drawer.DrawMolecule(mol)
    drawer.FinishDrawing()

    return Response(
        drawer.GetDrawingText(),
        media_type="image/svg+xml",
        headers={"Cache-Control": "public, max-age=86400"},
    )
