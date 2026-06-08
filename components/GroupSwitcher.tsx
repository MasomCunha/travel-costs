"use client";

import { useRef } from "react";
import { switchGroupAction } from "@/app/actions/groups";

export function GroupSwitcher({
  groups,
  activeId,
}: {
  groups: { id: string; name: string }[];
  activeId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={switchGroupAction}>
      <select
        name="groupId"
        defaultValue={activeId}
        onChange={() => formRef.current?.requestSubmit()}
        className="input"
      >
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
    </form>
  );
}
