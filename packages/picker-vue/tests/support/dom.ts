/** Remove everything a test rendered into the shared happy-dom document. */
export function resetDom(): void {
  document.body.replaceChildren();
}
