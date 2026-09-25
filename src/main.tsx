import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { UiProvider } from "./components/ui";
import "./index.css";
import { StoreProvider } from "./store";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UiProvider>
      <StoreProvider>
        <App />
      </StoreProvider>
    </UiProvider>
  </StrictMode>,
);
