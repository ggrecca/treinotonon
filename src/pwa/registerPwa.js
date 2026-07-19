function watchForUpdates(registration, {onOfflineReady, onUpdateAvailable}={}){
  let updateReported = false;
  const reportUpdate = worker => {
    if(updateReported) return;
    updateReported = true;
    onUpdateAvailable?.({registration, worker});
  };

  if(registration.waiting && globalThis.navigator?.serviceWorker?.controller){
    reportUpdate(registration.waiting);
  }

  registration.addEventListener("updatefound", ()=>{
    const worker = registration.installing;
    if(!worker) return;
    worker.addEventListener("statechange", ()=>{
      if(worker.state !== "installed") return;
      if(globalThis.navigator?.serviceWorker?.controller) reportUpdate(worker);
      else onOfflineReady?.({registration, worker});
    });
  });
}
/**
 * Registers the PWA worker only in a production build.
 *
 * Updates are reported to the caller and remain waiting until the browser's
 * normal lifecycle activates them. This module deliberately never reloads the
 * page and never sends a SKIP_WAITING message.
 */
export async function registerPwa(options={}){
  if(!import.meta.env.PROD) return null;
  if(globalThis.isSecureContext === false) return null;

  const serviceWorker = globalThis.navigator?.serviceWorker;
  if(!serviceWorker) return null;

  try{
    const registration = await serviceWorker.register("/sw.js", {scope:"/", updateViaCache:"none"});
    watchForUpdates(registration, options);
    options.onRegistered?.(registration);
    return registration;
  }catch(error){
    options.onError?.(error);
    return null;
  }
}
