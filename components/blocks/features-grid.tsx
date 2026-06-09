"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
    BrainCircuit,
    BookOpenCheck,
    Sparkles,
    ShieldCheck
} from "lucide-react";

interface FeatureItemProps {
    icon: React.ElementType;
    title: string;
    description: string;
    index: number;
    iconBgColor?: string;
    iconColor?: string;
}

const FeatureItem = ({
    icon: Icon,
    title,
    description,
    index,
    iconBgColor = "bg-blue-500/10",
    iconColor = "text-blue-500"
}: FeatureItemProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="group relative p-8 rounded-[2rem] border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300"
        >
            <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
                iconBgColor
            )}>
                <Icon className={cn("w-6 h-6", iconColor)} />
            </div>

            <h3 className="text-xl font-bold text-foreground mb-4 tracking-tight group-hover:text-primary transition-colors">
                {title}
            </h3>

            <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                {description}
            </p>
        </motion.div>
    );
};

export const FeaturesGrid = () => {
    const features = [
        {
            icon: BrainCircuit,
            title: "지능형 문맥 분석",
            description: "학생의 특성을 나타내는 키워드만으로도 교육부 지침에 최적화된 문장을 구성합니다.",
            iconBgColor: "bg-blue-500/10",
            iconColor: "text-blue-500"
        },
        {
            icon: BookOpenCheck,
            title: "표준화된 표현 사전",
            description: "검증된 수만 건의 사례를 바탕으로 학습된 알고리즘이 자연스러운 문체 전환을 지원합니다.",
            iconBgColor: "bg-orange-500/10",
            iconColor: "text-orange-500"
        },
        {
            icon: Sparkles,
            title: "AI 맞춤형 다듬기",
            description: "반복되는 단어를 피하고, 학생 개개인의 개성이 돋보이도록 문장을 정교하게 다듬어줍니다.",
            iconBgColor: "bg-purple-500/10",
            iconColor: "text-purple-500"
        },
        {
            icon: ShieldCheck,
            title: "학생 정보 최소화",
            description: "학생 실명 입력을 권장하지 않고 번호와 키워드 중심으로 필요한 정보만 다루도록 설계했습니다.",
            iconBgColor: "bg-emerald-500/10",
            iconColor: "text-emerald-500"
        }
    ];

    return (
        <div className="w-full mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map((feature, idx) => (
                    <FeatureItem key={idx} {...feature} index={idx} />
                ))}
            </div>
        </div>
    );
};
