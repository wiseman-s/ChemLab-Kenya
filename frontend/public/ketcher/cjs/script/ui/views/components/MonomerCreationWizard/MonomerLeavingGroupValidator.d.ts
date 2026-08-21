import { type AttachmentPointName, KetMonomerClass } from 'ketcher-core';
import type { WizardNotification } from './MonomerCreationWizard.types';
import type { Editor } from 'src/script/editor/Editor';
export declare const validateMonomerLeavingGroups: (editor: Editor, monomerType: KetMonomerClass | 'rnaPreset', assignedAttachmentPoints: Map<AttachmentPointName, [number, number]>) => Map<string, WizardNotification>;
