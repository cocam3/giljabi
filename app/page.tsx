import Link from "next/link";

const destinations = [
  {
    href: "/find",
    title: "찾다",
    description: "희망 진로로 맞는 트랙 찾기",
  },
  {
    href: "/plan",
    title: "짜다",
    description: "학기별 수강 계획 세우기",
  },
  {
    href: "/guard",
    title: "지키다",
    description: "트랙 변경·휴학 등 계획 점검하기",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col justify-center px-6 py-16 sm:px-10 sm:py-24">
      <header className="mb-12 sm:mb-16">
        <h1 className="text-5xl font-bold tracking-tight text-emerald-900 sm:text-6xl">
          길잡이
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl">
          진로에서 졸업까지, 내 전공 설계를 한 곳에서
        </p>
      </header>
      <nav aria-label="전공 설계" className="grid gap-4 md:grid-cols-3 md:gap-6">
        {destinations.map(({ href, title, description }) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl border border-slate-200 bg-white p-7 transition-colors hover:border-emerald-700 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 sm:p-8"
          >
            <h2 className="text-2xl font-bold text-emerald-900">{title}</h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              {description}
            </p>
          </Link>
        ))}
      </nav>
    </main>
  );
}
