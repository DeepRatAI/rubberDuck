"use client";

import { useState } from "react";
import { useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Download, Lock, Palette, Save, Trash2, Upload } from "lucide-react";

import {
  deleteMyAccount,
  exportMyAccountData,
  updateProfile,
  uploadProfileMedia,
} from "@/app/actions";
import type { Locale, Profile, Visibility } from "@/lib/domain";
import { getDictionary } from "@/lib/i18n";
import { Button } from "./ui/button";
import { Panel, SectionHeader } from "./ui/panel";

const visibilityOptions: Visibility[] = ["public", "followers", "private"];
const paletteOptions = ["cyberduck", "rubberduck", "cyan", "amber"];

function csvList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function SettingsProfile({
  locale,
  profile,
}: {
  locale: Locale;
  profile: Profile | null;
}) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [isPending, startTransition] = useTransition();
  const [visibility, setVisibility] = useState(profile?.visibility);
  const [name, setName] = useState(profile?.name ?? "");
  const [handle, setHandle] = useState(profile?.handle ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [workStatus, setWorkStatus] = useState(profile?.workStatus ?? "");
  const [stack, setStack] = useState((profile?.stack ?? []).join(", "));
  const [interests, setInterests] = useState(
    (profile?.interests ?? []).join(", "),
  );
  const [contentPreferences, setContentPreferences] = useState(
    (profile?.contentPreferences ?? []).join(", "),
  );
  const [participationIntents, setParticipationIntents] = useState(
    (profile?.participationIntents ?? []).join(", "),
  );
  const [links, setLinks] = useState(profile?.links.join(", ") ?? "");
  const [image, setImage] = useState(profile?.image ?? null);
  const [bannerUrl, setBannerUrl] = useState(profile?.bannerUrl ?? null);
  const [palette, setPalette] = useState(profile?.palette ?? "cyberduck");
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [accountBusy, setAccountBusy] = useState<"export" | "delete" | null>(
    null,
  );
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!profile || !visibility) {
    return null;
  }

  function saveSettings() {
    setStatus(null);
    setError(null);
    startTransition(() => {
      void updateProfile({
        name,
        handle,
        bio,
        location,
        workStatus,
        stack: csvList(stack),
        interests: csvList(interests),
        contentPreferences: csvList(contentPreferences),
        participationIntents: csvList(participationIntents),
        links: links
          .split(",")
          .map((link) => link.trim())
          .filter(Boolean),
        image,
        bannerUrl,
        palette,
        visibility,
      })
        .then(() => {
          setStatus(dictionary.profileSaved);
          router.refresh();
        })
        .catch((caught: unknown) => {
          setError(
            caught instanceof Error
              ? caught.message
              : dictionary.profileSaveError,
          );
        });
    });
  }

  function uploadMedia(kind: "avatar" | "banner", file: File | undefined) {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("file", file);
    setStatus(null);
    setError(null);
    setUploading(kind);
    void uploadProfileMedia(formData)
      .then((asset) => {
        if (asset.kind === "avatar") {
          setImage(asset.url);
        } else {
          setBannerUrl(asset.url);
        }
      })
      .catch((caught: unknown) => {
        setError(
          caught instanceof Error
            ? caught.message
            : dictionary.mediaUploadFailed,
        );
      })
      .finally(() => setUploading(null));
  }

  function exportAccount() {
    setStatus(null);
    setError(null);
    setAccountBusy("export");
    void exportMyAccountData()
      .then((payload) => {
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `rubberduck-account-${handle || "profile"}.json`;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        setStatus(dictionary.accountExportReady);
      })
      .catch((caught: unknown) => {
        setError(
          caught instanceof Error
            ? caught.message
            : dictionary.accountExportFailed,
        );
      })
      .finally(() => setAccountBusy(null));
  }

  function deleteAccount() {
    setStatus(null);
    setError(null);
    setAccountBusy("delete");
    void deleteMyAccount({ confirmation: deleteConfirmation })
      .then(() =>
        signOut({
          callbackUrl: `/login?lang=${locale}`,
        }),
      )
      .catch((caught: unknown) => {
        setError(
          caught instanceof Error
            ? caught.message
            : dictionary.accountDeleteFailed,
        );
        setAccountBusy(null);
      });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <Panel>
        <SectionHeader
          title={dictionary.profileSettings}
          description={dictionary.profileSettingsDescription}
          action={
            <Button
              variant="primary"
              disabled={isPending}
              onClick={saveSettings}
            >
              <Save className="size-4" aria-hidden />
              {dictionary.saveChanges}
            </Button>
          }
        />
        <div className="grid gap-5 p-5">
          <div className="grid gap-4 md:grid-cols-[180px_1fr]">
            <div>
              <p className="mb-2 text-sm font-medium">{dictionary.avatar}</p>
              <div className="relative flex size-32 items-center justify-center overflow-hidden rounded-full border-4 border-[color:var(--surface)] bg-[color:var(--surface-2)] text-3xl font-semibold text-[color:var(--foreground)] shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
                {image ? (
                  <Image
                    src={image}
                    alt=""
                    fill
                    unoptimized
                    sizes="128px"
                    className="object-cover"
                  />
                ) : (
                  name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                )}
              </div>
              <label className="mt-3 inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] px-3 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--accent-2)]">
                <Upload className="size-4" aria-hidden />
                {uploading === "avatar"
                  ? dictionary.loading
                  : dictionary.uploadAvatar}
                <input
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={uploading !== null}
                  onChange={(event) => {
                    uploadMedia("avatar", event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">{dictionary.banner}</p>
              <div className="relative min-h-40 overflow-hidden rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-2)]">
                {bannerUrl ? (
                  <Image
                    src={bannerUrl}
                    alt=""
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 720px"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--grid-x)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-y)_1px,transparent_1px)] bg-[size:24px_24px]" />
                )}
              </div>
              <label className="mt-3 inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-[color:var(--line)] bg-[color:var(--surface-2)] px-3 text-sm font-medium text-[color:var(--foreground)] transition hover:border-[color:var(--accent-2)]">
                <Upload className="size-4" aria-hidden />
                {uploading === "banner"
                  ? dictionary.loading
                  : dictionary.uploadBanner}
                <input
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={uploading !== null}
                  onChange={(event) => {
                    uploadMedia("banner", event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
              <p className="mt-3 text-xs leading-5 text-[color:var(--muted)]">
                {dictionary.mediaLibraryDescription}
              </p>
            </div>
          </div>
          <label className="grid gap-2 text-sm font-medium">
            {dictionary.displayName}
            <input
              className="control-input h-10 rounded-md border px-3 font-normal outline-none focus:border-[color:var(--accent)]"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            {dictionary.handle}
            <input
              className="control-input h-10 rounded-md border px-3 font-normal outline-none focus:border-[color:var(--accent)]"
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            {dictionary.bio}
            <textarea
              className="control-input min-h-28 rounded-md border p-3 font-normal outline-none focus:border-[color:var(--accent)]"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              {dictionary.location}
              <input
                className="control-input h-10 rounded-md border px-3 font-normal outline-none focus:border-[color:var(--accent)]"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              {dictionary.workStatus}
              <input
                className="control-input h-10 rounded-md border px-3 font-normal outline-none focus:border-[color:var(--accent)]"
                value={workStatus}
                onChange={(event) => setWorkStatus(event.target.value)}
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-medium">
            {dictionary.links}
            <input
              className="control-input h-10 rounded-md border px-3 font-normal outline-none focus:border-[color:var(--accent)]"
              placeholder={dictionary.linksPlaceholder}
              value={links}
              onChange={(event) => setLinks(event.target.value)}
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              {dictionary.stack}
              <input
                className="control-input h-10 rounded-md border px-3 font-normal outline-none focus:border-[color:var(--accent)]"
                placeholder={dictionary.stackPlaceholder}
                value={stack}
                onChange={(event) => setStack(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              {dictionary.interests}
              <input
                className="control-input h-10 rounded-md border px-3 font-normal outline-none focus:border-[color:var(--accent)]"
                placeholder={dictionary.interestsPlaceholder}
                value={interests}
                onChange={(event) => setInterests(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              {dictionary.contentPreferences}
              <input
                className="control-input h-10 rounded-md border px-3 font-normal outline-none focus:border-[color:var(--accent)]"
                placeholder={dictionary.contentPreferencesPlaceholder}
                value={contentPreferences}
                onChange={(event) => setContentPreferences(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              {dictionary.participationIntents}
              <input
                className="control-input h-10 rounded-md border px-3 font-normal outline-none focus:border-[color:var(--accent)]"
                placeholder={dictionary.participationIntentsPlaceholder}
                value={participationIntents}
                onChange={(event) =>
                  setParticipationIntents(event.target.value)
                }
              />
            </label>
          </div>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">
              {dictionary.themePalette}
            </legend>
            <div className="flex flex-wrap gap-2">
              {paletteOptions.map((option) => (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={palette === option ? "primary" : "secondary"}
                  onClick={() => setPalette(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
          </fieldset>
          {status ? (
            <p className="status-success rounded-md px-3 py-2 text-sm">
              {status}
            </p>
          ) : null}
          {error ? (
            <p className="status-warning rounded-md px-3 py-2 text-sm">
              {error}
            </p>
          ) : null}
        </div>
      </Panel>
      <Panel>
        <SectionHeader
          title={dictionary.privacy}
          description={dictionary.granularVisibility}
        />
        <div className="divide-y divide-[color:var(--line)]">
          {Object.entries(visibility).map(([field, value]) => (
            <div key={field} className="p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium capitalize">
                <Lock
                  className="size-4 text-[color:var(--muted)]"
                  aria-hidden
                />
                {field}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {visibilityOptions.map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={value === option ? "primary" : "secondary"}
                    onClick={() => {
                      if (!visibility) {
                        return;
                      }
                      setVisibility({ ...visibility, [field]: option });
                    }}
                    type="button"
                  >
                    {dictionary[`${option}Visibility`]}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[color:var(--line)] p-4 text-sm text-[color:var(--muted)]">
          <Palette
            className="mb-2 size-4 text-[color:var(--accent-2)]"
            aria-hidden
          />
          {dictionary.profileCustomization}
        </div>
      </Panel>
      <Panel className="lg:col-span-2">
        <SectionHeader
          title={dictionary.accountDataControls}
          description={dictionary.accountDataControlsDescription}
        />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-2)] p-4">
            <h3 className="font-medium">{dictionary.exportAccountData}</h3>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              {dictionary.exportAccountDataDescription}
            </p>
            <Button
              className="mt-4"
              type="button"
              onClick={exportAccount}
              disabled={accountBusy !== null}
            >
              <Download className="size-4" aria-hidden />
              {accountBusy === "export"
                ? dictionary.loading
                : dictionary.exportAccountData}
            </Button>
          </div>
          <div className="rounded-lg border border-[color:var(--danger)]/50 bg-[color:var(--surface-2)] p-4">
            <h3 className="font-medium text-[color:var(--danger)]">
              {dictionary.deleteAccount}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              {dictionary.deleteAccountDescription}
            </p>
            <label className="mt-4 grid gap-2 text-sm font-medium">
              {dictionary.deleteAccountConfirmationLabel}
              <input
                className="control-input h-10 rounded-md border px-3 font-normal outline-none focus:border-[color:var(--danger)]"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder={dictionary.deleteAccountConfirmationPlaceholder}
              />
            </label>
            <Button
              className="mt-4"
              type="button"
              variant="danger"
              disabled={accountBusy !== null || deleteConfirmation !== "DELETE"}
              onClick={deleteAccount}
            >
              <Trash2 className="size-4" aria-hidden />
              {accountBusy === "delete"
                ? dictionary.loading
                : dictionary.deleteAccount}
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
