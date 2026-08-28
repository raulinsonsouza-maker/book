type NavIconProps = {
  className?: string;
};

const base = "h-[18px] w-[18px]";

export function NavIconHome({ className = base }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V19a2 2 0 0 1-2 2h-4v-6H10v6H6a2 2 0 0 1-2-2v-8.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NavIconCalendar({ className = base }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3.5v2M17 3.5v2M4.5 8h15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6 6.5h12a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 12.5h2M14 12.5h2M8 16h2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NavIconBookings({ className = base }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 6h12M8 10.5h12M8 15h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect
        x="3.5"
        y="5"
        width="3"
        height="3"
        rx="0.75"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="3.5"
        y="9.5"
        width="3"
        height="3"
        rx="0.75"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="3.5"
        y="14"
        width="3"
        height="3"
        rx="0.75"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function NavIconPages({ className = base }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 4.5h8l3 3V19a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 19V6A1.5 1.5 0 0 1 8 4.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M16 4.5V8h3M9.5 12h5M9.5 15.5h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NavIconFinance({ className = base }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 8.5h15a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17V10a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M3 11h18M16.5 14.5h.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NavIconIntegrations({ className = base }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9.5 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM14.5 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8 14.5h8M16.5 6.5 7.5 17.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NavIconAccount({ className = base }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8.5" r="3.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.5 19.5c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NavIconCheckout({ className = base }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7.5h16l-1.2 9.6a2 2 0 0 1-2 1.7H7.2a2 2 0 0 1-2-1.7L4 7.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 7.5V5.8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2V7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M9 11.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function NavIconMenu({ className = "h-5 w-5" }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 7h14M5 12h14M5 17h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
