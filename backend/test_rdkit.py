print("🧪 ChemLab Kenya - RDKit Test")
print("=" * 50)

try:
    from rdkit import Chem
    from rdkit.Chem import Descriptors, rdMolDescriptors
    print("✅ RDKit imported successfully!")

    # Create ethanol molecule
    mol = Chem.MolFromSmiles("CCO")
    
    if mol is None:
        print("❌ Failed to create molecule")
    else:
        print(f"✅ Molecule created: {Chem.MolToSmiles(mol)}")
        print(f"✅ Molecular weight : {Descriptors.MolWt(mol):.2f}")
        print(f"✅ Exact mol weight  : {Descriptors.ExactMolWt(mol):.4f}")
        print(f"✅ Molecular formula : {rdMolDescriptors.CalcMolFormula(mol)}")
        print(f"✅ Number of atoms   : {mol.GetNumAtoms()}")
        print(f"✅ Heavy atoms       : {Descriptors.HeavyAtomCount(mol)}")
        print(f"✅ LogP              : {Descriptors.MolLogP(mol):.2f}")
        print(f"✅ TPSA              : {Descriptors.TPSA(mol):.2f}")

        print("\n🎉 RDKit is working perfectly!")

except ImportError as e:
    print("❌ RDKit import failed")
    print(f"Error: {e}")
    print("\nTry reinstalling with:")
    print("conda install -c conda-forge rdkit -y")
except Exception as e:
    print(f"❌ Unexpected error: {e}")