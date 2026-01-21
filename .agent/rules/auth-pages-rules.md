# Authentication Page Rules (Login/Signup)

## Design Intent
The authentication pages (Login and Signup) are designed to feel professional, trustworthy, and distraction-free. They reuse the premium "glassmorphism" aesthetic from the landing page to ensure brand consistency.

## Layout & Background
- **Atmospheric Background**: Reuses core imagery (e.g., `teacher_at_computer`) with high blur (`blur-[100px]`) and low opacity (`0.3`) to create a calm, focused environment.
- **Micro-Form Layout**: Fixed max-size container (`max-w-md`) centered horizontally and vertically.
- **Entry Animation**: Uses `animate-in fade-in slide-in-from-bottom` for a smooth, high-end transition upon page load.

## Component Specifications
- **Input Fields**:
    - Style: `bg-background/50 backdrop-blur-sm`, `rounded-xl`, `h-10`.
    - Focus: Subtle primary ring for clarity.
- **Auth Card**:
    - Style: `bg-card/40 backdrop-blur-xl`, `rounded-[2rem]`, `border-white/20`.
    - Purpose: Provides a clear, elevated surface for focus.
- **Buttons**:
    - Primary Action: `bg-foreground text-background`, `rounded-xl`, `h-12`.
    - Secondary Toggle: `variant="outline"`, `bg-white/50`, `rounded-xl`.

## UX Rules
- **Back-to-Home**: Always provide a visible "Back to Home" link to prevent user friction.
- **Consistent Icons**: Use `LogIn` for login actions and `UserPlus` for signup actions, consistent with Lucide React patterns.
- **Loading States**: (Future) Ensure primary buttons show a loading indicator during authentication.

trigger: model_decision
