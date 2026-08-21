# backend/chemistry/__init__.py

"""
Chemistry module for ChemLab Kenya API.

This module provides chemical search and rendering functionality:
- PubChem: Compound name and formula search
- RDKit: Structure rendering (2D/3D)
- Formula Search: Multi-provider formula lookup (Wikidata, Wikipedia, CACTUS, PubChem)
"""

# Import from pubchem.py
from .pubchem import (
    search_compound_by_name,
    search_by_formula as pubchem_search_by_formula,
    clear_cache as clear_pubchem_cache,
    get_cache_stats as get_pubchem_cache_stats,
)

# Import from rdkit_renderer.py
from .rdkit_renderer import (
    smiles_to_svg,
    smiles_to_svg_raw,
)

# Import from formula_search.py
from .formula_search import (
    search_by_formula,
    clear_formula_cache,
    get_formula_cache_stats,
)

# Version
__version__ = "1.2.0"

# Public API
__all__ = [
    # PubChem
    "search_compound_by_name",
    "pubchem_search_by_formula",
    "clear_pubchem_cache",
    "get_pubchem_cache_stats",
    
    # RDKit Rendering
    "smiles_to_svg",
    "smiles_to_svg_raw",
    
    # Formula Search
    "search_by_formula",
    "clear_formula_cache",
    "get_formula_cache_stats",
]