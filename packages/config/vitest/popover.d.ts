/** Installs a stand-in for the HTML `popover` API in jsdom (setup files only). */
export declare function installPopoverStub(): void;

/** Takes the stand-in's API away, as in a browser without popovers. */
export declare function removePopoverStub(): void;

/** Puts back what `removePopoverStub` took away. */
export declare function restorePopoverStub(): void;
