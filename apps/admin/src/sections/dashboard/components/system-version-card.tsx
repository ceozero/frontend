"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Icon } from "@workspace/ui/composed/icon";
import { getVersion, restartSystem } from "@workspace/ui/services/admin/tool";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/utils/common";
import packageJson from "../../../../../../package.json";
import SystemLogsDialog from "./system-logs-dialog";

export default function SystemVersionCard() {
  const { t } = useTranslation("tool");
  const [openRestart, setOpenRestart] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  const { data: versionInfo } = useQuery({
    queryKey: ["getVersionInfo"],
    queryFn: async () => {
      try {
        const [webResponse, serverResponse, systemResponse] = await Promise.all(
          [
            fetch(
              "https://data.jsdelivr.com/v1/packages/gh/perfect-panel/frontend/resolved?specifier=latest"
            ),
            fetch(
              "https://data.jsdelivr.com/v1/packages/gh/perfect-panel/server/resolved?specifier=latest"
            ),
            getVersion(),
          ]
        );

        const webData = webResponse.ok ? await webResponse.json() : null;
        const serverData = serverResponse.ok
          ? await serverResponse.json()
          : null;
        const systemData = systemResponse.data.data;

        const rawVersion = (systemData?.version || "")
          .replace(" Develop", "")
          .trim();
        const timeMatch = rawVersion.match(/\(([^)]+)\)/);
        const timestamp = timeMatch ? timeMatch[1] : "";
        const versionWithoutTime = rawVersion.replace(/\([^)]*\)/, "").trim();

        const isDevelopment = !/^[Vv]?\d+\.\d+\.\d+(-[a-zA-Z]+(\.\d+)?)?$/.test(
          versionWithoutTime
        );

        let displayVersion = versionWithoutTime;
        if (
          !(
            isDevelopment ||
            versionWithoutTime.startsWith("V") ||
            versionWithoutTime.startsWith("v")
          )
        ) {
          displayVersion = `V${versionWithoutTime}`;
        }
        const lastUpdated = formatDate(new Date(timestamp || Date.now())) || "";

        const systemInfo = {
          isRelease: !isDevelopment,
          version: displayVersion,
          lastUpdated,
        };

        const latestReleases = {
          web: webData
            ? {
                version: webData.version,
                url: `https://github.com/perfect-panel/frontend/releases/tag/v${webData.version}`,
              }
            : null,
          server: serverData
            ? {
                version: serverData.version,
                url: `https://github.com/perfect-panel/server/releases/tag/v${serverData.version}`,
              }
            : null,
        };

        const hasNewVersion =
          latestReleases.web &&
          packageJson.version !== latestReleases.web.version.replace(/^v/, "");

        const hasServerNewVersion =
          latestReleases.server &&
          systemInfo.version &&
          systemInfo.version.replace(/^V/, "") !==
            latestReleases.server.version.replace(/^v/, "");

        return {
          systemInfo,
          latestReleases,
          hasNewVersion,
          hasServerNewVersion,
        };
      } catch (error) {
        console.error("Failed to fetch version info:", error);
        return {
          systemInfo: { isRelease: true, version: "V1.0.0", lastUpdated: "" },
          latestReleases: { web: null, server: null },
          hasNewVersion: false,
          hasServerNewVersion: false,
        };
      }
    },
    staleTime: 0,
    retry: 1,
    retryDelay: 10_000,
    initialData: {
      systemInfo: { isRelease: true, version: "V1.0.0", lastUpdated: "" },
      latestReleases: { web: null, server: null },
      hasNewVersion: false,
      hasServerNewVersion: false,
    },
  });

  const { systemInfo, latestReleases, hasNewVersion, hasServerNewVersion } =
    versionInfo;

  return (
    <Card className="gap-0 p-3">
      <CardHeader className="mb-2 p-0">
        <CardTitle className="flex items-center justify-between">
          {t("systemServices", "System Services")}
          <div className="flex items-center space-x-2">
            <SystemLogsDialog size="sm" variant="outline" />
            <AlertDialog onOpenChange={setOpenRestart} open={openRestart}>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive">
                  {t("systemReboot", "System Reboot")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("confirmSystemReboot", "Confirm System Reboot")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t(
                      "rebootDescription",
                      "Are you sure you want to reboot the system? This action cannot be undone."
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("cancel", "Cancel")}</AlertDialogCancel>
                  <Button
                    disabled={isRestarting}
                    onClick={async () => {
                      setIsRestarting(true);
                      await restartSystem();
                      await new Promise((resolve) => setTimeout(resolve, 5000));
                      setIsRestarting(false);
                      setOpenRestart(false);
                    }}
                  >
                    {isRestarting && (
                      <Icon className="mr-2 animate-spin" icon="mdi:loading" />
                    )}
                    {isRestarting
                      ? t("rebooting", "Rebooting...")
                      : t("confirmReboot", "Confirm Reboot")}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-0">
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center">
            <Icon className="mr-2 h-4 w-4 text-green-600" icon="mdi:web" />
            <span className="font-medium text-sm">
              {t("webVersion", "Web Version")}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge>V{packageJson.version}</Badge>
            {hasNewVersion && (
              <Link
                className="flex items-center space-x-1"
                rel="noopener noreferrer"
                target="_blank"
                to={
                  latestReleases?.web?.url ||
                  "https://github.com/perfect-panel/frontend/releases"
                }
              >
                <Badge
                  className="animate-pulse px-2 py-0.5 text-xs"
                  variant="destructive"
                >
                  {t("newVersionAvailable", "New Version Available")}
                  <Icon icon="mdi:open-in-new" />
                </Badge>
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center">
            <Icon className="mr-2 h-4 w-4 text-blue-600" icon="mdi:server" />
            <span className="font-medium text-sm">
              {t("serverVersion", "Server Version")}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={systemInfo?.isRelease ? "default" : "destructive"}>
              {systemInfo?.version || "V1.0.0"}
            </Badge>
            {hasServerNewVersion && (
              <Link
                className="flex items-center space-x-1"
                rel="noopener noreferrer"
                target="_blank"
                to={
                  latestReleases?.server?.url ||
                  "https://github.com/perfect-panel/server/releases"
                }
              >
                <Badge
                  className="animate-pulse px-2 py-0.5 text-xs"
                  variant="destructive"
                >
                  {t("newVersionAvailable", "New Version Available")}
                  <Icon icon="mdi:open-in-new" />
                </Badge>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
