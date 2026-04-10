import { resetPassword } from '../actions'
import { KeyRound, ShieldAlert, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default async function ResetPasswordPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  }
) {
  const searchParams = await props.searchParams;
  const message = searchParams?.message as string | undefined;
  const success = searchParams?.success as string | undefined;

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-dark/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary-dark/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <h2 className="text-center text-3xl font-extrabold text-on-surface font-display">
          Reset Password
        </h2>
        <p className="mt-2 text-center text-sm text-on-surface-variant">
          Enter your registered email to receive a secure reset link.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-card py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10 border border-outline-variant/20">
          
          {message && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm font-semibold flex items-center gap-2">
                <ShieldAlert size={16} />
                {message}
            </div>
          )}

          {success ? (
            <div className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-v-emerald/10 flex items-center justify-center rounded-2xl border border-v-emerald/20 text-v-emerald mb-4">
                    <CheckCircle2 size={32} />
                </div>
                <p className="text-sm text-on-surface-variant">
                    Check your email. We've sent you a secure password reset link.
                </p>
                <Link href="/login" className="block w-full py-3 px-4 border border-outline-variant/20 rounded-xl text-sm font-bold text-on-surface bg-surface-low hover:bg-surface-high transition-all uppercase tracking-widest text-center">
                    Back to Login
                </Link>
            </div>
          ) : (
            <form className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full bg-surface-low text-on-surface rounded-xl px-4 py-3 border border-outline-variant/10 focus:ring-1 focus:ring-primary-light outline-none transition-all placeholder:text-on-surface-variant/50"
                  placeholder="user@verlyn.app"
                />
              </div>

              <div className="pt-2">
                  <button
                      formAction={resetPassword}
                      className="w-full primary-btn flex items-center justify-center gap-2 py-3 px-4 shadow-[0_0_15px_var(--primary-glow)]"
                  >
                      <KeyRound size={16} /> Send Reset Link
                  </button>
              </div>

              <div className="text-center pt-4">
                  <Link href="/login" className="text-xs text-on-surface-variant hover:text-white uppercase tracking-widest transition-all">
                      Cancel
                  </Link>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
