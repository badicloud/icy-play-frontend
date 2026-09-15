import HelpCenterView from "../components/ui/HelpCenterView";
import generateMetadata from "@/utils/generateMetadata";

export const metadata = generateMetadata({
  title: "Help Center",
  description:
    "Answers about booking a court on IcyPlay: accounts, holds, paying the venue, moving a booking, and running a venue.",
  path: "/help-center",
});

function Page() {
  return <HelpCenterView />;
}

export default Page;
