"use client"

import { useState, type FormEvent } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  Circle,
  Clock3,
  CircleCheck,
  CalendarDays,
  UserRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Team, TeamTask, TaskStatus } from "@/lib/teams"
import { useTeamWork } from "./use-team-work"
import { WorkShell } from "./work-shell"
import styles from "./team-workspace.module.css"
import taskStyles from "./team-tasks.module.css"

const statuses: TaskStatus[] = ["not_started", "in_progress", "completed"]
const statusIcons = {
  not_started: Circle,
  in_progress: Clock3,
  completed: CircleCheck,
}
type TaskDraft = {
  title: string
  description: string
  status: TaskStatus
  assignedToId: string | null
  dueDate: string | null
}

function TaskEditor({
  team,
  task,
  busy,
  save,
  cancel,
}: {
  team: Team
  task?: TeamTask
  busy: boolean
  save: (draft: TaskDraft) => Promise<void>
  cancel: () => void
}) {
  const t = useTranslations("TeamWork")
  const [title, setTitle] = useState(task?.title || "")
  const [description, setDescription] = useState(task?.description || "")
  const [status, setStatus] = useState<TaskStatus>(
    task?.status || "not_started"
  )
  const [assignedToId, setAssignee] = useState(task?.assignedToId || "")
  const [dueDate, setDueDate] = useState(task?.dueDate?.slice(0, 10) || "")
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await save({
      title: title.trim(),
      description,
      status,
      assignedToId: assignedToId || null,
      dueDate: dueDate ? `${dueDate}T23:59:59.000Z` : null,
    })
  }
  return (
    <form onSubmit={submit} className={styles.stack}>
      <fieldset disabled={busy} className={styles.fields}>
        <label className={styles.field}>
          {t("taskTitle")}
          <input
            className={styles.control}
            required
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          {t("taskDescription")}
          <textarea
            className={styles.control}
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className={styles.twoFields}>
          <label className={styles.field}>
            {t("assignee")}
            <select
              className={styles.control}
              value={assignedToId}
              onChange={(e) => setAssignee(e.target.value)}
            >
              <option value="">{t("unassigned")}</option>
              {team.members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user?.name || t("participant")}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            {t("dueDate")}
            <input
              className={styles.control}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
        </div>
        <label className={styles.field}>
          {t("status")}
          <select
            className={styles.control}
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {t(s)}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.actions}>
          <Button type="submit" disabled={!title.trim()}>
            {t(busy ? "saving" : "saveTask")}
          </Button>
          <Button type="button" variant="secondary" onClick={cancel}>
            {t("cancel")}
          </Button>
        </div>
      </fieldset>
    </form>
  )
}

export function TeamTasks() {
  const t = useTranslations("TeamWork")
  const locale = useLocale()
  const work = useTeamWork()
  const [editing, setEditing] = useState<string | null>(null)
  const [filter, setFilter] = useState("all")
  const [notice, setNotice] = useState("")
  const tasks = work.team?.tasks || []
  return (
    <WorkShell {...work} title={t("tasksTitle")} subtitle={t("tasksSubtitle")}>
      {work.team && (
        <>
          {notice && (
            <p role="status" className={styles.notice}>
              {t(notice)}
            </p>
          )}
          <div className={styles.row}>
            <p className={styles.muted}>
              {t("progress", {
                done: tasks.filter((task) => task.status === "completed")
                  .length,
                total: tasks.length,
              })}
            </p>
            <Button
              disabled={work.busy || editing !== null}
              onClick={() => {
                setNotice("")
                setEditing("new")
              }}
            >
              {t("newTask")}
            </Button>
          </div>
          {editing === "new" && (
            <section className={styles.card}>
              <h2>{t("newTask")}</h2>
              <TaskEditor
                team={work.team}
                busy={work.busy}
                cancel={() => setEditing(null)}
                save={async (draft) => {
                  if (
                    await work.mutate(`/${work.team!.id}/tasks`, "POST", draft)
                  ) {
                    setEditing(null)
                    setNotice("taskSaved")
                  }
                }}
              />
            </section>
          )}
          <label className={`${styles.field} ${taskStyles.filter}`}>
            {t("filterStatus")}
            <select
              className={styles.control}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">{t("all")}</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {t(s)}
                </option>
              ))}
            </select>
          </label>
          <div className={taskStyles.grid}>
            {tasks
              .filter((task) => filter === "all" || task.status === filter)
              .map((task) => {
                const StatusIcon = statusIcons[task.status]
                return (
                  <article
                    key={task.id}
                    className={`${styles.card} ${taskStyles.card}`}
                    data-status={task.status}
                  >
                    {editing === task.id ? (
                      <>
                        <h2>{t("editTask")}</h2>
                        <TaskEditor
                          team={work.team!}
                          task={task}
                          busy={work.busy}
                          cancel={() => setEditing(null)}
                          save={async (draft) => {
                            if (
                              await work.mutate(
                                `/tasks/${task.id}`,
                                "PATCH",
                                draft
                              )
                            ) {
                              setEditing(null)
                              setNotice("taskSaved")
                            }
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <span className={taskStyles.status}>
                          <StatusIcon size={16} aria-hidden="true" />
                          {t(task.status)}
                        </span>
                        <h2>{task.title}</h2>
                        {task.description && (
                          <p className={taskStyles.description}>
                            {task.description}
                          </p>
                        )}
                        <dl className={taskStyles.metadata}>
                          <div>
                            <dt>
                              <UserRound size={16} aria-hidden="true" />
                              {t("assignee")}
                            </dt>
                            <dd>
                              {work.team!.members.find(
                                (m) => m.userId === task.assignedToId
                              )?.user?.name || t("unassigned")}
                            </dd>
                          </div>
                          <div>
                            <dt>
                              <CalendarDays size={16} aria-hidden="true" />
                              {t("dueDate")}
                            </dt>
                            <dd>
                              {task.dueDate
                                ? new Intl.DateTimeFormat(locale, {
                                    dateStyle: "medium",
                                    timeZone: "UTC",
                                  }).format(new Date(task.dueDate))
                                : t("noDueDate")}
                            </dd>
                          </div>
                        </dl>
                        <div className={taskStyles.footer}>
                          <label className={styles.field}>
                            {t("status")}
                            <select
                              aria-label={t("taskStatus", {
                                title: task.title,
                              })}
                              className={styles.control}
                              value={task.status}
                              disabled={work.busy}
                              onChange={async (e) => {
                                setNotice("")
                                if (
                                  await work.mutate(
                                    `/tasks/${task.id}`,
                                    "PATCH",
                                    {
                                      status: e.target.value,
                                    }
                                  )
                                )
                                  setNotice("taskSaved")
                              }}
                            >
                              {statuses.map((s) => (
                                <option key={s} value={s}>
                                  {t(s)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className={styles.actions}>
                            <Button
                              variant="secondary"
                              disabled={work.busy || editing !== null}
                              onClick={() => {
                                setNotice("")
                                setEditing(task.id)
                              }}
                            >
                              {t("editTask")}
                            </Button>
                            {work.team!.myRole === "leader" && (
                              <Button
                                variant="outline"
                                disabled={work.busy}
                                onClick={async () => {
                                  if (
                                    window.confirm(
                                      t("deleteConfirm", { title: task.title })
                                    )
                                  ) {
                                    setNotice("")
                                    if (
                                      await work.mutate(
                                        `/tasks/${task.id}`,
                                        "DELETE"
                                      )
                                    )
                                      setNotice("taskDeleted")
                                  }
                                }}
                              >
                                {t("deleteTask")}
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </article>
                )
              })}
          </div>
          {!tasks.length && (
            <section className={styles.card}>
              <h2>{t("noTasks")}</h2>
              <p className={styles.muted}>{t("noTasksHint")}</p>
            </section>
          )}
          {!!tasks.length &&
            !tasks.some(
              (task) => filter === "all" || task.status === filter
            ) && <p className={styles.muted}>{t("noMatchingTasks")}</p>}
        </>
      )}
    </WorkShell>
  )
}
