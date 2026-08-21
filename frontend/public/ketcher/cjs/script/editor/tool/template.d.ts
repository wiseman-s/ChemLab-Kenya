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
import type Editor from '../Editor';
import type { Tool } from './Tool';
import TemplatePreview from './templatePreview';
import { getAngleFromEvent, getBondFlipSign, getSign } from './template.helpers';
export { getAngleFromEvent, getBondFlipSign, getSign };
declare class TemplateTool implements Tool {
    private readonly editor;
    private readonly mode;
    private readonly template;
    private readonly findItems;
    templatePreview: TemplatePreview | null;
    private dragCtx;
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
    mousemove(event: any): void;
    mouseup(event?: any): void;
    cancel(): void;
    mouseleave(): void;
    mouseLeaveClientArea(): void;
}
export default TemplateTool;
