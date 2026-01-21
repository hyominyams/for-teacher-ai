# Landing CTA Component Rules

## Design Intent
The CTA (Call to Action) section is designed to be the final high-impact touchpoint for teachers before they convert. It follows a minimalist, premium aesthetic inspired by modern SaaS landing pages.

## Layout Structure
- **Full-Width Background**: Uses a blurred high-key image of a teacher's workspace to provide context without distraction.
- **Micro-Container**: While the background is full-width, the content is centered within a `max-w-4xl` container for optimal readability.
- **Vertical Hierarchy**:
  1. **Badge**: A dark pill-shaped badge ("Get started") to signal the transition to action.
  2. **Hero Heading**: Large, black, tracking-tight typography for maximum impact.
  3. **Description**: Medium-weight, balanced text providing the final "Why".
  4. **Action Pair**: Two side-by-side buttons with icons for professional visual weight.

## Components & Props
- **Badge**: `bg-foreground text-background px-5 py-2 rounded-full`
- **Heading**: `text-4xl md:text-7xl font-black`
- **Buttons**:
    - **Secondary**: White/Border with `Phone` icon.
    - **Primary**: Black (`bg-foreground`) with `ArrowRight` icon.
    - **Radius**: `rounded-[1.25rem]` for a modern, soft-touch feel.

## Implementation Details
- **Blur Intensity**: `blur-[80px]` ensures the background image creates a "color aura" rather than a distracting scene.
- **Overlay**: A semi-transparent white overlay (`bg-white/60`) is used to ensure text contrast (WCAG compliance).

trigger: model_decision
