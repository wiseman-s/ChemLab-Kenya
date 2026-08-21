import { type Action, type getItemsToFuse, type ImageReferencePositionInfo, type Vec2, IMAGE_KEY } from 'ketcher-core';
import type { ClosestItemWithMap } from '../../shared/closest.types';
import type { CommonArrowDragContext, MultitailArrowClosestItem, ReactionArrowClosestItem } from '../arrow/arrow.types';
export declare type SelectMode = 'lasso' | 'fragment' | 'rectangle';
declare type MergeItems = ReturnType<typeof getItemsToFuse>;
declare type SharedDragContext = {
    copyAction?: Action;
    mergeItems?: MergeItems;
    stopTapping?: () => void;
};
export declare type SelectionMoveDragContext = SharedDragContext & {
    action?: Action | null;
    item: ClosestItemWithMap<unknown>;
    xy0: Vec2;
};
export declare type SimpleObjectSelectionDragContext = SelectionMoveDragContext & {
    item: ClosestItemWithMap<Vec2, 'simpleObjects'> & {
        ref: Vec2;
    };
};
export declare type ImageSelectionDragContext = SelectionMoveDragContext & {
    item: ClosestItemWithMap<ImageReferencePositionInfo, typeof IMAGE_KEY> & {
        ref: ImageReferencePositionInfo;
    };
};
export declare type ArrowDragContext = CommonArrowDragContext<ReactionArrowClosestItem | MultitailArrowClosestItem> & SharedDragContext;
export declare type DragContext = SelectionMoveDragContext | ArrowDragContext | null;
export declare function isSelectionMoveDragContext(dragCtx: DragContext): dragCtx is SelectionMoveDragContext;
export declare function isArrowDragContext(dragCtx: DragContext): dragCtx is ArrowDragContext;
export declare function isImageSelectionDragContext(dragCtx: SelectionMoveDragContext): dragCtx is ImageSelectionDragContext;
export declare function isSimpleObjectSelectionDragContext(dragCtx: SelectionMoveDragContext): dragCtx is SimpleObjectSelectionDragContext;
export {};
