'use client';

import { useEffect, useState } from 'react';
import { Settings, CreditCard, Key, Bell, Building2, Clock } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const DAYS = [
  { id: 0, label: 'Sun' },
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
];

export default function SettingsPage() {
  const [buyBoxSettings, setBuyBoxSettings] = useState({
    startHour: 9,
    endHour: 18,
    maxPerMinute: 5,
    daysOfWeek: [1, 2, 3, 4, 5],
    timezoneMode: 'local',
  });
  const [loadingBuyBoxSettings, setLoadingBuyBoxSettings] = useState(true);
  const [savingBuyBoxSettings, setSavingBuyBoxSettings] = useState(false);
  const [buyBoxNotice, setBuyBoxNotice] = useState('');

  useEffect(() => {
    loadBuyBoxSettings();
  }, []);

  async function loadBuyBoxSettings() {
    try {
      setLoadingBuyBoxSettings(true);
      const r = await fetch(`${API}/settings/buy-box-sending`);
      if (!r.ok) throw new Error('Failed to load settings');
      const d = await r.json();
      setBuyBoxSettings(d);
    } catch (e: any) {
      setBuyBoxNotice(e.message || 'Could not load Buy Box sending settings');
    } finally {
      setLoadingBuyBoxSettings(false);
    }
  }

  async function saveBuyBoxSettings() {
    try {
      setSavingBuyBoxSettings(true);
      setBuyBoxNotice('');
      const r = await fetch(`${API}/settings/buy-box-sending`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buyBoxSettings),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.message || 'Failed to save settings');
      setBuyBoxSettings(d);
      setBuyBoxNotice('Buy Box sending settings saved.');
    } catch (e: any) {
      setBuyBoxNotice(e.message || 'Could not save settings');
    } finally {
      setSavingBuyBoxSettings(false);
    }
  }

  function toggleDay(day: number) {
    setBuyBoxSettings((prev: any) => {
      const exists = prev.daysOfWeek.includes(day);
      const daysOfWeek = exists
        ? prev.daysOfWeek.filter((d: number) => d !== day)
        : [...prev.daysOfWeek, day].sort();
      return { ...prev, daysOfWeek };
    });
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your organization and account preferences</p>
      </div>

      <div className="space-y-3">
        <div className="bg-gray-900 border border-purple-800/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-purple-300" />
            <h2 className="text-sm font-medium text-white">Buy Box Sending Rules</h2>
            <span className="text-xs text-gray-600">— defaults for new Buy Box bulk campaigns</span>
          </div>

          {loadingBuyBoxSettings ? (
            <div className="text-sm text-gray-500">Loading sending rules...</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-800/40 bg-blue-950/20 p-3">
                <p className="text-xs text-blue-200">
                  These rules control when Buy Box bulk campaigns and reminders are allowed to send. Remaining texts pause at the end of the window and resume in the next valid window.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <label className="space-y-1">
                  <span className="text-xs text-gray-500">Start hour</span>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={buyBoxSettings.startHour}
                    onChange={e => setBuyBoxSettings((s: any) => ({ ...s, startHour: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs text-gray-500">End hour</span>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={buyBoxSettings.endHour}
                    onChange={e => setBuyBoxSettings((s: any) => ({ ...s, endHour: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs text-gray-500">Max texts/min</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={buyBoxSettings.maxPerMinute}
                    onChange={e => setBuyBoxSettings((s: any) => ({ ...s, maxPerMinute: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </label>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-2">Sending days</div>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(day => {
                    const active = buyBoxSettings.daysOfWeek.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        onClick={() => toggleDay(day.id)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                          active
                            ? 'bg-purple-700 border-purple-600 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <div className="text-xs text-gray-500">
                  Current rule: {buyBoxSettings.startHour}:00–{buyBoxSettings.endHour}:00 local time · {buyBoxSettings.maxPerMinute}/min
                </div>
                <button
                  onClick={saveBuyBoxSettings}
                  disabled={savingBuyBoxSettings}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                >
                  {savingBuyBoxSettings ? 'Saving...' : 'Save Rules'}
                </button>
              </div>

              {buyBoxNotice && (
                <div className="text-xs text-gray-400">{buyBoxNotice}</div>
              )}
            </div>
          )}
        </div>

        {[
          {
            icon: Building2, title: 'Organization', desc: 'Name, slug, branding',
            items: [
              { label: 'Organization name', value: 'Your Org', type: 'text' },
              { label: 'From name (emails)', value: 'Your Dispo Team', type: 'text' },
              { label: 'From email', value: 'deals@yourdomain.com', type: 'email' },
            ]
          },
          {
            icon: Bell, title: 'Notifications', desc: 'When to get alerted',
            items: [
              { label: 'New offer received', value: true, type: 'toggle' },
              { label: 'Deal matched to buyer', value: true, type: 'toggle' },
              { label: 'Campaign sent', value: false, type: 'toggle' },
              { label: 'Buyer score changed', value: false, type: 'toggle' },
            ]
          },
        ].map(section => (
          <div key={section.title} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <section.icon size={16} className="text-gray-400" />
              <h2 className="text-sm font-medium text-white">{section.title}</h2>
              <span className="text-xs text-gray-600">— {section.desc}</span>
            </div>
            <div className="space-y-3">
              {section.items.map((item: any) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <label className="text-sm text-gray-300">{item.label}</label>
                  {item.type === 'toggle' ? (
                    <button className={`w-10 h-5 rounded-full transition-colors ${item.value ? 'bg-blue-500' : 'bg-gray-700'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white mx-0.5 transition-transform ${item.value ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  ) : (
                    <input type={item.type} defaultValue={item.value}
                      className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 w-64" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={16} className="text-gray-400" />
            <h2 className="text-sm font-medium text-white">Billing</h2>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <div>
              <p className="text-sm text-white font-medium">Starter Plan</p>
              <p className="text-xs text-gray-500 mt-0.5">500 buyers · 50 deals · 1 seat</p>
            </div>
            <button className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-lg transition-colors">
              Upgrade →
            </button>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Key size={16} className="text-gray-400" />
            <h2 className="text-sm font-medium text-white">API Access</h2>
          </div>
          <p className="text-sm text-gray-500 mb-3">Use the API to integrate DispoAI with your other tools</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-400 font-mono">
              sk_live_••••••••••••••••••••••••
            </code>
            <button className="text-xs text-gray-400 hover:text-white border border-gray-700 px-3 py-2 rounded-lg transition-colors">
              Generate key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
