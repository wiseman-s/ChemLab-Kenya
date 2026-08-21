import type { AtomLabel, AttachmentPointName } from 'ketcher-core';
import type { AttachmentPointSelectData } from '../../hooks/useAttachmentPointSelectsData';
import { type ReactNode } from 'react';
declare type Props = {
    data: AttachmentPointSelectData;
    onNameChange: (newName: AttachmentPointName) => void;
    onLeavingAtomChange: (newLeavingAtomLabel: AtomLabel) => void;
    className?: string;
    additionalControls?: ReactNode;
    highlight?: boolean;
    isPopup?: boolean;
    disabled?: boolean;
    /** Disable only the name select, leaving the leaving-atom select editable */
    disabledName?: boolean;
    /** Tooltip shown on the name select when it is disabled */
    nameTooltip?: string;
};
declare const AttachmentPointControls: import("react").ForwardRefExoticComponent<Props & import("react").RefAttributes<HTMLDivElement>>;
export default AttachmentPointControls;
