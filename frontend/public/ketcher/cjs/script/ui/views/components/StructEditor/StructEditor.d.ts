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
import { type ComponentType, type RefObject, Component } from 'react';
import Editor from '../../../../editor';
import { type Struct } from 'ketcher-core';
interface StructEditorProps {
    ketcherId: string;
    prevKetcherId?: string;
    struct?: Struct;
    tool?: string;
    toolOpts?: Record<string, unknown>;
    options?: Record<string, unknown>;
    serverSettings?: Record<string, unknown>;
    indigoVerification?: boolean;
    showAttachmentPoints?: boolean;
    Tag?: ComponentType | string;
    className?: string;
    render?: unknown;
    groupStruct?: unknown;
    sGroup?: unknown;
    onInit?: (editor: Editor) => void;
    onZoomIn?: (event: WheelEvent) => void;
    onZoomOut?: (event: WheelEvent) => void;
    onShowMacromoleculesErrorMessage?: (error: string) => void;
    [key: string]: unknown;
}
interface StructEditorState {
    enableCursor: boolean;
    tooltip: string;
}
declare class StructEditor extends Component<StructEditorProps, StructEditorState> {
    editor: Editor;
    editorRef: RefObject<HTMLDivElement | null>;
    logRef: RefObject<HTMLDivElement | null>;
    constructor(props: StructEditorProps);
    handleWheel: (event: WheelEvent) => void;
    /**
     * @param {WheelEvent} event
     */
    scrollCanvas(event: WheelEvent): void;
    /**
     * @param {WheelEvent} event
     */
    handleHorizontalScroll(event: WheelEvent): void;
    /**
     * For mouse wheel and touchpad
     * @param {WheelEvent} event
     */
    handleScroll(event: WheelEvent): void;
    shouldComponentUpdate(nextProps: StructEditorProps, nextState: StructEditorState): boolean;
    UNSAFE_componentWillReceiveProps(props: StructEditorProps): void;
    componentDidMount(): void;
    componentWillUnmount(): void;
    render(): import("react/jsx-runtime").JSX.Element;
}
export default StructEditor;
