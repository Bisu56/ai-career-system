import { Link } from "react-router-dom";
import { FiArrowRight, FiCheck } from "react-icons/fi";

const careerFit = [
  { career: "Backend Developer", confidence: 59 },
  { career: "Data Analyst", confidence: 3 },
  { career: "UX Designer", confidence: 3 },
];

const steps = [
  { title: "Upload", body: "Add your resume as a PDF, up to 2 MB. Paste a job post too if you want a direct match score." },
  { title: "Review", body: "Read your career fit, resume score, missing skills, courses and interview questions in one report." },
  { title: "Apply", body: "Apply to open roles in one click. Your resume goes with it and every status change shows up in your list." },
];

const employerPoints = [
  "Post a job with the skills you need. An admin checks it before it goes live.",
  "Applicants are scored against your requirements as soon as you open the list.",
  "Open any applicant to see matched skills, gaps, their cover letter and the original PDF.",
];

export default function Home() {
  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 md:pt-20 lg:grid-cols-[1fr_1.1fr]">
        <div className="reveal">
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-ink md:text-5xl lg:text-[3.4rem]">
            See which jobs your resume is ready for.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-slate-600">
            Upload your CV and get a career match, the skills you're missing, and open roles that fit.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-medium text-white shadow-sm shadow-brand-900/10 transition hover:bg-brand-700 active:scale-[0.98]"
            >
              Analyse my resume <FiArrowRight />
            </Link>
            <Link
              to="/register?as=employer"
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-ink transition hover:border-slate-400 active:scale-[0.98]"
            >
              Post a job
            </Link>
          </div>
        </div>

        <div className="reveal reveal-delay relative">
          <div className="absolute -inset-3 -z-10 rounded-3xl bg-brand-100/60 md:-inset-5" />
          <img
            src="/screens/analysis.webp"
            alt="A CareerAI report showing an 83% resume score, Backend Developer as the top career match, extracted skills and suggested job titles"
            width="1009"
            height="430"
            className="w-full rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
          />
        </div>
      </section>

      <section id="seekers" className="scroll-mt-20 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            One upload, a full report.
          </h2>
          <p className="mt-3 max-w-xl text-slate-600">
            Everything below comes from a single PDF and takes a few seconds.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-brand-50 p-7 md:col-span-2">
              <h3 className="text-lg font-semibold text-ink">A career fit you can check</h3>
              <p className="mt-1 max-w-md text-sm text-slate-600">
                A trained model ranks 25 career paths and tells you how sure it is.
              </p>
              <div className="mt-6 space-y-3">
                {careerFit.map((c) => (
                  <div key={c.career} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 text-sm">
                    <span className="truncate text-slate-700">{c.career}</span>
                    <span className="h-2 rounded-full bg-brand-600" style={{ width: `${Math.max(c.confidence, 2)}%` }} />
                    <span className="text-right tabular-nums text-slate-500">{c.confidence}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-7">
              <h3 className="text-lg font-semibold text-ink">What you're missing</h3>
              <p className="mt-1 text-sm text-slate-600">
                The core skills for your best-fit role that your resume doesn't show yet.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["git", "docker", "rest api"].map((s) => (
                  <span key={s} className="rounded-md bg-red-50 px-2.5 py-1 text-sm text-red-700">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-7">
              <h3 className="text-lg font-semibold text-ink">Courses and interview prep</h3>
              <p className="mt-1 text-sm text-slate-600">
                Five courses and eight likely interview questions for the role you're aiming at.
              </p>
            </div>

            <div className="rounded-2xl bg-ink p-7 text-white md:col-span-2">
              <h3 className="text-lg font-semibold">Jobs that fit today</h3>
              <p className="mt-1 max-w-md text-sm text-slate-300">
                Open roles on CareerAI, ranked by how many of their required skills you already have.
              </p>
              <Link
                to="/register"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-white underline-offset-4 hover:underline"
              >
                Analyse my resume <FiArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">How it works</h2>
        <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, i) => (
            <li key={step.title} className="border-t-2 border-ink pt-5">
              <p className="text-sm tabular-nums text-slate-400">{i + 1}</p>
              <h3 className="mt-1 text-xl font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="employers" className="scroll-mt-20 border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.15fr_1fr]">
          <img
            src="/screens/applicants.webp"
            alt="An employer's applicant list for a Laravel Backend Developer job, ranked by AI match score with one applicant expanded"
            width="1036"
            height="689"
            loading="lazy"
            className="order-2 w-full rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/10 lg:order-1"
          />
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              Hiring? Start with a shortlist, not a pile.
            </h2>
            <ul className="mt-8 space-y-5">
              {employerPoints.map((point) => (
                <li key={point} className="flex gap-3 text-slate-700">
                  <FiCheck className="mt-1 h-4 w-4 shrink-0 text-brand-600" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/register?as=employer"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 active:scale-[0.98]"
            >
              Post a job <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-brand-50 px-8 py-10 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
              Your next step starts with one PDF.
            </h2>
            <p className="mt-2 text-slate-600">It is free for job seekers.</p>
          </div>
          <Link
            to="/register"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-[0.98]"
          >
            Analyse my resume <FiArrowRight />
          </Link>
        </div>
      </section>
    </div>
  );
}
