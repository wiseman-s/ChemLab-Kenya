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
import { type ButtonHTMLAttributes, type ChangeEvent, type PropsWithChildren, Component } from 'react';
import type { FileContent, OpenerFunction } from './openButton.types';
declare type OpenButtonOwnProps = {
    server?: unknown;
    type?: string;
    className?: string;
    onLoad?: (content: File | FileContent) => void;
    onError?: (error: Error) => void;
};
declare type OpenButtonProps = PropsWithChildren<Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof OpenButtonOwnProps> & OpenButtonOwnProps>;
declare type OpenButtonState = {
    opener?: OpenerFunction;
};
declare class OpenButton extends Component<OpenButtonProps, OpenButtonState> {
    private btn;
    private isMounted;
    private initOpenerRequestId;
    constructor(props: OpenButtonProps);
    componentDidMount(): void;
    componentDidUpdate(prevProps: OpenButtonProps): void;
    componentWillUnmount(): void;
    initOpener(server?: unknown): void;
    open(ev: ChangeEvent<HTMLInputElement>): void;
    render(): import("react/jsx-runtime").JSX.Element;
}
export default OpenButton;
