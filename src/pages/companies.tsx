import Home from "./home";
import type { Page } from "../types";

export default function Companies({ username, page, setPage }: { username: string; page: Page; setPage: (p: Page) => void }) {
  return <Home username={username} page={page} setPage={setPage} isCompaniesPage={true} />;
}
