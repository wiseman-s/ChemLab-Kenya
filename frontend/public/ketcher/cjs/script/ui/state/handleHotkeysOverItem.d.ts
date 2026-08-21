import type { Dispatch } from 'redux';
import type { Editor } from '../../editor';
declare type TNewAction = {
    tool?: string;
    dialog?: string;
    opts?: any;
};
declare type HandleHotkeyOverItemProps = {
    hoveredItem: Record<string, number>;
    newAction: TNewAction;
    editor: Editor;
    dispatch: Dispatch;
};
export declare function handleHotkeyOverItem(props: HandleHotkeyOverItemProps): void;
export {};
