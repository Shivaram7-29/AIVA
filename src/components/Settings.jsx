import React, { useState } from 'react';
import {
  User, Bell, SlidersHorizontal, Bot, ChevronRight, Globe, Moon, Sun,
  Mail, Phone, MapPin, Save, Volume2, Clock, RotateCcw, Info,
} from 'lucide-react';
import { PageHeader, Toggle } from './ui';

/* ── Settings group — dark VEX style ──────────────────────── */
const SettingsGroup = ({ title, children, description }) => (
  <div>
    <div className="px-1 mb-2">
      <h3 className="text-[11px] font-medium text-white/40 uppercase tracking-wider">{title}</h3>
      {description && <p className="text-[12px] text-white/30 mt-0.5">{description}</p>}
    </div>
    <div className="vex-card-solid overflow-hidden divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
      {children}
    </div>
  </div>
);

const SettingRow = ({ icon: Icon, label, description, control, value, isLink, onClick }) => (
  <div className={`flex items-center gap-3 px-4 py-3 ${isLink ? 'cursor-pointer hover:bg-white/[0.02] transition-colors' : ''}`} onClick={onClick} style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <Icon className="w-4 h-4 text-white/50" strokeWidth={1.5} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[14px] font-medium text-white">{label}</p>
      {description && <p className="text-[12px] text-white/40 mt-0.5">{description}</p>}
    </div>
    {value && <span className="text-[13px] text-white/40">{value}</span>}
    {control}
    {isLink && <ChevronRight className="w-4 h-4 text-white/30" strokeWidth={1.5} />}
  </div>
);

const Settings = () => {
  const [notifications, setNotifications] = useState({ newMatches: true, interviewReminders: true, applicationStatus: false, weeklyReport: true });
  const [appearance, setAppearance] = useState({ theme: 'dark', reduceMotion: false, compact: false });
  const [preferences, setPreferences] = useState({ defaultLocation: 'India', autoMatch: true, saveHistory: true });
  const [ai, setAi] = useState({ voiceEnabled: true, detailedFeedback: true, autoGenerateAnswers: false });

  const handleReset = () => {
    setNotifications({ newMatches: true, interviewReminders: true, applicationStatus: false, weeklyReport: true });
    setAppearance({ theme: 'dark', reduceMotion: false, compact: false });
    setPreferences({ defaultLocation: 'India', autoMatch: true, saveHistory: true });
    setAi({ voiceEnabled: true, detailedFeedback: true, autoGenerateAnswers: false });
  };

  return (
    <div className="max-w-[760px] mx-auto space-y-7">
      <PageHeader kicker="Settings" title="Settings." subtitle="Manage your account, appearance, notifications, and AI configuration." />

      {/* Profile */}
      <SettingsGroup title="Profile" description="Your personal information and account details.">
        <SettingRow icon={User} label="Name" value="Demo User" isLink />
        <SettingRow icon={Mail} label="Email" value="demo@placementai.com" isLink />
        <SettingRow icon={Phone} label="Phone" value="Not set" isLink />
        <SettingRow icon={MapPin} label="Location" value="India" isLink />
      </SettingsGroup>

      {/* Appearance */}
      <SettingsGroup title="Appearance" description="Customize how PlacementAI looks on your device.">
        <SettingRow
          icon={appearance.theme === 'dark' ? Moon : Sun}
          label="Theme"
          description="Dark or light appearance."
          value={appearance.theme === 'dark' ? 'Dark' : 'Light'}
          control={<Toggle checked={appearance.theme === 'dark'} onChange={(checked) => setAppearance({ ...appearance, theme: checked ? 'dark' : 'light' })} />}
        />
        <SettingRow
          icon={SlidersHorizontal}
          label="Reduce motion"
          description="Minimize animations across the app."
          control={<Toggle checked={appearance.reduceMotion} onChange={(checked) => setAppearance({ ...appearance, reduceMotion: checked })} />}
        />
        <SettingRow
          icon={SlidersHorizontal}
          label="Compact mode"
          description="Tighter spacing for power users."
          control={<Toggle checked={appearance.compact} onChange={(checked) => setAppearance({ ...appearance, compact: checked })} />}
        />
        <SettingRow icon={Globe} label="Language" value="English (India)" isLink />
      </SettingsGroup>

      {/* Notifications */}
      <SettingsGroup title="Notifications" description="Choose what you want to be notified about.">
        <SettingRow icon={Bell} label="New job matches" description="When AI finds jobs matching your resume." control={<Toggle checked={notifications.newMatches} onChange={(checked) => setNotifications({ ...notifications, newMatches: checked })} />} />
        <SettingRow icon={Clock} label="Interview reminders" description="Reminders before scheduled interviews." control={<Toggle checked={notifications.interviewReminders} onChange={(checked) => setNotifications({ ...notifications, interviewReminders: checked })} />} />
        <SettingRow icon={Mail} label="Application status updates" description="Email when an application status changes." control={<Toggle checked={notifications.applicationStatus} onChange={(checked) => setNotifications({ ...notifications, applicationStatus: checked })} />} />
        <SettingRow icon={Bell} label="Weekly progress report" description="A summary of your activity every Monday." control={<Toggle checked={notifications.weeklyReport} onChange={(checked) => setNotifications({ ...notifications, weeklyReport: checked })} />} />
      </SettingsGroup>

      {/* AI Preferences */}
      <SettingsGroup title="AI Preferences" description="Control how the AI interviewer and agents behave.">
        <SettingRow icon={Volume2} label="Voice output" description="Let the AI interviewer speak questions and feedback aloud." control={<Toggle checked={ai.voiceEnabled} onChange={(checked) => setAi({ ...ai, voiceEnabled: checked })} />} />
        <SettingRow icon={Bot} label="Detailed feedback" description="Include strengths, weaknesses, and a model answer in feedback." control={<Toggle checked={ai.detailedFeedback} onChange={(checked) => setAi({ ...ai, detailedFeedback: checked })} />} />
        <SettingRow icon={Bot} label="Auto-generate application answers" description="Generate tailored answers automatically when applying." control={<Toggle checked={ai.autoGenerateAnswers} onChange={(checked) => setAi({ ...ai, autoGenerateAnswers: checked })} />} />
      </SettingsGroup>

      {/* Preferences */}
      <SettingsGroup title="Preferences" description="Default behavior of the Job Search Agent.">
        <SettingRow icon={MapPin} label="Default job location" value={preferences.defaultLocation} isLink onClick={() => setPreferences({ ...preferences, defaultLocation: preferences.defaultLocation === 'India' ? 'Bangalore' : 'India' })} />
        <SettingRow icon={Bot} label="Auto-match on upload" description="Automatically run the matching pipeline when a resume is uploaded." control={<Toggle checked={preferences.autoMatch} onChange={(checked) => setPreferences({ ...preferences, autoMatch: checked })} />} />
        <SettingRow icon={SlidersHorizontal} label="Save interview history" description="Keep past interview transcripts and scores for review." control={<Toggle checked={preferences.saveHistory} onChange={(checked) => setPreferences({ ...preferences, saveHistory: checked })} />} />
      </SettingsGroup>

      {/* About */}
      <SettingsGroup title="About" description="Application information.">
        <SettingRow icon={Info} label="Version" value="1.0.0" />
        <SettingRow icon={Info} label="Build" value="VEX Cinematic" />
      </SettingsGroup>

      {/* Save / Reset */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="text-[11px] text-white/30">PlacementAI · These preferences are stored locally in your browser.</p>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="vex-btn-secondary px-5 py-2.5 text-[13px] flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} /> Reset
          </button>
          <button className="vex-btn-primary px-6 py-2.5 text-[14px] flex items-center gap-2">
            <Save className="w-4 h-4" strokeWidth={1.5} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
