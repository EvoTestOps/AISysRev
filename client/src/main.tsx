import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";
import App from "./App.tsx";
import { StoreProvider } from "easy-peasy";
import { store } from "./state/store.ts";
import { EventStream } from "./components/EventStream.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider store={store}>
      <HelmetProvider>
        <EventStream />
        <App />
      </HelmetProvider>
    </StoreProvider>
  </StrictMode>
);
