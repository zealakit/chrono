import { initPickers } from "@zealakit/chrono-picker-vanilla";
import "./styles.css";

// Chrono's inputs and panels dispatch `chrono:valuechange` (ISO strings); it bubbles to the picker host.
for (const output of document.querySelectorAll<HTMLElement>(
  "[data-value-for]",
)) {
  const host = output.closest("section")?.querySelector("[data-chrono-picker]");
  host?.addEventListener("chrono:valuechange", (event) => {
    const { value } = (event as CustomEvent<{ value: unknown }>).detail;
    output.textContent = `Value: ${value === null ? "—" : JSON.stringify(value)}`;
  });
}

initPickers();
