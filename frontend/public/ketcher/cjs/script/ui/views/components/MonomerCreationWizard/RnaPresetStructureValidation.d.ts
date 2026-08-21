import { Bond } from 'ketcher-core';
import type { RnaPresetWizardComponentStateFieldId, RnaPresetWizardState } from './MonomerCreationWizard.types';
export declare type RnaPresetValidationStruct = {
    atoms: {
        forEach: (callback: (_value: unknown, atomId: number) => void) => void;
    };
    bonds: {
        forEach: (callback: (bond: Pick<Bond, 'begin' | 'end'> & Partial<Pick<Bond, 'type' | 'stereo'>>, bondId: number) => void) => void;
    };
};
export declare type RnaPresetStructureValidationIssueId = 'rnaPresetAtomsOutsideComponents' | 'rnaPresetAtomsInMultipleComponents' | 'rnaPresetMissingComponents' | 'rnaPresetInvalidSugarConnectionBonds' | 'rnaPresetUnexpectedBasePhosphateBond' | 'rnaPresetInvalidSugarBaseConnectionAttachmentPoints' | 'rnaPresetInvalidSugarPhosphateConnectionAttachmentPoints';
export declare type RnaPresetStructureValidationResult = {
    issues: RnaPresetStructureValidationIssueId[];
    problematicAtomIds: Set<number>;
};
export declare type RnaPresetComponentStructures = {
    base: Pick<RnaPresetWizardState['base'], 'structure'>;
    sugar: Pick<RnaPresetWizardState['sugar'], 'structure'>;
    phosphate: Pick<RnaPresetWizardState['phosphate'], 'structure'>;
};
export declare const getRnaPresetComponentKeysToSave: (componentStructures: RnaPresetComponentStructures) => RnaPresetWizardComponentStateFieldId[];
export declare const hasRequiredRnaPresetComponents: (componentStructures: RnaPresetComponentStructures) => boolean;
export declare const findBondBetweenRnaPresetComponents: (wizardStruct: RnaPresetValidationStruct, firstComponentAtomIds: number[], secondComponentAtomIds: number[]) => Pick<Bond, "begin" | "end"> | undefined;
export declare const getRnaPresetStructureValidationResult: (wizardStruct: RnaPresetValidationStruct, componentStructures: RnaPresetComponentStructures) => RnaPresetStructureValidationResult;
export declare const isValidRnaPresetStructure: (wizardStruct: RnaPresetValidationStruct, componentStructures: RnaPresetComponentStructures) => boolean;
