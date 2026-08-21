import { FunctionalGroup } from 'ketcher-core';
import type { Editor, ClosestItemWithMap } from 'src/script/editor';
import { type ContextMenuProps, type GetIsItemInSelectionArgs } from './contextMenu.types';
import type { Selection } from '../../../../editor/Editor';
export declare const getIsItemInSelection: ({ item, selection, selectedSGroupsIds, selectedFunctionalGroups, }: GetIsItemInSelectionArgs) => boolean;
export declare function getMenuPropsForClosestItem(editor: Editor, closestItem: ClosestItemWithMap, ketcherId: string): ContextMenuProps | null;
export declare function getMenuPropsForSelection(selection: Selection | null, selectedFunctionalGroups: Map<number, FunctionalGroup>, ketcherId: string): ContextMenuProps | null;
