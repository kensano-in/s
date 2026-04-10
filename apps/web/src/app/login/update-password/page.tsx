import { updatePassword } from '../actions'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default async function UpdatePasswordPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  }
) {
  const searchParams = await props.searchParams;
  const message = searchParams?.message as string | undefined;

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-dark/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary-dark/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <h2 className="text-center text-3xl font-extrabold text-on-surface font-display">
          Update Cipher
        </h2>
        <p className="mt-2 text-center text-sm text-on-surface-variant">
          Enter your new cryptographic key to re-enter Sovereign Space.
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

          <form className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">New Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full bg-surface-low text-on-surface rounded-xl px-4 py-3 border border-outline-variant/10 focus:ring-1 focus:ring-primary-light outline-none transition-all placeholder:text-on-surface-variant/50"
              />
            </div>

            <div className="pt-2">
                <button
                    formAction={updatePassword}
                    className="w-full primary-btn flex items-center justify-center gap-2 py-3 px-4 shadow-[0_0_15px_var(--primary-glow)]"
                >
                    <ShieldCheck size={16} /> Seal Authentication
                </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  )
}
