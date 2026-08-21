# backend/chemistry/rdkit_renderer.py

from rdkit import Chem
import base64
from io import BytesIO
from urllib.parse import quote

def smiles_to_svg(smiles: str, width: int = 400, height: int = 300) -> str:
    """
    Convert SMILES to a data URL image.
    Uses multiple fallback methods to ensure it works on Windows.
    """
    if not smiles:
        print("⚠️ No SMILES provided")
        return ""

    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            print(f"⚠️ Invalid SMILES: {smiles}")
            return ""

        print(f"✅ Molecule created for: {smiles[:30]}...")

        # Method 1: Use MolToImage from rdkit.Chem.Draw
        try:
            from rdkit.Chem.Draw import MolToImage
            img = MolToImage(mol, size=(width, height))
            
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            
            print(f"✅ Image generated using MolToImage")
            return f"data:image/png;base64,{img_str}"
        except Exception as e:
            print(f"⚠️ MolToImage failed: {e}")

        # Method 2: Use MolsToGridImage
        try:
            from rdkit.Chem.Draw import MolsToGridImage
            img = MolsToGridImage([mol], molsPerRow=1, subImgSize=(width, height))
            
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            
            print(f"✅ Image generated using MolsToGridImage")
            return f"data:image/png;base64,{img_str}"
        except Exception as e:
            print(f"⚠️ MolsToGridImage failed: {e}")

        # Method 3: Use IPythonConsole
        try:
            from rdkit.Chem.Draw import IPythonConsole
            from rdkit.Chem import rdDepictor
            rdDepictor.Compute2DCoords(mol)
            
            # Create SVG using IPythonConsole
            from rdkit.Chem.Draw import MolDraw2DCairo
            drawer = MolDraw2DCairo(width, height)
            drawer.DrawMolecule(mol)
            drawer.FinishDrawing()
            
            png_data = drawer.GetDrawingText()
            img_str = base64.b64encode(png_data).decode()
            
            print(f"✅ Image generated using MolDraw2DCairo")
            return f"data:image/png;base64,{img_str}"
        except Exception as e:
            print(f"⚠️ MolDraw2DCairo failed: {e}")

        # Method 4: Use SVG generation
        try:
            from rdkit.Chem import rdDepictor
            rdDepictor.Compute2DCoords(mol)
            
            from rdkit.Chem.Draw import MolToSVG
            svg = MolToSVG(mol, size=(width, height))
            
            print(f"✅ Image generated using MolToSVG")
            return f"data:image/svg+xml;charset=UTF-8,{quote(svg)}"
        except Exception as e:
            print(f"⚠️ MolToSVG failed: {e}")

        # Method 5: Use PIL/Pillow with RDKit's SVG
        try:
            from rdkit.Chem import rdDepictor
            rdDepictor.Compute2DCoords(mol)
            
            # Try to get SVG as text
            from rdkit.Chem.Draw import MolsToGridImage
            img = MolsToGridImage([mol], molsPerRow=1, subImgSize=(width, height))
            
            import PIL.Image
            import io
            
            buffered = io.BytesIO()
            img.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            
            print(f"✅ Image generated using PIL fallback")
            return f"data:image/png;base64,{img_str}"
        except Exception as e:
            print(f"⚠️ PIL fallback failed: {e}")

        print("❌ All rendering methods failed")
        return ""

    except Exception as exc:
        print(f"❌ RDKit rendering completely failed: {exc}")
        return ""


def smiles_to_svg_raw(smiles: str, width: int = 400, height: int = 300) -> str:
    """Returns raw base64 PNG string."""
    if not smiles:
        return ""

    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return ""

        from rdkit.Chem.Draw import MolToImage
        img = MolToImage(mol, size=(width, height))
        
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode()

    except Exception as exc:
        print(f"⚠️ Raw rendering failed: {exc}")
        return ""