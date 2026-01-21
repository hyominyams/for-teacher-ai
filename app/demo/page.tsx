import { DisplayCard, GridContainer } from "@/components/ui/display-elements"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"
import { LandingCTA } from "@/components/blocks/landing-cta"

const DUMMY_IMAGES = [
    {
        title: "행동특성 및 종합의견",
        description: "학생분석 키워드로 1분 안에 완성하기",
        url: "/korean_behavioral_traits_kids_v2_1769013615764.png"
    },
    {
        title: "교과 학기말 종합의견",
        description: "교과별 평가기준 및 성취수준을 고려한 개인 맞춤형 시스템",
        url: "/korean_studying_hand_pencil_v2_1769013648129.png"
    },
    {
        title: "창의적 체험활동",
        description: "학생이 참여한 활동에 맞춰 자동으로 작성",
        url: "/korean_creative_activities_kids_v2_1769013677774.png"
    },
    {
        title: "문서작성",
        description: "일지 작성, 공문 작성 등 선생님의 업무 보조",
        url: "/korean_teacher_at_computer_v2_1769013704052.png"
    }
]

export default function DemoPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="container mx-auto px-4 pt-40 pb-20 space-y-32">
                {/* Header Section */}
                <section className="space-y-4">
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground lg:text-5xl">
                        Component <span className="text-primary italic font-black">Demo</span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl">
                        For Teacher AI 프로젝트에서 사용되는 고품격 UI 컴포넌트들을 시연합니다.
                    </p>
                </section>

                {/* Navbar Section */}
                <section className="p-10 rounded-3xl bg-card text-card-foreground border border-border shadow-xl shadow-primary/5">
                    <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
                        <span className="w-2 h-8 bg-primary rounded-full" />
                        01. Navbar (상단 네비게이션 - 데모 브라우저 상단 참조)
                    </h2>
                    <div className="p-8 rounded-xl bg-accent/50 border border-dashed border-border text-center">
                        <div className="h-20 flex items-center justify-center bg-background/50 rounded-lg border border-border">
                            <span className="text-lg font-black tracking-tighter">FOR TEACHER <span className="text-primary italic">AI</span></span>
                        </div>
                    </div>
                </section>

                {/* Grid Section - 2 Columns */}
                <section className="space-y-8">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <span className="w-2 h-8 bg-primary rounded-full" />
                        02. 2-Column Grid Layout
                    </h2>
                    <GridContainer cols={2}>
                        {DUMMY_IMAGES.slice(0, 2).map((img, i) => (
                            <DisplayCard
                                key={i}
                                title={img.title}
                                description={img.description}
                                imageUrl={img.url}
                                badge="준비중"
                            />
                        ))}
                    </GridContainer>
                </section>

                {/* Carousel Section */}
                <section className="space-y-8">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <span className="w-2 h-8 bg-primary rounded-full" />
                        03. Premium Carousel
                    </h2>
                    <div className="px-12">
                        <Carousel className="w-full max-w-5xl mx-auto">
                            <CarouselContent>
                                {DUMMY_IMAGES.map((img, i) => (
                                    <CarouselItem key={i} className="md:basis-1/2 lg:basis-1/3">
                                        <DisplayCard
                                            title={img.title}
                                            description={img.description}
                                            imageUrl={img.url}
                                        />
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious />
                            <CarouselNext />
                        </Carousel>
                    </div>
                </section>

                {/* CTA Section Showcase */}
                <section className="space-y-8 pb-40">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <span className="w-2 h-8 bg-primary rounded-full" />
                        04. Landing CTA Section (Full Width)
                    </h2>
                    <div className="relative -mx-[calc((100vw-100%)/2)] w-screen border-y border-border overflow-hidden">
                        <LandingCTA />
                    </div>
                </section>
            </main>
        </div>
    )
}
