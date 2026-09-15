import HowItWorksView from "../components/ui/HowItWorksView";
import generateMetadata from "@/utils/generateMetadata";

export const metadata = generateMetadata({
  title: "How It Works",
  description:
    "How booking a court on IcyPlay works: pick your hours, pay the venue by GCash, and get confirmed by somebody at the desk.",
  path: "/how-it-works",
});

function Page() {
  return <HowItWorksView />;
}

export default Page;
