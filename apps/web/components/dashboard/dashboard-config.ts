import {
  LayoutDashboard,
  BarChart3,
  Users,
  Compass,
  Award,
  Target,
  FolderGit2,
  Megaphone,
  CalendarDays,
  LifeBuoy,
  Settings,
  Rocket,
  UploadCloud,
  HelpCircle,
  Clock,
  Globe,
  BookOpen,
  Calendar,
  CheckSquare,
  MessageSquareCode,
  CalendarClock,
  FileEdit,
  BookOpenCheck,
  FileCheck,
  Scale,
  CheckCheck,
  Trophy,
  FileSpreadsheet,
  Shield,
  UserRound,
  type LucideIcon,
} from "lucide-react"

export type DashboardRole = "organizer" | "participant" | "mentor" | "judge"

export interface NavItem {
  titleKey: string
  url: string
  icon: LucideIcon
  badgeKey?: string
  badgeVariant?: "default" | "secondary" | "outline" | "destructive"
}

export interface NavSection {
  titleKey: string
  items: NavItem[]
}

export interface RoleConfig {
  role: DashboardRole
  titleKey: string
  welcomeKey: string
  descriptionKey: string
  icon: LucideIcon
  colorClass: {
    text: string
    bg: string
    border: string
    glow: string
    gradient: string
  }
  sections: NavSection[]
}

export const DASHBOARD_ROLES_CONFIG: Record<DashboardRole, RoleConfig> = {
  organizer: {
    role: "organizer",
    titleKey: "titles.organizer",
    welcomeKey: "organizer.welcome",
    descriptionKey: "organizer.description",
    icon: Shield,
    colorClass: {
      text: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      glow: "shadow-amber-500/10",
      gradient: "from-amber-500/15 via-amber-500/5 to-transparent",
    },
    sections: [
      {
        titleKey: "sections.main",
        items: [
          {
            titleKey: "nav.overview",
            url: "/dashboard/organizer",
            icon: LayoutDashboard,
          },
          {
            titleKey: "nav.analytics",
            url: "/dashboard/organizer/analytics",
            icon: BarChart3,
          },
        ],
      },
      {
        titleKey: "sections.management",
        items: [
          {
            titleKey: "nav.teams",
            url: "/dashboard/organizer/teams",
            icon: Users,
            badgeVariant: "secondary",
          },
          {
            titleKey: "nav.participants",
            url: "/dashboard/organizer/participants",
            icon: UserRound,
          },
          {
            titleKey: "nav.mentors",
            url: "/dashboard/organizer/mentors",
            icon: Compass,
          },
          {
            titleKey: "nav.judges",
            url: "/dashboard/organizer/judges",
            icon: Award,
          },
          {
            titleKey: "nav.challenges",
            url: "/dashboard/organizer/challenges",
            icon: Target,
          },
          {
            titleKey: "nav.submissions",
            url: "/dashboard/organizer/submissions",
            icon: FolderGit2,
            badgeVariant: "default",
          },
        ],
      },
      {
        titleKey: "sections.ops",
        items: [
          {
            titleKey: "nav.announcements",
            url: "/dashboard/organizer/announcements",
            icon: Megaphone,
          },
          {
            titleKey: "nav.schedule",
            url: "/dashboard/organizer/schedule",
            icon: CalendarDays,
          },
          {
            titleKey: "nav.logistics",
            url: "/dashboard/organizer/logistics",
            icon: LifeBuoy,
          },
        ],
      },
      {
        titleKey: "sections.system",
        items: [
          {
            titleKey: "nav.settings",
            url: "/dashboard/organizer/settings",
            icon: Settings,
          },
        ],
      },
    ],
  },

  participant: {
    role: "participant",
    titleKey: "titles.participant",
    welcomeKey: "participant.welcome",
    descriptionKey: "participant.description",
    icon: Rocket,
    colorClass: {
      text: "text-emerald-500 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      glow: "shadow-emerald-500/10",
      gradient: "from-emerald-500/15 via-emerald-500/5 to-transparent",
    },
    sections: [
      {
        titleKey: "sections.workspace",
        items: [
          {
            titleKey: "nav.overview",
            url: "/dashboard/participant",
            icon: LayoutDashboard,
          },
          {
            titleKey: "nav.myTeam",
            url: "/dashboard/participant/team",
            icon: Users,
            badgeKey: "badges.active",
            badgeVariant: "secondary",
          },
          {
            titleKey: "nav.findTeam",
            url: "/dashboard/participant/find-team",
            icon: Compass,
          },
          {
            titleKey: "nav.myProject",
            url: "/dashboard/participant/project",
            icon: Rocket,
          },
          {
            titleKey: "nav.submitProject",
            url: "/dashboard/participant/submit",
            icon: UploadCloud,
            badgeKey: "badges.urgent",
            badgeVariant: "default",
          },
        ],
      },
      {
        titleKey: "sections.guidance",
        items: [
          {
            titleKey: "nav.requestMentor",
            url: "/dashboard/participant/mentorship",
            icon: HelpCircle,
          },
          {
            titleKey: "nav.mySessions",
            url: "/dashboard/participant/sessions",
            icon: Clock,
          },
          {
            titleKey: "nav.nasaChallenges",
            url: "/dashboard/participant/challenges",
            icon: Globe,
          },
          {
            titleKey: "nav.resources",
            url: "/dashboard/participant/resources",
            icon: BookOpen,
          },
        ],
      },
      {
        titleKey: "sections.hackathonInfo",
        items: [
          {
            titleKey: "nav.schedule",
            url: "/dashboard/participant/schedule",
            icon: Calendar,
          },
          {
            titleKey: "nav.evaluationRubric",
            url: "/dashboard/participant/rubric",
            icon: CheckSquare,
          },
        ],
      },
    ],
  },

  mentor: {
    role: "mentor",
    titleKey: "titles.mentor",
    welcomeKey: "mentor.welcome",
    descriptionKey: "mentor.description",
    icon: Compass,
    colorClass: {
      text: "text-sky-500 dark:text-sky-400",
      bg: "bg-sky-500/10",
      border: "border-sky-500/20",
      glow: "shadow-sky-500/10",
      gradient: "from-sky-500/15 via-sky-500/5 to-transparent",
    },
    sections: [
      {
        titleKey: "sections.guidance",
        items: [
          {
            titleKey: "nav.overview",
            url: "/dashboard/mentor",
            icon: LayoutDashboard,
          },
          {
            titleKey: "nav.assignedTeams",
            url: "/dashboard/mentor/teams",
            icon: Users,
            badgeKey: "badges.active",
            badgeVariant: "secondary",
          },
          {
            titleKey: "nav.mentorshipRequests",
            url: "/dashboard/mentor/requests",
            icon: MessageSquareCode,
            badgeVariant: "default",
          },
          {
            titleKey: "nav.mentorSessions",
            url: "/dashboard/mentor/sessions",
            icon: CalendarClock,
          },
        ],
      },
      {
        titleKey: "sections.hackathonInfo",
        items: [
          {
            titleKey: "nav.nasaChallenges",
            url: "/dashboard/mentor/challenges",
            icon: Globe,
          },
          {
            titleKey: "nav.mentorNotes",
            url: "/dashboard/mentor/feedback",
            icon: FileEdit,
          },
          {
            titleKey: "nav.mentorGuidelines",
            url: "/dashboard/mentor/guidelines",
            icon: BookOpenCheck,
          },
        ],
      },
    ],
  },

  judge: {
    role: "judge",
    titleKey: "titles.judge",
    welcomeKey: "judge.welcome",
    descriptionKey: "judge.description",
    icon: Award,
    colorClass: {
      text: "text-purple-500 dark:text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      glow: "shadow-purple-500/10",
      gradient: "from-purple-500/15 via-purple-500/5 to-transparent",
    },
    sections: [
      {
        titleKey: "sections.judging",
        items: [
          {
            titleKey: "nav.overview",
            url: "/dashboard/judge",
            icon: LayoutDashboard,
          },
          {
            titleKey: "nav.assignedProjects",
            url: "/dashboard/judge/projects",
            icon: FileCheck,
            badgeKey: "badges.active",
            badgeVariant: "secondary",
          },
          {
            titleKey: "nav.scoringForm",
            url: "/dashboard/judge/evaluation",
            icon: Scale,
          },
          {
            titleKey: "nav.judgingProgress",
            url: "/dashboard/judge/progress",
            icon: CheckCheck,
          },
        ],
      },
      {
        titleKey: "sections.results",
        items: [
          {
            titleKey: "nav.leaderboard",
            url: "/dashboard/judge/leaderboard",
            icon: Trophy,
          },
          {
            titleKey: "nav.nasaCriteria",
            url: "/dashboard/judge/criteria",
            icon: FileSpreadsheet,
          },
        ],
      },
    ],
  },
}
