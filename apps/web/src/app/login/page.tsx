import Link from 'next/link';
import { login, signup } from './actions'
import { Sparkles, KeyRound } from 'lucide-react'

export default async function LoginPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  }
) {
  const searchParams = await props.searchParams;
  const message = searchParams?.message as string | undefined;

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-dark/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary-dark/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary-gradient rounded-2xl flex items-center justify-center shadow-[0_0_30px_var(--primary-glow)] rotate-12 hover:rotate-0 transition-transform duration-500">
                <span className="text-3xl font-black text-white font-display">V</span>
            </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-on-surface font-display">
          Welcome to Verlyn
        </h2>
        <p className="mt-2 text-center text-sm text-on-surface-variant">
          Sign in to connect with your professional network.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-card py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10 border border-outline-variant/20">
          
          {message && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm font-semibold flex items-center gap-2">
                <KeyRound size={16} />
                {message}
            </div>
          )}

          <form className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="Required for Sign Up only"
                className="w-full bg-surface-low text-on-surface rounded-xl px-4 py-3 border border-outline-variant/10 focus:ring-1 focus:ring-primary-light outline-none transition-all placeholder:text-on-surface-variant/50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full bg-surface-low text-on-surface rounded-xl px-4 py-3 border border-outline-variant/10 focus:ring-1 focus:ring-primary-light outline-none transition-all placeholder:text-on-surface-variant/50"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Password</label>
                <Link href="/login/reset" className="text-xs font-bold text-v-cyan hover:underline transition-all">Forgot your password?</Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full bg-surface-low text-on-surface rounded-xl px-4 py-3 border border-outline-variant/10 focus:ring-1 focus:ring-primary-light outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Gender (For Signup)</label>
              <div className="flex bg-surface-low p-1 rounded-xl border border-outline-variant/10">
                <label className="flex-1 text-center cursor-pointer">
                  <input type="radio" name="gender" value="male" className="peer sr-only" defaultChecked />
                  <div className="py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-on-surface-variant peer-checked:bg-primary-dark/20 peer-checked:text-primary-light transition-all">Male</div>
                </label>
                <label className="flex-1 text-center cursor-pointer">
                  <input type="radio" name="gender" value="female" className="peer sr-only" />
                  <div className="py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-on-surface-variant peer-checked:bg-secondary-dark/20 peer-checked:text-secondary-light transition-all">Female</div>
                </label>
                <label className="flex-1 text-center cursor-pointer">
                  <input type="radio" name="gender" value="other" className="peer sr-only" />
                  <div className="py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-on-surface-variant peer-checked:bg-white/10 peer-checked:text-white transition-all">Other</div>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
                <button
                    formAction={login}
                    className="flex-1 flex justify-center py-3 px-4 border border-outline-variant/20 rounded-xl text-sm font-bold text-on-surface bg-surface-low hover:bg-surface-high transition-all"
                >
                    Sign In
                </button>
                <button
                    formAction={signup}
                    className="flex-1 primary-btn flex items-center justify-center gap-2 py-3 px-4 shadow-[0_0_15px_var(--primary-glow)]"
                >
                    <Sparkles size={16} /> Sign Up
                </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  )
}
