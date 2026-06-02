export function ThemeInitScript() {
  return (
    <script
      id="glossia-theme-init"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var t=localStorage.getItem("glossia.theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);return;}document.documentElement.setAttribute("data-theme",window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`,
      }}
    />
  );
}
