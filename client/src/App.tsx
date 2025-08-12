import { Route, Switch, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import Cookies from "js-cookie";
import { NotFoundPage } from "./pages/404";
import { TermsAndConditionsPage } from "./pages/TermsAndConditionsPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { NewProject } from "./pages/NewProjectPage";
import { AboutPage } from "./pages/AboutPage";
import { ProjectPage } from "./pages/ProjectPage";
import { ScreeningPage } from "./pages/ScreeningPage";

function App() {
  const [location, navigate] = useLocation();
  const [checkedTerms, setCheckedTerms] = useState(false);

  useEffect(() => {
    const hasReadTerms = Cookies.get("disclaimer_read");
    if (!hasReadTerms && location !== "/terms-and-conditions") {
      navigate("/terms-and-conditions");
    }
    setCheckedTerms(true);
  }, [location, navigate]);
  
  if (!checkedTerms) return null;

  return (
    <div className="flex flex-col bg-gray-200">
      <ToastContainer autoClose={4000}/>
      <Switch>
        <Route path="/" component={ProjectsPage} />
        <Route path="/projects" component={ProjectsPage} />
        <Route path="/create" component={NewProject} />
        <Route path="/project/:uuid" component={ProjectPage} />
        <Route path="/project/:uuid/evaluate" component={ProjectPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/terms-and-conditions" component={TermsAndConditionsPage}/>
        <Route path="/screening" component={ScreeningPage}/>
        <Route path="*" component={NotFoundPage} />
      </Switch>
    </div>
  );
}

export default App;
