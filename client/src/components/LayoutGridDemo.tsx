import React from "react";
import { LayoutGrid } from "@/components/ui/layout-grid";

// Beispielbilder für die Designvorlagen
const DesignPlaceholders = {
  square: "https://images.unsplash.com/photo-1476231682828-37e571bc172f?q=80&w=1200&auto=format&fit=crop",
  portrait: "https://images.unsplash.com/photo-1464457312035-3d7d0e0c058e?q=80&w=1200&auto=format&fit=crop",
  landscape: "https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?q=80&w=1200&auto=format&fit=crop",
  banner: "https://images.unsplash.com/photo-1475070929565-c985b496cb9f?q=80&w=1200&auto=format&fit=crop"
};

export function LayoutGridDemo() {
  return (
    <div className="h-full w-full">
      <LayoutGrid cards={cards} />
    </div>
  );
}

const SquareFormatInfo = () => {
  return (
    <div>
      <p className="font-bold md:text-2xl text-xl text-white">
        Square Format
      </p>
      <p className="font-normal text-base my-2 max-w-lg text-neutral-200">
        Perfect for social media posts, profile images, and product showcases. This versatile 1:1 format works on all platforms.
      </p>
    </div>
  );
};

const PortraitFormatInfo = () => {
  return (
    <div>
      <p className="font-bold md:text-2xl text-xl text-white">
        Portrait Format
      </p>
      <p className="font-normal text-base my-2 max-w-lg text-neutral-200">
        Ideal for flyers, posters, and social stories. This tall format captures attention with its vertical space.
      </p>
    </div>
  );
};

const LandscapeFormatInfo = () => {
  return (
    <div>
      <p className="font-bold md:text-2xl text-xl text-white">
        Landscape Format
      </p>
      <p className="font-normal text-base my-2 max-w-lg text-neutral-200">
        Perfect for web banners, presentation slides, and video thumbnails. This wide format offers plenty of horizontal space.
      </p>
    </div>
  );
};

const BannerFormatInfo = () => {
  return (
    <div>
      <p className="font-bold md:text-2xl text-xl text-white">
        Banner Format
      </p>
      <p className="font-normal text-base my-2 max-w-lg text-neutral-200">
        Ideal for website headers, email campaigns, and social media covers. This extra-wide format creates visual impact.
      </p>
    </div>
  );
};

const cards = [
  {
    id: 1,
    content: <SquareFormatInfo />,
    className: "md:col-span-1",
    thumbnail: DesignPlaceholders.square,
  },
  {
    id: 2,
    content: <PortraitFormatInfo />,
    className: "col-span-1",
    thumbnail: DesignPlaceholders.portrait,
  },
  {
    id: 3,
    content: <LandscapeFormatInfo />,
    className: "col-span-1",
    thumbnail: DesignPlaceholders.landscape,
  },
  {
    id: 4,
    content: <BannerFormatInfo />,
    className: "md:col-span-2",
    thumbnail: DesignPlaceholders.banner,
  },
];