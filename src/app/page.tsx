import { Metadata } from "next";
import App from "./app";
import { APP_NAME, APP_DESCRIPTION, APP_OG_IMAGE_URL } from "~/lib/constants";
import { getMiniAppEmbedMetadata } from "~/lib/utils";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: APP_NAME,
    openGraph: {
      title: APP_NAME,
      description: APP_DESCRIPTION,
      images: [APP_OG_IMAGE_URL],
    },
    other: {
      "fc:miniapp": JSON.stringify(getMiniAppEmbedMetadata(undefined, 'miniapp')),
      "fc:frame": JSON.stringify(getMiniAppEmbedMetadata(undefined, 'frame')),
    },
  };
}

export default function Home() {
  return (<App />);
}
