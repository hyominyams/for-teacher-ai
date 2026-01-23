import ScrollExpandMedia from "@/components/blocks/scroll-expansion-hero";
import { DisplayCard, GridContainer } from "@/components/ui/display-elements";
import { FeaturesGrid } from "@/components/blocks/features-grid";
import { LandingCTA } from "@/components/blocks/landing-cta";

const FEATURES = [
  {
    title: "행동특성 및 종합의견",
    description: "학생분석 키워드로 1분 완성",
    url: "/korean_behavioral_traits_kids_v2_1769013615764.png",
    badge: "Start"
  },
  {
    title: "교과 학기말 종합의견",
    description: "교과별 평가기준 및 성취수준을 고려한 개인 맞춤형 시스템",
    url: "/korean_studying_hand_pencil_v2_1769013648129.png",
    badge: "Start"
  },
  {
    title: "창의적 체험활동",
    description: "학생이 참여한 활동에 맞춰 자동 작성",
    url: "/korean_creative_activities_kids_v2_1769013677774.png",
    badge: "Start"
  },
  {
    title: "문서작성",
    description: "일지 작성, 공문 작성 등 선생님의 업무 보조",
    url: "/korean_teacher_at_computer_v2_1769013704052.png",
    badge: "Waiting"
  }
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background pb-32">
      <ScrollExpandMedia
        mediaType="video"
        mediaSrc="/A_calm_premium_1080p_202601220123.mp4"
        bgImageSrc="/background.jpeg"
        titleLeft="혁신적인"
        titleRight="교육의 시작"
        date="For Teacher AI"
        scrollToExpand="Scroll to Experience"
        textBlend
      >
        <div className="space-y-64 py-20">
          <section id="philosophy" className="max-w-4xl mx-auto space-y-12 px-6 scroll-mt-32">
            <h3 className="text-sm font-black text-primary tracking-[0.4em] uppercase flex items-center gap-3">
              <span className="w-8 h-px bg-primary" /> Philosophy
            </h3>
            <h2 className="text-4xl md:text-7xl font-black leading-[1.05] tracking-tight text-foreground text-balance">
              기록의 가치를 더하고 <br />
              시간의 무게를 덜다
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed font-medium">
              선생님은 전문적인 시선으로 아이들의 성장을 담고,
              복잡한 과정은 AI가 대신합니다
            </p>
          </section>

          <section id="vision" className="max-w-4xl mx-auto space-y-12 text-right px-6 scroll-mt-32">
            <h3 className="text-sm font-black text-primary tracking-[0.4em] uppercase flex items-center justify-end gap-3">
              Vision <span className="w-8 h-px bg-primary" />
            </h3>
            <h2 className="text-4xl md:text-7xl font-black leading-[1.05] tracking-tight text-foreground text-balance">
              교육의 본질에 <br />
              집중할 수 있도록
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed font-medium">
              수업에 집중할 수 있도록
              불필요한 문서는 AI Assistant가 대신합니다
            </p>
          </section>

          <section id="services" className="container mx-auto space-y-16 px-6 scroll-mt-32">
            <div className="text-center space-y-6">
              <h3 className="text-sm font-black text-primary tracking-[0.4em] uppercase">
                Services
              </h3>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                선생님을 위한 <br className="md:hidden" />
                최적의 솔루션
              </h2>
            </div>
            <GridContainer cols={2}>
              {FEATURES.map((feature, i) => (
                <DisplayCard
                  key={i}
                  title={feature.title}
                  description={feature.description}
                  imageUrl={feature.url}
                  badge={feature.badge}
                />
              ))}
            </GridContainer>
          </section>

          <section id="features" className="container mx-auto space-y-16 px-6 scroll-mt-32">
            <div className="text-center space-y-6">
              <h3 className="text-sm font-black text-primary tracking-[0.4em] uppercase">
                Features
              </h3>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                AI 기술이 더하는 <br className="md:hidden" />
                섬세한 기록의 힘
              </h2>
            </div>
            <FeaturesGrid />
          </section>
        </div>
      </ScrollExpandMedia>

      <LandingCTA />
    </main>
  );
}
