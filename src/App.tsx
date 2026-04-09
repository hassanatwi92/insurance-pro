import { useState } from "react";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Companies from "@/pages/companies";
import type { Page } from "@/types";

function App() {
  const [username, setUsername] = useState<string | null>(
    () => sessionStorage.getItem("insurance_auth")
  );
  const [page, setPage] = useState<Page>("clients");

  if (!username) {
    return <Login onLogin={(u) => setUsername(u)} />;
  }

  const props = { username, page, setPage };

  return page === "clients"
    ? <Home {...props} />
    : <Companies {...props} />;
}

export default App;
