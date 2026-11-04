import { useRef } from 'react'
import { X } from 'lucide-react'
import { profile } from '../content/site'

/**
 * Green "#OPENTOWORK" band drawn over the lower edge of the portrait, in the
 * style of LinkedIn's profile frame. Ends fade out towards the top.
 */
function OpenToWorkFrame() {
  return (
    <svg viewBox="0 0 200 200" aria-hidden className="pointer-events-none absolute inset-0 size-full">
      <defs>
        <linearGradient id="otw-fade" gradientUnits="userSpaceOnUse" x1="0" y1="52" x2="0" y2="118">
          <stop offset="0" stopColor="#3f6b35" stopOpacity="0" />
          <stop offset="1" stopColor="#3f6b35" />
        </linearGradient>
        <path id="otw-text-path" d="M13.5 68.5 A92 92 0 1 0 186.5 68.5" />
      </defs>
      <path d="M19.2 70.6 A86 86 0 1 0 180.8 70.6" fill="none" stroke="url(#otw-fade)" strokeWidth="28" />
      <text fill="#fff" fontSize="15" fontWeight="700" letterSpacing="1.5">
        <textPath href="#otw-text-path" startOffset="50%" textAnchor="middle">
          #OPENTOWORK
        </textPath>
      </text>
    </svg>
  )
}

/**
 * Navbar avatar that opens a LinkedIn-style "Profile photo" viewer. Uses the
 * native <dialog>: focus is trapped while open, Esc closes it, and focus returns
 * to the avatar afterwards.
 */
export function ProfileCard() {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const open = () => {
    const d = dialogRef.current
    if (!d) return
    if (typeof d.showModal === 'function') d.showModal()
    else d.setAttribute('open', '')
  }
  const close = () => {
    const d = dialogRef.current
    if (!d) return
    if (typeof d.close === 'function') d.close()
    else d.removeAttribute('open')
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-label={`View ${profile.name}’s profile photo`}
        className="relative grid size-10 shrink-0 place-items-center rounded-full bg-[#3f6b35] p-[2px] transition-transform hover:scale-105 active:scale-95"
      >
        <img
          src={profile.portrait}
          alt=""
          width={40}
          height={40}
          decoding="async"
          className="size-full rounded-full border-2 border-surface object-cover"
        />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="profile-photo-title"
        onClick={(e) => e.target === e.currentTarget && close()}
        className="profile-dialog m-auto w-[min(94vw,58rem)] overflow-hidden rounded-xl bg-[#1d2226] p-0 text-white shadow-lift backdrop:bg-black/75"
      >
        <header className="flex items-center justify-between border-b border-white/10 py-3 pr-3 pl-5">
          <h2 id="profile-photo-title" className="text-xl font-medium">
            Profile photo
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close profile photo"
            className="grid size-10 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-6" aria-hidden />
          </button>
        </header>

        <div className="grid place-items-center px-5 py-10 sm:py-12">
          <figure className="relative aspect-square w-[min(78vw,22rem)]">
            <img
              src={profile.portrait}
              alt={`Profile photo of ${profile.name}`}
              width={600}
              height={600}
              className="size-full rounded-full object-cover"
            />
            <OpenToWorkFrame />
          </figure>
        </div>
      </dialog>
    </>
  )
}
