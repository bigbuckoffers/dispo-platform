'use client';
import { useEffect, useState } from 'react';

const EVENT_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  INTAKE_OPENED:    { icon: '👀', label: 'Opened intake link',        color: 'text-blue-400' },
  INTAKE_STEP_2:    { icon: '📍', label: 'Reached Markets step',      color: 'text-blue-300' },
  INTAKE_STEP_3:    { icon: '🏠', label: 'Reached Property step',     color: 'text-blue-300' },
  INTAKE_STEP_4:    { icon: '🔨', label: 'Reached Strategy step',     color: 'text-blue-300' },
  INTAKE_STEP_5:    { icon: '💰', label: 'Reached Funding step',      color: 'text-blue-300' },
  INTAKE_STEP_6:    { icon: '🎯', label: 'Reached Preferences step',  color: 'text-blue-300' },
  INTAKE_COMPLETED: { icon: '✅', label: 'Completed buy box intake',  color: 'text-green-400' },
  INTAKE_ABANDONED: { icon: '⚠️', label: 'Abandoned intake form',     color: 'text-amber-400' },
  DEAL_VIEWED:      { icon: '🏘', label: 'Viewed a deal',             color: 'text-purple-400' },
  OFFER_SUBMITTED:  { icon: '📝', label: 'Submitted an offer',        color: 'text-green-400' },
  DEAL_PURCHASED:   { icon: '🎉', label: 'Closed a deal',             color: 'text-yellow-400' },
  SMS_REPLIED:      { icon: '💬', label: 'Replied to SMS',            color: 'text-teal-400' },
  PROFILE_CREATED:  { icon: '👤', label: 'Profile created',           color: 'text-gray-400' },
};

function timeAgo(date: string | Date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  if (s < 604800) return Math.floor(s/86400) + 'd ago';
  return new Date(date).toLocaleDateString();
}

export function ActivityTimeline({ buyerId }: { buyerId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!buyerId) { setLoading(false); return; }
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    fetch(API + '/buyers/' + buyerId + '/activity?days=90')
      .then(r => r.json())
      .then(d => setEvents(Array.isArray(d) ? d : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [buyerId]);

  if (loading) return <div className="text-gray-600 text-xs py-4 text-center">Loading activity...</div>;
  if (!events.length) return <div className="text-gray-600 text-xs py-4 text-center">No activity recorded yet</div>;

  return (
    <div className="space-y-0">
      {events.map((e, i) => {
        const cfg = EVENT_CONFIG[e.eventType] || { icon: '•', label: e.eventType, color: 'text-gray-400' };
        return (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-800/50 last:border-0">
            <span className="text-sm">{cfg.icon}</span>
            <p className={`text-xs font-medium flex-1 ${cfg.color}`}>{cfg.label}</p>
            <span className="text-gray-600 text-xs shrink-0">{timeAgo(e.createdAt)}</span>
          </div>
        );
      })}
    </div>
  );
}