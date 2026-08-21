import { type AtomLabel, type AttachmentPointName } from 'ketcher-core';
import { type ReactNode } from 'react';
import type { StringWizardFormFieldId, WizardState } from './MonomerCreationWizard.types';
interface IMonomerCreationWizardFieldsProps {
    wizardState: WizardState;
    assignedAttachmentPoints: Map<AttachmentPointName, [number, number]>;
    readonlyAttachmentPoints?: Array<{
        name: AttachmentPointName;
        leavingAtomLabel: AtomLabel;
    }>;
    onChangeModificationTypes?: (modificationTypes: string[]) => void;
    onFieldChange: (fieldId: StringWizardFormFieldId, value: string) => void;
    onReadonlyLeavingAtomChange?: (apName: AttachmentPointName, newLeavingAtomLabel: AtomLabel) => void;
    showNaturalAnalogue?: boolean;
    attachmentPointsExtra?: ReactNode;
}
declare const MonomerCreationWizardFields: (props: IMonomerCreationWizardFieldsProps) => import("react/jsx-runtime").JSX.Element | null;
export default MonomerCreationWizardFields;
