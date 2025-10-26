import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Avatar from "@/components/ui/avatar/Avatar";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Next.js Avatars | TailAdmin - Next.js Dashboard Template",
  description:
    "This is Next.js Avatars page for TailAdmin - Next.js Tailwind CSS Admin Dashboard Template",
};

export default function AvatarPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Avatar" />
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title="Default Avatar">
          {/* Default Avatar (No Status) */}
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Avatar size="xsmall" />
            <Avatar size="small" />
            <Avatar size="medium" />
            <Avatar size="large" />
            <Avatar size="xlarge" />
            <Avatar size="xxlarge" />
          </div>
        </ComponentCard>
        <ComponentCard title="Avatar with online indicator">
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Avatar
              size="xsmall"
              status="online"
            />
            <Avatar
              size="small"
              status="online"
            />
            <Avatar
              size="medium"
              status="online"
            />
            <Avatar
              size="large"
              status="online"
            />
            <Avatar
              size="xlarge"
              status="online"
            />
            <Avatar
              size="xxlarge"
              status="online"
            />
          </div>
        </ComponentCard>
        <ComponentCard title="Avatar with Offline indicator">
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Avatar
              size="xsmall"
              status="offline"
            />
            <Avatar
              size="small"
              status="offline"
            />
            <Avatar
              size="medium"
              status="offline"
            />
            <Avatar
              size="large"
              status="offline"
            />
            <Avatar
              size="xlarge"
              status="offline"
            />
            <Avatar
              size="xxlarge"
              status="offline"
            />
          </div>
        </ComponentCard>{" "}
        <ComponentCard title="Avatar with busy indicator">
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Avatar
              size="xsmall"
              status="busy"
            />
            <Avatar size="small" status="busy" />
            <Avatar
              size="medium"
              status="busy"
            />
            <Avatar size="large" status="busy" />
            <Avatar
              size="xlarge"
              status="busy"
            />
            <Avatar
              size="xxlarge"
              status="busy"
            />
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
