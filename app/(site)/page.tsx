import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { WELCOME_SEEN_COOKIE } from "@/lib/welcomeCookie";

export default async function Page() {
  const cookieStore = await cookies();

  if (cookieStore.has(WELCOME_SEEN_COOKIE)) {
    redirect("/home");
  }

  redirect("/welcome");
}
