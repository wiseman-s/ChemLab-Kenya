import type { AnyAction, Dispatch } from 'redux';
export declare const APP_OPTIONS_ACTION = "APP_OPTIONS";
export declare const OPTIONS_UPDATE_ACTION = "UPDATE";
export declare function appUpdate(data: Record<string, unknown>): (dispatch: Dispatch<AnyAction>) => void;
