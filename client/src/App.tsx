import { Route, Switch, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import Cookies from "js-cookie";
import { NotFoundPage } from "./pages/NotFound";
import { TermsAndConditionsPage } from "./pages/TermsAndConditionsPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { NewProject } from "./pages/NewProjectPage";
import { AboutPage } from "./pages/AboutPage";
import { ProjectPage } from "./pages/ProjectPage";
import { SettingsPage } from "./pages/SettingPage";
import { ResultPage } from "./pages/ResultPage";
import "react-loading-skeleton/dist/skeleton.css";
import { PapersPage } from "./pages/PapersPage";
import { LoginPage } from "./pages/LoginPage";
import { useTypedStoreActions } from "./state/store";
import { api } from "./services/api";

function App() {
  const [location, navigate] = useLocation();
  const [checkedTerms, setCheckedTerms] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const fetchProjects = useTypedStoreActions(
    (actions) => actions.fetchProjects
  );
  const fetchProviders = useTypedStoreActions(
    (actions) => actions.fetchProviders
  );

  useEffect(() => {
    api.get("/api/v1/auth/me")
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false));
  }, []);

  useEffect(() => {
    if (isAuthenticated === false && location !== "/login") {
      navigate("/login");
    }
  }, [isAuthenticated, location, navigate]);

  useEffect(() => {
    const hasReadTerms = Cookies.get("disclaimer_read");
    if (!hasReadTerms && location !== "/terms-and-conditions") {
      navigate("/terms-and-conditions");
    }
    setCheckedTerms(true);
  }, [location, navigate]);

  // Initialization hook
  useEffect(() => {
    if (isAuthenticated) {
      fetchProviders();
      fetchProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (isAuthenticated === null) return null;
  if (!checkedTerms) return null;

  return (
    <div className="flex flex-col bg-gray-200 font-roboto pb-32">
      <ToastContainer autoClose={4000} />
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
        <Route
          path="/terms-and-conditions"
          component={TermsAndConditionsPage}
        />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/result/:uuid" component={ResultPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="*" component={NotFoundPage} />
      </Switch>
    </div>
  );
}

export default App;
