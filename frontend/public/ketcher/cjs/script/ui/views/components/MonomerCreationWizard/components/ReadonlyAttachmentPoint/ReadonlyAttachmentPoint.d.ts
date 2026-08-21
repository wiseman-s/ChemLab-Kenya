import type { AttachmentPointName, AtomLabel } from 'ketcher-core';
import type Editor from '../../../../../../editor';
declare type Props = {
    name: AttachmentPointName;
    leavingAtomLabel: AtomLabel;
    editor: Editor;
    /** When provided, hover highlights this specific atom instead of using the
     * name-keyed connection map. Use this when multiple components share the
     * same AP name (e.g. base R1 and phosphate R1). */
    atomId?: number;
    onLeavingAtomChange?: (apName: AttachmentPointName, newLeavingAtomLabel: AtomLabel) => void;
};
/**
 * Displays a readonly (inter-component connection) attachment point.
 * Hovering highlights the corresponding atom on canvas,
 * and hovering the atom on canvas highlights this row in the panel.
 */
declare const ReadonlyAttachmentPoint: ({ name, leavingAtomLabel, editor, atomId, onLeavingAtomChange, }: Props) => import("react/jsx-runtime").JSX.Element;
export default ReadonlyAttachmentPoint;
