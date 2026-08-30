"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [deferredQuery, members]);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by member number, name, phone, or username"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="overflow-hidden rounded-[28px] border border-[var(--surface-border)] bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[var(--surface-muted)] text-[var(--muted-foreground)]">
            <tr>
              <th className="px-5 py-4 font-semibold">Member</th>
              <th className="px-5 py-4 font-semibold">Username</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">Phone</th>
              <th className="px-5 py-4 font-semibold">Enrolled</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((member) => (
              <tr
                key={member.id}
                className="border-t border-[var(--surface-border)] align-top"
              >
                <td className="px-5 py-4">
                  <Link
                    href={`/dashboard/admin/members/${member.id}`}
                    className="font-semibold text-[var(--foreground)] hover:text-[var(--accent)]"
                  >
                    {member.firstName} {member.lastName}
                  </Link>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {member.memberNumber}
                  </p>
                </td>
                <td className="px-5 py-4 text-[var(--foreground)]">
                  {member.user?.username ?? "No login"}
                </td>
                <td className="px-5 py-4">
                  <Badge variant={badgeVariant(member.status)}>
                    {member.status}
                  </Badge>
                </td>
                <td className="px-5 py-4 text-[var(--foreground)]">
                  {member.phone}
                </td>
                <td className="px-5 py-4 text-[var(--foreground)]">
                  {formatDate(member.createdAt)}
                </td>
              </tr>
            ))}
            {filteredMembers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-10 text-center text-sm text-[var(--muted-foreground)]"
                >
                  No members matched that search yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
