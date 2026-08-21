interface SavedOptions {
    ignoreChiralFlag?: boolean;
}
export declare class OptionsManager {
    static getOptions(): SavedOptions;
    static saveSettings(settings: SavedOptions): void;
    static get ignoreChiralFlag(): boolean | undefined;
    static set ignoreChiralFlag(ignoreChiralFlag: boolean | undefined);
}
export {};
