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
  FileCheck,
  Scale,
  CheckCheck,
  Trophy,
  FileSpreadsheet,
  Shield,
  UserRound,
  UserCircle,
  ListTodo,
  FolderArchive,
  MapPin,
  MessagesSquare,
  Bot,
  Timer,
  History,
  Activity,
  Medal,
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
      text: "text-orange",
      bg: "bg-orange/10",
      border: "border-orange/20",
      glow: "shadow-orange/10",
      gradient: "from-orange/15 via-orange/5 to-transparent",
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
            titleKey: "nav.roleRequests",
            url: "/dashboard/organizer/role-requests",
            icon: Shield,
          },
          {
            titleKey: "nav.analytics",
            url: "/dashboard/organizer/analytics",
            icon: BarChart3,
          },
          {
            titleKey: "nav.requestsTracking",
            url: "/dashboard/organizer/requests-tracking",
            icon: Activity,
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
          {
            titleKey: "nav.judgingScores",
            url: "/dashboard/organizer/scores",
            icon: Medal,
          },
          {
            titleKey: "nav.communityManagement",
            url: "/dashboard/organizer/community",
            icon: MessagesSquare,
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
            titleKey: "nav.timeline",
            url: "/dashboard/organizer/timeline",
            icon: Timer,
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
      text: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
      glow: "shadow-primary/10",
      gradient: "from-primary/15 via-primary/5 to-transparent",
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
            titleKey: "nav.profile",
            url: "/dashboard/participant/profile",
            icon: UserCircle,
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
            titleKey: "nav.teamTasks",
            url: "/dashboard/participant/tasks",
            icon: ListTodo,
          },
          {
            titleKey: "nav.teamLibrary",
            url: "/dashboard/participant/team-library",
            icon: FolderArchive,
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
            titleKey: "nav.mentorMap",
            url: "/dashboard/participant/mentor-map",
            icon: MapPin,
          },
          {
            titleKey: "nav.mySessions",
            url: "/dashboard/participant/sessions",
            icon: Clock,
          },
        ],
      },
      {
        titleKey: "sections.resources",
        items: [
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
          {
            titleKey: "nav.community",
            url: "/dashboard/participant/community",
            icon: MessagesSquare,
          },
          {
            titleKey: "nav.aiAssistant",
            url: "/dashboard/participant/ai-assistant",
            icon: Bot,
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
            titleKey: "nav.timeline",
            url: "/dashboard/participant/timeline",
            icon: Timer,
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
      text: "text-success",
      bg: "bg-success/10",
      border: "border-success/20",
      glow: "shadow-success/10",
      gradient: "from-success/15 via-success/5 to-transparent",
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
            titleKey: "nav.mentorProfile",
            url: "/dashboard/mentor/profile",
            icon: UserCircle,
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
            titleKey: "nav.community",
            url: "/dashboard/mentor/community",
            icon: MessagesSquare,
          },
          {
            titleKey: "nav.mentorOfficeHours",
            url: "/dashboard/mentor/office-hours",
            icon: Clock,
          },
          {
            titleKey: "nav.mentorSessions",
            url: "/dashboard/mentor/sessions",
            icon: CalendarClock,
          },
          {
            titleKey: "nav.mentorHistory",
            url: "/dashboard/mentor/history",
            icon: History,
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
      text: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
      glow: "shadow-primary/10",
      gradient: "from-primary/15 via-primary/5 to-transparent",
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
            titleKey: "nav.judgingSchedule",
            url: "/dashboard/judge/schedule",
            icon: CalendarClock,
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
          {
            titleKey: "nav.timeline",
            url: "/dashboard/judge/timeline",
            icon: Timer,
          },
        ],
      },
    ],
  },
}
