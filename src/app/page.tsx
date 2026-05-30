import { auth } from "@/auth";
import { AppClient } from "@/components/AppClient";

export default async function Home() {
  const session = await auth();

  return <AppClient initialSession={session} />;
}
