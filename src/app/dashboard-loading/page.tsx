"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLoadingPage() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/dashboard");

    const timer = window.setTimeout(() => {
      router.push("/dashboard");
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <section className="flex min-h-screen items-center justify-center bg-white px-6 text-slate-950">
      <div className="flex flex-col items-center">
        <div className="loadingio-spinner-chunk-2by998twmg8" aria-label="Loading dashboard">
          <div className="ldio-yzaezf3dcmj">
            <div>
              <div>
                <div />
                <div />
                <div />
                <div />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ldio-yzaezf3dcmj-r {
          0%, 25%, 50%, 75%, 100% {
            animation-timing-function: cubic-bezier(0, 1, 0, 1);
          }
          0% {
            transform: scale(.7) rotate(180deg);
          }
          25% {
            transform: scale(.7) rotate(270deg);
          }
          50% {
            transform: scale(.7) rotate(360deg);
          }
          75% {
            transform: scale(.7) rotate(450deg);
          }
          100% {
            transform: scale(.7) rotate(540deg);
          }
        }

        @keyframes ldio-yzaezf3dcmj-z {
          0%, 50%, 100% {
            animation-timing-function: cubic-bezier(1, 0, 0, 1);
          }
          0%, 50% {
            transform: scale(1);
          }
          100% {
            transform: scale(.5);
          }
        }

        @keyframes ldio-yzaezf3dcmj-p {
          0%, 50%, 100% {
            animation-timing-function: cubic-bezier(1, 0, 0, 1);
          }
          0% {
            transform: scale(0);
          }
          50%, 100% {
            transform: scale(1);
          }
        }

        @keyframes ldio-yzaezf3dcmj-c {
          0%, 25%, 50%, 75%, 100% {
            animation-timing-function: cubic-bezier(0, 1, 0, 1);
          }
          0%, 75%, 100% {
            background: #2563eb;
          }
          25% {
            background: #0f172a;
          }
          50% {
            background: #38bdf8;
          }
        }

        .loadingio-spinner-chunk-2by998twmg8 {
          display: inline-block;
          height: 200px;
          overflow: hidden;
          width: 200px;
        }

        .ldio-yzaezf3dcmj {
          backface-visibility: hidden;
          height: 100%;
          position: relative;
          transform: translateZ(0) scale(1);
          transform-origin: 0 0;
          width: 100%;
        }

        .ldio-yzaezf3dcmj div {
          box-sizing: content-box;
        }

        .ldio-yzaezf3dcmj > div {
          animation: ldio-yzaezf3dcmj-r 4s linear infinite;
          transform-origin: 100px 100px;
        }

        .ldio-yzaezf3dcmj > div > div {
          animation: ldio-yzaezf3dcmj-z 1s linear infinite;
          height: 200px;
          position: absolute;
          transform-origin: 200px 200px;
          width: 200px;
        }

        .ldio-yzaezf3dcmj > div > div div {
          background: #2563eb;
          height: 100px;
          position: absolute;
          transform-origin: 50px 50px;
          width: 100px;
        }

        .ldio-yzaezf3dcmj > div > div div:nth-child(1) {
          animation: ldio-yzaezf3dcmj-p 1s linear infinite, ldio-yzaezf3dcmj-c 4s linear infinite;
          left: 0;
          top: 0;
        }

        .ldio-yzaezf3dcmj > div > div div:nth-child(2) {
          animation: ldio-yzaezf3dcmj-p 1s linear infinite, ldio-yzaezf3dcmj-c 4s linear infinite;
          left: 100px;
          top: 0;
        }

        .ldio-yzaezf3dcmj > div > div div:nth-child(3) {
          animation: ldio-yzaezf3dcmj-p 1s linear infinite, ldio-yzaezf3dcmj-c 4s linear infinite;
          left: 0;
          top: 100px;
        }

        .ldio-yzaezf3dcmj > div > div div:nth-child(4) {
          animation: ldio-yzaezf3dcmj-c 4s linear infinite;
          left: 100px;
          top: 100px;
          transform: scale(1);
        }

        @media (prefers-reduced-motion: reduce) {
          .ldio-yzaezf3dcmj > div,
          .ldio-yzaezf3dcmj > div > div,
          .ldio-yzaezf3dcmj > div > div div {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
