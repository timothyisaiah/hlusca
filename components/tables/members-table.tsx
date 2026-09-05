"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDataList,
  type ResponsiveDataListColumn,
} from "@/components/tables/responsive-data-list";
import { formatDate } from "@/lib/utils";

type MemberRow = {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  status: string;
  phone: string;
  createdAt: string;
  user: {
    username: string | null;
    role: string;
  } | null;
};

type MembersTableProps = {
  members: MemberRow[];
};

function badgeVariant(status: string) {
  switch (status) {
    case "ACTIVE":
      return "success" as const;
    case "PENDING":
      return "warning" as const;
    default:
      return "muted" as const;
  }
}

export function MembersTable({ members }: MembersTableProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filteredMembers = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();

    if (!normalized) {
      return members;
    }

    return members.filter((member) =>
      [
        member.memberNumber,
        member.firstName,
        member.lastName,
        member.phone,
        member.user?.username ?? "",
        member.user?.role ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [deferredQuery, members]);

  const columns: ResponsiveDataListColumn<MemberRow>[] = [
    {
      label: "Member",
      render: (member) => (
        <>
          <Link
            href={`/dashboard/admin/members/${member.id}`}
            className="font-semibold text-[var(--foreground)] hover:text-[var(--accent)]"
          >
            {member.firstName} {member.lastName}
          </Link>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {member.memberNumber}
          </p>
        </>
      ),
    },
    {
      label: "Username",
      render: (member) => member.user?.username ?? "No login",
    },
    {
      label: "System role",
      render: (member) => member.user?.role ?? "No login",
    },
    {
      label: "Status",
      render: (member) => <Badge variant={badgeVariant(member.status)}>{member.status}</Badge>,
    },
    {
      label: "Phone",
      render: (member) => member.phone,
    },
    {
      label: "Enrolled",
      render: (member) => formatDate(member.createdAt),
    },
  ];

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by member number, name, phone, or username"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <ResponsiveDataList
        rows={filteredMembers}
        columns={columns}
        getRowId={(member) => member.id}
        emptyMessage="No members matched that search yet."
      />
    </div>
  );
}
