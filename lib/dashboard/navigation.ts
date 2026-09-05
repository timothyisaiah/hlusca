import type { UserRole } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  CreditCard,
  FileCheck2,
  LayoutDashboard,
  ShieldCheck,
  UserRound,
  Users,
  Landmark,
  Settings2,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  description: string;
  roles: UserRole[];
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  {
    href: "/dashboard/client",
    label: "Dashboard",
    description: "Your member summary and account details.",
    roles: ["CLIENT"],
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/client/profile",
    label: "Profile",
    description: "Keep your contact information current.",
    roles: ["CLIENT"],
    icon: UserRound,
  },
  {
    href: "/dashboard/treasurer",
    label: "Treasurer Desk",
    description: "Operational finance actions and queues.",
    roles: ["TREASURER"],
    icon: CreditCard,
  },
  {
    href: "/dashboard/board",
    label: "Board Desk",
    description: "Approvals, oversight, and audit visibility.",
    roles: ["BOARD"],
    icon: FileCheck2,
  },
  {
    href: "/dashboard/admin",
    label: "Admin Overview",
    description: "Enrollment, settings, and governance controls.",
    roles: ["ADMIN"],
    icon: ShieldCheck,
  },
  {
    href: "/dashboard/admin/members",
    label: "Members",
    description: "Browse and maintain member records.",
    roles: ["ADMIN"],
    icon: Users,
  },
  {
    href: "/dashboard/loans",
    label: "Loans",
    description: "Applications, approvals, contracts, and disbursement.",
    roles: ["CLIENT", "TREASURER", "BOARD", "ADMIN"],
    icon: Landmark,
  },
  {
    href: "/dashboard/admin/loan-types",
    label: "Loan Configuration",
    description: "Loan products and approval routing.",
    roles: ["ADMIN"],
    icon: Settings2,
  },
];

export function getNavForRole(role: UserRole) {
  return navItems.filter((item) => item.roles.includes(role));
}

export function getDashboardPathForRole(role: UserRole) {
  switch (role) {
    case "ADMIN":
      return "/dashboard/admin";
    case "BOARD":
      return "/dashboard/board";
    case "TREASURER":
      return "/dashboard/treasurer";
    case "CLIENT":
    default:
      return "/dashboard/client";
  }
}
