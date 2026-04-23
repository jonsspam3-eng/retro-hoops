import { createApp } from "./ui/app.js";

function boot() {
  const root = document.getElementById("app");
  if (!root) {
    throw new Error("Missing #app root element");
  }
  const app = createApp(root);
  app.start();
}

boot();
