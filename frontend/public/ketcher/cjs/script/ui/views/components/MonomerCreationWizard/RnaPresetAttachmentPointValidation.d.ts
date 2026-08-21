import { AtomLabel, AttachmentPointName, KetMonomerClass } from 'ketcher-core';
export declare type PhosphatePosition = '3' | '5';
declare type AttachmentPointMap = Map<AttachmentPointName, [number, number]>;
/**
 * Gets the leaving atom used for RNA preset connection attachment points.
 * - Base R1 uses H
 * - Sugar R3 uses O (representing OH)
 * - Sugar R1/R2 use H
 * - Phosphate R1/R2 use O (representing OH)
 */
export declare const getLeavingAtomForAttachmentPoint: (componentType: KetMonomerClass, attachmentPointName: AttachmentPointName) => AtomLabel;
export declare const getRequiredAttachmentPointsForPhosphatePosition: (phosphatePosition: PhosphatePosition) => {
    sugar: AttachmentPointName;
    phosphate: AttachmentPointName;
};
export declare const hasPhosphatePositionAttachmentPointConflict: (phosphatePosition: PhosphatePosition, sugarAttachmentPoints?: AttachmentPointMap, phosphateAttachmentPoints?: AttachmentPointMap) => boolean;
export {};
