import { type AttachmentPointName, AtomLabel } from 'ketcher-core';
import type { Editor } from '../../../../../editor';
import type { Option } from '../../../../component/form/Select';
export declare type AttachmentPointSelectData = {
    nameOptions: Array<Option>;
    leavingAtomOptions: Array<Option>;
    currentNameOption?: Option;
    currentLeavingAtomOption?: Option;
};
export declare const createReadonlyAttachmentPointSelectData: (attachmentPointName: AttachmentPointName, leavingAtomLabel: AtomLabel) => AttachmentPointSelectData;
export declare const useAttachmentPointSelectsData: (editor: Editor, attachmentPointName: AttachmentPointName) => AttachmentPointSelectData | null;
