import { type RnaPresetComponentKey, type Struct, AttachmentPointName } from 'ketcher-core';
import type { RnaPresetWizardState } from './MonomerCreationWizard.types';
import { type PhosphatePosition } from './RnaPresetAttachmentPointValidation';
declare type AttachmentPointMap = Map<AttachmentPointName, [number, number]>;
declare type ComponentAttachmentPointNames = Record<RnaPresetComponentKey, AttachmentPointName[]>;
export declare const getAttachmentPointsForRnaPresetComponent: (assignedAttachmentPoints: AttachmentPointMap, wizardState: RnaPresetWizardState, componentKey: RnaPresetComponentKey) => AttachmentPointMap;
export declare const getConnectionAttachmentPointsForRnaPreset: (wizardState: RnaPresetWizardState, struct: Struct, phosphatePosition?: PhosphatePosition) => ComponentAttachmentPointNames;
export declare const getConnectionAttachmentPointsForRnaPresetComponent: (wizardState: RnaPresetWizardState, struct: Struct, componentKey: RnaPresetComponentKey, phosphatePosition?: PhosphatePosition) => AttachmentPointName[];
/**
 * Returns a Map of connection (inter-component) attachment point names to
 * [componentAtomId, otherComponentAtomId] pairs for the given RNA component tab.
 * Used to render and highlight these readonly APs on the canvas.
 */
export declare const getConnectionAttachmentPointAtomIdsForComponent: (wizardState: RnaPresetWizardState, struct: Struct, componentKey: RnaPresetComponentKey, phosphatePosition?: PhosphatePosition) => Map<AttachmentPointName, [number, number]>;
export declare const getVisibleAttachmentPointsForRnaPreset: (assignedAttachmentPoints: AttachmentPointMap, wizardState: RnaPresetWizardState, struct: Struct) => AttachmentPointMap;
export {};
