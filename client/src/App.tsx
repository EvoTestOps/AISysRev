import { Route, Switch, useLocation } from "wouter";
import { useEffect, useState } from "react";
import axios from "axios";
import { ToastContainer } from "react-toastify";
import { EventStream } from "./components/EventStream";
import { NotFoundPage } from "./pages/NotFound";
import { ProjectsPage } from "./pages/ProjectsPage";
import { NewProject } from "./pages/NewProjectPage";
import { AboutPage } from "./pages/AboutPage";
import { ProjectPage } from "./pages/ProjectPage";
import { SettingsPage } from "./pages/SettingPage";
import { AccountSettingsPage } from "./pages/AccountSettingsPage";
import { ResultPage } from "./pages/ResultPage";
import "react-loading-skeleton/dist/skeleton.css";
import { PapersPage } from "./pages/PapersPage";
import { useTypedStoreActions } from "./state/store";
import { api } from "./services/api";
import { Layout } from "./components/Layout";
import { ConsentModal } from "./components/ConsentModal";

function App() {
  const [location] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [consentRequired, setConsentRequired] = useState(false);

  const fetchProjects = useTypedStoreActions(
    (actions) => actions.fetchProjects
  );
  const fetchProviders = useTypedStoreActions(
    (actions) => actions.fetchProviders
  );

  // Checks session validity here
  useEffect(() => {
    const controller = new AbortController();
    const checkSession = async () => {
      try {
        await api.get("/api/v1/auth/me", { signal: controller.signal });
        setConsentRequired(false);
        setIsAuthenticated(true);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (axios.isAxiosError(error) && error.response?.status === 403) {
          setConsentRequired(true);
          setIsAuthenticated(false);
          return;
        }
        setConsentRequired(false);
        setIsAuthenticated(false);
      }
    };
    checkSession();
    return () => controller.abort();
  }, [location]);

  // Hook to redirect to login if not authenticated and consent isn't pending
  useEffect(() => {
    if (isAuthenticated === false && !consentRequired) {
      window.location.href = "/login";
    }
  }, [isAuthenticated, consentRequired]);

  // Initialization hook
  useEffect(() => {
    if (isAuthenticated) {
      fetchProviders();
      fetchProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (consentRequired) {
    return (
      <Layout title="Loading..." hideNavbar>
        <ConsentModal
          open={consentRequired}
          onAccepted={() => {
            setConsentRequired(false);
            setIsAuthenticated(true);
          }}
        />
      </Layout>
    );
  }

  if (!isAuthenticated) return <Layout title="Loading..." hideNavbar />;

  return (
    <div className="flex flex-col bg-gray-200 font-roboto pb-32">
      <ToastContainer autoClose={4000} />
      <EventStream />
      <Switch>
        <Route path="/" component={ProjectsPage} />
        <Route path="/projects" component={ProjectsPage} />
        <Route path="/create" component={NewProject} />
        <Route path="/project/:projectUuid" component={ProjectPage} />
        <Route
          path="/project/:projectUuid/papers/page/:page"
          component={PapersPage}
        />
        <Route path="/project/:projectUuid/evaluate" component={ProjectPage} />
        <Route path="/project/:projectUuid/few_shot" component={ProjectPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/settings/account" component={AccountSettingsPage} />
        <Route path="/result/:uuid" component={ResultPage} />
        <Route path="*" component={NotFoundPage} />
      </Switch>
    </div>
  );
}

export default App;
