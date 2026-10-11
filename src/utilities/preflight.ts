/** Base rules every page needs before utilities apply, written before the first utility rule. */
export const PREFLIGHT = [
  "*,::before,::after{box-sizing:border-box;margin:0;padding:0;border:0 solid}",
  "html{-webkit-tap-highlight-color:transparent}",
  "button,input,select,textarea{font:inherit;color:inherit;background:none;text-align:inherit}",
  "svg{display:block}",
  "[hidden]:where(:not([hidden=until-found])){display:none!important}",
  "[data-vrui-mode=dark]{color-scheme:dark}",
  "[data-vrui-mode=light]{color-scheme:light}",
  "@media (prefers-reduced-motion:reduce){*,::before,::after{animation-duration:1ms!important;animation-iteration-count:1!important;transition-duration:1ms!important;scroll-behavior:auto!important}}",
].join("");
