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

export function NavIconDocument({ className = base }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3.5h7.5L19 8v11a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M14 3.5V8h5M9 12.5h6M9 15.5h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NavIconIntegrations({ className = base }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9.2 14.8 7.5 16.5a3.4 3.4 0 1 1-4.8-4.8l2.4-2.4a3.4 3.4 0 0 1 4.8 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.8 9.2 16.5 7.5a3.4 3.4 0 1 1 4.8 4.8l-2.4 2.4a3.4 3.4 0 0 1-4.8 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 14.5 14.5 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
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

export function NavIconSettings({ className = base }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 8.25a3.75 3.75 0 1 1 0 7.5 3.75 3.75 0 0 1 0-7.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.06-.94l2.03-1.58a.48.48 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54A.48.48 0 0 0 14.42 2h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.58.23-1.13.54-1.63.94l-2.39-.96a.49.49 0 0 0-.59.22L3.21 8.47a.48.48 0 0 0 .12.61l2.03 1.58c-.04.3-.06.62-.06.94s.02.64.06.94L3.33 14.12a.48.48 0 0 0-.12.61l1.92 3.32c.13.23.4.32.64.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.05.24.25.41.48.41h3.84c.23 0 .43-.17.48-.41l.36-2.54c.58-.22 1.13-.54 1.63-.94l2.39.96c.24.1.51 0 .64-.22l1.92-3.32a.48.48 0 0 0-.12-.61l-2.03-1.58Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NavIconServices({ className = base }: NavIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4.5 13.8 9h4.7l-3.8 2.9 1.4 4.6L12 14.2 7.9 16.5l1.4-4.6L5.5 9h4.7L12 4.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
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
