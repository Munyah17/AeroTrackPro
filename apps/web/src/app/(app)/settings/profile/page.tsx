"use client";

import { useState } from "react";
import { Camera, Save, User } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState({
    name: "Munya Muzvi",
    email: "mmuzvi@gmail.com",
    phone: "+263 77 123 4567",
    company: "AeroTrack Systems",
    bio: "Fleet operations manager",
  });

  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const handleSaveProfile = () => {
    toast.success("Profile updated successfully");
  };

  const handleChangePassword = () => {
    if (password.new !== password.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (password.new.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    toast.success("Password changed successfully");
    setPassword({ current: "", new: "", confirm: "" });
  };

  return (
    <PageContainer className="max-w-[900px]">
      <PageHeader
        title="Profile Settings"
        subtitle="Manage your personal information and account security"
      />

      <div className="space-y-4">
        <Panel className="p-6">
          <div className="flex items-center gap-2.5 pb-4">
            <User className="size-4.5 text-primary" />
            <h3 className="text-[15px] font-semibold">Personal Information</h3>
          </div>

          <div className="flex items-start gap-6">
            <div className="relative">
              <Avatar className="size-24">
                <AvatarFallback className="text-2xl font-bold">
                  {profile.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <button
                className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110"
                onClick={() => toast.info("Profile photo upload coming soon")}
              >
                <Camera className="size-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Full name</Label>
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email address</Label>
                  <Input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone number</Label>
                  <Input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Company / Organization</Label>
                  <Input
                    value={profile.company}
                    onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Bio</Label>
                <Textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  className="rounded-xl resize-none"
                  rows={3}
                />
              </div>

              <Button onClick={handleSaveProfile} className="gap-2 rounded-xl">
                <Save className="size-4" /> Save Changes
              </Button>
            </div>
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="flex items-center gap-2.5 pb-4">
            <span className="flex size-4.5 items-center justify-center rounded-sm bg-primary text-[10px] font-bold text-primary-foreground">
              🔒
            </span>
            <h3 className="text-[15px] font-semibold">Security & Password</h3>
          </div>

          <div className="max-w-md space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Current password</Label>
              <Input
                type="password"
                value={password.current}
                onChange={(e) => setPassword({ ...password, current: e.target.value })}
                className="rounded-xl"
                placeholder="Enter current password"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">New password</Label>
              <Input
                type="password"
                value={password.new}
                onChange={(e) => setPassword({ ...password, new: e.target.value })}
                className="rounded-xl"
                placeholder="At least 8 characters"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Confirm new password</Label>
              <Input
                type="password"
                value={password.confirm}
                onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                className="rounded-xl"
                placeholder="Re-enter new password"
              />
            </div>

            <Button onClick={handleChangePassword} variant="outline" className="rounded-xl">
              Change Password
            </Button>
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="flex items-center gap-2.5 pb-4">
            <span className="flex size-4.5 items-center justify-center rounded-sm bg-success text-[10px] font-bold text-white">
              2FA
            </span>
            <h3 className="text-[15px] font-semibold">Two-Factor Authentication</h3>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-accent/40 p-4">
            <div>
              <div className="text-sm font-medium">Two-factor authentication is disabled</div>
              <div className="text-xs text-muted-foreground">
                Add an extra layer of security to your account
              </div>
            </div>
            <Button
              onClick={() => toast.info("2FA setup coming in backend integration phase")}
              className="rounded-xl"
            >
              Enable 2FA
            </Button>
          </div>
        </Panel>
      </div>
    </PageContainer>
  );
}
