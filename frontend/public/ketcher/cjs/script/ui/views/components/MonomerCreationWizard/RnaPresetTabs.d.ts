import { type AtomLabel, type AttachmentPointName, type RnaPresetComponentKey } from 'ketcher-core';
import type { RnaPresetWizardAction, RnaPresetWizardState } from './MonomerCreationWizard.types';
import type { Editor } from '../../../../editor';
interface IRnaPresetTabsProps {
    wizardState: RnaPresetWizardState;
    editor: Editor;
    wizardStateDispatch: (action: RnaPresetWizardAction) => void;
    phosphatePosition: '3' | '5' | undefined;
    onPhosphatePositionChange: (position: '3' | '5') => void;
    /** User-overridden leaving atom labels for connection APs, keyed by
     * "<componentKey>:<apName>". Persists across tab switches. */
    connectionLeavingAtoms?: Map<string, AtomLabel>;
    onConnectionLeavingAtomChange?: (apName: AttachmentPointName, newLeavingAtomLabel: AtomLabel, componentKey: RnaPresetComponentKey) => void;
}
export declare const RnaPresetTabs: (props: IRnaPresetTabsProps) => import("react/jsx-runtime").JSX.Element;
export {};
