window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== "FORTEACHER_EXTENSION_SESSION") return;

  try {
    const extensionApi = globalThis.chrome;
    if (!extensionApi?.runtime?.id || !extensionApi.storage?.local) return;
    extensionApi.storage.local.set({
      forteacherSession: event.data.session,
      forteacherAppOrigin: window.location.origin
    }, () => {
      if (extensionApi.runtime.lastError) return;
      window.postMessage({
        type: "FORTEACHER_EXTENSION_SESSION_SAVED",
        email: event.data.session?.user?.email || null
      }, window.location.origin);
    });
  } catch {
    // The extension was likely reloaded while this bridge page was still open.
  }
});
