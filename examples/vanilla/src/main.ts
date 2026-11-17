// The package has no public API yet; importing it proves the workspace link.
import "@zealakit/chrono-vanilla";
import "./styles.css";

const app = document.getElementById("app");
if (!app) {
  throw new Error("Target element #app not found");
}

const heading = document.createElement("h1");
heading.textContent = "Chrono — Vanilla";
app.append(heading);
