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
import { type ComponentType, type MouseEvent, type KeyboardEvent, Component } from 'react';
interface TabPanel {
    caption: string;
    component?: ComponentType;
    props?: Record<string, unknown>;
    tabIndex?: number;
}
interface TabsProps {
    tabs: TabPanel[];
    tabIndex?: number;
    changeTab: (index: number) => void;
    className?: string;
    contentClassName?: string;
    captions?: TabPanel[];
}
interface TabsState {
    tabIndex: number;
}
declare class Tabs extends Component<TabsProps, TabsState> {
    constructor(props: TabsProps);
    changeTab(_ev: MouseEvent | KeyboardEvent, index: number): void;
    handleKeyDown(ev: KeyboardEvent, index: number): void;
    componentDidUpdate(prevProps: TabsProps): void;
    render(): import("react/jsx-runtime").JSX.Element;
}
export default Tabs;
