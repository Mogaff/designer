import NumberFlow from '@number-flow/react'
import React from "react";

export function PricingInteraction ({
  starterMonth,
  starterAnnual,
  proMonth,
  proAnnual,
}:{
  starterMonth: number;
  starterAnnual: number;
  proMonth: number;
  proAnnual: number;
}) {
  const [active, setActive] = React.useState(0);
  const [period, setPeriod] = React.useState(0);
  const handleChangePlan = (index: number) => {
    setActive(index);
  };
  const handleChangePeriod = (index: number) => {
    setPeriod(index);
    if (index === 0) {
      setStarter(starterMonth);
      setPro(proMonth);
    } else {
      setStarter(starterAnnual);
      setPro(proAnnual);
    }
  };
  const [starter, setStarter] = React.useState(starterMonth);
  const [pro, setPro] = React.useState(proMonth);

  return (
    <div className="rounded-[32px] p-4 shadow-md max-w-sm w-full flex flex-col items-center gap-3 bg-black/20 backdrop-blur-sm border border-indigo-500/30">
        <div className="rounded-full relative w-full bg-white/10 p-1.5 flex items-center">
          <button
            className="font-semibold rounded-full w-full p-1.5 text-white z-20"
            onClick={() => handleChangePeriod(0)}
          >
            Monthly
          </button>
          <button
            className="font-semibold rounded-full w-full p-1.5 text-white z-20"
            onClick={() => handleChangePeriod(1)}
          >
            Yearly
          </button>
          <div
            className="p-1.5 flex items-center justify-center absolute inset-0 w-1/2 z-10"
            style={{
              transform: `translateX(${period * 100}%)`,
              transition: "transform 0.3s",
            }}
          >
            <div className="bg-indigo-500/60 backdrop-blur-sm shadow-sm rounded-full w-full h-full"></div>
          </div>
        </div>
        <div className="w-full relative flex flex-col items-center justify-center gap-3 mt-2">
          <div
            className="w-full flex justify-between cursor-pointer border border-white/20 p-4 rounded-2xl backdrop-blur-sm"
            onClick={() => handleChangePlan(0)}
          >
            <div className="flex flex-col items-start">
              <p className="font-semibold text-xl text-white">Free</p>
              <p className="text-white/70 text-md">
                <span className="text-white font-medium">$0.00</span>/month
              </p>
            </div>
            <div
              className="border-2 border-white/50 size-6 rounded-full mt-0.5 p-1 flex items-center justify-center"
              style={{
                borderColor: `${active === 0 ? "#6366f1" : "rgba(255, 255, 255, 0.5)"}`,
                transition: "border-color 0.3s",
              }}
            >
              <div
                className="size-3 bg-indigo-500 rounded-full"
                style={{
                  opacity: `${active === 0 ? 1 : 0}`,
                  transition: "opacity 0.3s",
                }}
              ></div>
            </div>
          </div>
          <div
            className="w-full flex justify-between cursor-pointer border border-white/20 p-4 rounded-2xl backdrop-blur-sm"
            onClick={() => handleChangePlan(1)}
          >
            <div className="flex flex-col items-start">
              <p className="font-semibold text-xl flex items-center gap-2 text-white">
                Starter{" "}
                <span className="py-1 px-2 block rounded-lg bg-orange-500/20 text-orange-500 text-sm">
                  Popular
                </span>
              </p>
              <p className="text-white/70 text-md flex">
                <span className="text-white font-medium flex items-center">
                  ${" "}
                  <NumberFlow
                    className="text-white font-medium"
                    value={starter}
                  />
                </span>
                /month
              </p>
            </div>
            <div
              className="border-2 border-white/50 size-6 rounded-full mt-0.5 p-1 flex items-center justify-center"
              style={{
                borderColor: `${active === 1 ? "#6366f1" : "rgba(255, 255, 255, 0.5)"}`,
                transition: "border-color 0.3s",
              }}
            >
              <div
                className="size-3 bg-indigo-500 rounded-full"
                style={{
                  opacity: `${active === 1 ? 1 : 0}`,
                  transition: "opacity 0.3s",
                }}
              ></div>
            </div>
          </div>
          <div
            className="w-full flex justify-between cursor-pointer border border-white/20 p-4 rounded-2xl backdrop-blur-sm"
            onClick={() => handleChangePlan(2)}
          >
            <div className="flex flex-col items-start">
              <p className="font-semibold text-xl text-white">Pro</p>
              <p className="text-white/70 text-md flex">
                <span className="text-white font-medium flex items-center">
                  ${" "}
                  <NumberFlow
                    className="text-white font-medium"
                    value={pro}
                  />
                </span>
                /month
              </p>
            </div>
            <div
              className="border-2 border-white/50 size-6 rounded-full mt-0.5 p-1 flex items-center justify-center"
              style={{
                borderColor: `${active === 2 ? "#6366f1" : "rgba(255, 255, 255, 0.5)"}`,
                transition: "border-color 0.3s",
              }}
            >
              <div
                className="size-3 bg-indigo-500 rounded-full"
                style={{
                  opacity: `${active === 2 ? 1 : 0}`,
                  transition: "opacity 0.3s",
                }}
              ></div>
            </div>
          </div>
          <div
            className={`w-full h-[88px] absolute top-0 border-2 border-indigo-500 rounded-2xl`}
            style={{
              transform: `translateY(${active * 88 + 12 * active}px)`,
              transition: "transform 0.3s",
            }}
          ></div>
        </div>
        <button className="rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-lg text-white w-full p-3 active:scale-95 transition-transform duration-300 mt-4 hover:from-indigo-600 hover:to-indigo-700 shadow-lg">
          Get Started
        </button>
      </div>
  );
};