import { getGlobalState } from "../store/global-state.js";
import { isBrowser } from "../store/env.js";

/**
 * The one shared visually-hidden live region per document (plan 05 E20). This
 * inline style is the single accessibility exception to the "no styles" rule
 * (02 §2.8): it hides the region from sight while screen readers read it.
 */
const VISUALLY_HIDDEN =
  "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";

function createRegion(): HTMLElement {
  const region = document.createElement("div");
  region.setAttribute("aria-live", "polite");
  region.setAttribute("role", "status");
  region.setAttribute("aria-atomic", "true");
  region.setAttribute("style", VISUALLY_HIDDEN);
  document.body.appendChild(region);
  return region;
}

/**
 * Announce `message` through a polite live region. The region is created
 * lazily and shared by every copy of core on the page; the app can pass its
 * own element, or `false` to disable announcements. A no-op outside the
 * browser.
 */
export function announce(message: string, element?: HTMLElement | false): void {
  if (element === false || !isBrowser()) {
    return;
  }
  const shared = element === undefined;
  const region =
    element ?? getGlobalState<HTMLElement>("announcer", createRegion);
  if (shared && !region.isConnected) {
    document.body.appendChild(region);
  }
  // Clearing first lets the same message be read twice in a row.
  region.textContent = "";
  region.textContent = message;
}
