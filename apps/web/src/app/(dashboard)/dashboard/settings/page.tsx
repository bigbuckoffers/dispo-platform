'use client';

import { Settings, Users, CreditCard, Key, Bell, Building2 } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your organization and account preferences</p>
      </div>

      <div className="space-y-3">
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

        {/* Billing */}
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

        {/* API Keys */}
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
