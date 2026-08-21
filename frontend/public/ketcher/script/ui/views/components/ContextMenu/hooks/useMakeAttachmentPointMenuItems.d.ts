import type { AtomContextMenuProps, MenuItemsProps } from '../contextMenu.types';
import type { Editor } from 'src/script/editor';
import type { ReactNode } from 'react';
declare type Props = {
    props: MenuItemsProps<AtomContextMenuProps>;
    selectedAtomId: number | undefined;
    editor: Editor;
};
declare const useMakeAttachmentPointMenuItems: ({ props, selectedAtomId, editor, }: Props) => ReactNode[] | null;
export default useMakeAttachmentPointMenuItems;
