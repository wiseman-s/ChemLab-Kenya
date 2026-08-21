/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/
import { ReStruct } from 'ketcher-core';
import Editor from '../Editor';
import { Tool } from './Tool';
export declare const PREVIEW_DELAY = 300;
declare class TemplateTool implements Tool {
    private readonly editor;
    private readonly mode;
    private readonly template;
    private readonly findItems;
    private dragCtx;
    private isPreviewVisible;
    private previewRemoveAction;
    private previewTimeout;
    private lastPreviewId;
    private targetGroupsIds;
    private readonly isSaltOrSolvent;
    private event;
    constructor(editor: Editor, tmpl: any);
    private get struct();
    private get functionalGroups();
    private get isModeFunctionalGroup();
    private get closestItem();
    private get isNeedToShowRemoveAbbreviationPopup();
    private findKeyOfRelatedGroupId;
    private showRemoveAbbreviationPopup;
    mousedown(event: MouseEvent): Promise<void>;
    mousemove(event: any): boolean;
    mouseup(event?: any): boolean;
    cancel(): void;
    mouseleave(e: any): void;
    hidePreview(): void;
    showPreview(event: MouseEvent | {
        clientX: number;
        clientY: number;
    }, ci: any, restruct: ReStruct): void;
}
export default TemplateTool;
