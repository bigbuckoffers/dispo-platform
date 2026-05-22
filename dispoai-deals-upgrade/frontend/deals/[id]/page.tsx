'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  MapPin, DollarSign, Users, Zap, AlertCircle, Building2,
  TrendingUp, Target, Send, CheckCircle, Clock, FileText,
  ExternalLink, Phone, Mail, RefreshCw, Sparkles, ChevronRight,
  Flame, Shield, BarChart3
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import toast from 'react-hot-toast';

type Tab = 'property' | 'dealmath' | 'buyers' | 'dispo';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-700 text-gray-300',
  NEEDS_INFO: 'bg-amber-900/50 text-amber-300',
  READY_TO_MATCH: 'bg-blue-900/50 text-blue-300',
  MATCHED: 'bg-purple-900/50 text-purple-300',
  READY_TO_BLAST: 'bg-green-900/50 text-green-300',
  CAMPAIGN_ACTIVE: 'bg-emerald-900/50 text-emerald-400',
  OFFER_RECEIVED: 'bg-orange-900/50 text-orange-300',
  ASSIGNED: 'bg-teal-900/50 text-teal-300',
  CLOSED: 'bg-green-800/50 text-green-200',
  DEAD: 'bg-red-900/50 text-red-400',
};

function getPriorityBadge(score: number) {
  if (score >= 90) return { label: '🔥 Hot', bg: 'bg-red-900/60 text-red-300 border border-red-700' };
  if (score >= 75) return { label: 'Strong', bg: 'bg-orange-900/60 text-orange-300 border border-orange-700' };
  if (score >= 60) return { label: 'Workable', bg: 'bg-yellow-900/60 text-yellow-300 border border-yellow-700' };
  if (score >= 40) return { label: 'Needs Info', bg: 'bg-blue-900/60 text-blue-300 border border-blue-700' };
  return { label: 'Weak', bg: 'bg-gray-800 text-gray-500 border border-gray-700' };
}

function InfoRow({ label, value, mono = false }: { label: string; value: any; mono?: boolean }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-800/60 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className={`text-white text-sm text-right max-w-xs ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function Card({ title, icon: Icon, children, className = '' }: any) {
  return (
    <div className={`bg-gray-900 rounded-xl border border-gray-800 overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
        <Icon size={15} className="text-gray-400" />
        <h3 className="text-white text-sm font-medium">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function DealDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('property');

  const { data: deal, isLoading } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => api.get(`/deals/${id}`).then(r => r.data),
  });

  const parseAction = useMutation({
    mutationFn: () => api.post(`/deals/${id}/parse`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deal', id] }); toast.success('Deal parsed!'); },
  });

  const calcAction = useMutation({
    mutationFn: () => api.post(`/deals/${id}/calculate-metrics`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deal', id] }); toast.success('Metrics updated!'); },
  });

  const followUpAction = useMutation({
    mutationFn: () => api.post(`/deals/${id}/generate-follow-up`).then(r => r.data),
    onSuccess: (data) => { toast.success('Follow-up generated!'); },
  });

  const matchAction = useMutation({
    mutationFn: () => api.post(`/deals/${id}/match-buyers`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deal', id] }); toast.success('Buyer match complete!'); },
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/deals/${id}`, { status }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deal', id] }); toast.success('Status updated'); },
  });

  if (isLoading) return <div className="p-6 text-gray-500 text-sm">Loading deal...</div>;
  if (!deal) return <div className="p-6 text-red-400 text-sm">Deal not found. <a href="/dashboard/deals" className="underline">Go back</a></div>;

  const spread = deal.spread ?? ((deal.arv || 0) - (deal.askingPrice || 0) - (deal.repairEstimate || 0));
  const seventyRule = deal.seventyPercentRuleMax ?? ((deal.arv || 0) * 0.70 - (deal.repairEstimate || 0));
  const priority = getPriorityBadge(deal.dealPriorityScore || 0);
  const missing = deal.missingInfo || [];

  // Main action button
  const mainAction = () => {
    if (deal.rawInputText && !deal.address) return { label: 'Parse Deal', fn: () => parseAction.mutate(), icon: Sparkles };
    if (missing.length > 3) return { label: 'Generate Follow-Up', fn: () => followUpAction.mutate(), icon: Send };
    if ((deal.matchedBuyerCount || 0) === 0) return { label: 'Run Buyer Match', fn: () => matchAction.mutate(), icon: Target };
    if (deal.status === 'MATCHED') return { label: 'Generate Buyer Blast', fn: () => toast.success('Coming soon!'), icon: Zap };
    return { label: 'Run Buyer Match', fn: () => matchAction.mutate(), icon: Target };
  };
  const action = mainAction();
  const isActionLoading = parseAction.isPending || matchAction.isPending || followUpAction.isPending;

  const avgPublicEstimate = [deal.zillowZestimate, deal.realtorEstimate, deal.redfinEstimate]
    .filter(Boolean).reduce((a: number, b: number, _: number, arr: number[]) => a + b / arr.length, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">

      {/* Top Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[deal.status] || 'bg-gray-800 text-gray-400'}`}>
                {(deal.status || 'DRAFT').replace(/_/g, ' ')}
              </span>
              {deal.sourceType && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                  {deal.sourceType}
                </span>
              )}
              {deal.propertyType && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                  {deal.propertyType}
                </span>
              )}
              {deal.occupancy && deal.occupancy !== 'UNKNOWN' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                  {deal.occupancy.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight">
              {deal.address || 'No Address'}
            </h1>
            <p className="text-gray-400 text-sm mt-0.5 flex items-center gap-1">
              <MapPin size={12} />
              {[deal.city, deal.state, deal.zipCode, deal.county].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button
            onClick={action.fn}
            disabled={isActionLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-xl font-medium transition shrink-0"
          >
            <action.icon size={15} />
            {action.label}
          </button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: 'Asking', value: deal.askingPrice ? formatCurrency(deal.askingPrice) : '—', color: 'text-white' },
            { label: 'ARV', value: deal.arv ? formatCurrency(deal.arv) : '—', color: 'text-white' },
            { label: 'Repairs', value: deal.repairEstimate ? formatCurrency(deal.repairEstimate) : '—', color: 'text-white' },
            { label: 'Spread', value: spread > 0 ? formatCurrency(spread) : '—', color: spread > 0 ? 'text-green-400' : 'text-gray-500' },
            { label: 'Buyer Matches', value: deal.matchedBuyerCount || 0, color: 'text-purple-400' },
            { label: 'Priority Score', value: deal.dealPriorityScore || 0, color: 'text-yellow-400', badge: priority },
          ].map((m: any, i) => (
            <div key={i} className="bg-gray-900 rounded-xl p-3 border border-gray-800 text-center">
              <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{m.label}</p>
              {m.badge && (
                <span className={`text-xs px-1.5 py-0.5 rounded mt-1 inline-block ${m.badge.bg}`}>
                  {m.badge.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-xl border border-gray-800 w-fit">
        {([
          { id: 'property', label: 'Property Intelligence', icon: Building2 },
          { id: 'dealmath', label: 'Deal Math', icon: DollarSign },
          { id: 'buyers', label: 'Buyer Match', icon: Users },
          { id: 'dispo', label: 'Dispo Execution', icon: Zap },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <t.icon size={14} />
            <span className="hidden md:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div key={tab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>

        {/* === PROPERTY INTELLIGENCE === */}
        {tab === 'property' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Property Details" icon={Building2}>
              <InfoRow label="Address" value={deal.address} />
              <InfoRow label="City / State / ZIP" value={[deal.city, deal.state, deal.zipCode].filter(Boolean).join(', ')} />
              <InfoRow label="County" value={deal.county} />
              <InfoRow label="Property Type" value={deal.propertyType} />
              <InfoRow label="Beds / Baths" value={deal.beds ? `${deal.beds} bd / ${deal.baths} ba` : null} />
              <InfoRow label="Square Feet" value={deal.sqft ? `${deal.sqft.toLocaleString()} sqft` : null} />
              <InfoRow label="Year Built" value={deal.yearBuilt} />
              <InfoRow label="Lot Size" value={deal.lotSize} />
              <InfoRow label="Occupancy" value={deal.occupancy?.replace(/_/g, ' ')} />
              <InfoRow label="Access" value={deal.accessInfo} />
              <InfoRow label="HOA" value={deal.hoaStatus} />
              <InfoRow label="Flood Zone" value={deal.floodZone} />
            </Card>

            <div className="space-y-4">
              <Card title="Condition" icon={Shield}>
                <InfoRow label="Overall" value={deal.overallCondition?.replace(/_/g, ' ')} />
                <InfoRow label="Roof" value={deal.roofCondition} />
                <InfoRow label="Roof Age" value={deal.roofAge} />
                <InfoRow label="HVAC" value={deal.hvacCondition} />
                <InfoRow label="HVAC Age" value={deal.hvacAge} />
                <InfoRow label="Foundation" value={deal.foundationCondition} />
                <InfoRow label="Plumbing" value={deal.plumbingCondition} />
                <InfoRow label="Electrical" value={deal.electricalCondition} />
                {deal.moldOrWaterDamage && <p className="text-red-400 text-sm mt-2">⚠ Mold / Water Damage</p>}
                {deal.fireDamage && <p className="text-red-400 text-sm">⚠ Fire Damage</p>}
                {deal.codeIssues && <p className="text-red-400 text-sm">⚠ Code Issues</p>}
                {deal.conditionNotes && <p className="text-gray-400 text-xs mt-2 border-t border-gray-800 pt-2">{deal.conditionNotes}</p>}
              </Card>

              <Card title="Public Value Estimates" icon={TrendingUp}>
                <InfoRow label="Zillow Zestimate" value={deal.zillowZestimate ? formatCurrency(deal.zillowZestimate) : null} />
                <InfoRow label="Realtor Estimate" value={deal.realtorEstimate ? formatCurrency(deal.realtorEstimate) : null} />
                <InfoRow label="Redfin Estimate" value={deal.redfinEstimate ? formatCurrency(deal.redfinEstimate) : null} />
                {avgPublicEstimate > 0 && <>
                  <InfoRow label="Avg Public Estimate" value={formatCurrency(avgPublicEstimate)} />
                  <InfoRow label="70% of Avg" value={formatCurrency(avgPublicEstimate * 0.70)} />
                  <InfoRow label="70% − Repairs" value={formatCurrency(avgPublicEstimate * 0.70 - (deal.repairEstimate || 0))} />
                </>}
                <p className="text-gray-600 text-xs mt-3">Public estimates are quick references only — not verified ARV.</p>
              </Card>

              <Card title="Links" icon={ExternalLink}>
                {deal.zillowUrl && <a href={deal.zillowUrl} target="_blank" className="flex items-center gap-1 text-blue-400 text-sm hover:underline mb-1"><ExternalLink size={12} /> Zillow</a>}
                {deal.realtorUrl && <a href={deal.realtorUrl} target="_blank" className="flex items-center gap-1 text-blue-400 text-sm hover:underline mb-1"><ExternalLink size={12} /> Realtor.com</a>}
                {deal.redfinUrl && <a href={deal.redfinUrl} target="_blank" className="flex items-center gap-1 text-blue-400 text-sm hover:underline mb-1"><ExternalLink size={12} /> Redfin</a>}
                {deal.googleMapsUrl && <a href={deal.googleMapsUrl} target="_blank" className="flex items-center gap-1 text-blue-400 text-sm hover:underline mb-1"><ExternalLink size={12} /> Google Maps</a>}
                {deal.photosUrl && <a href={deal.photosUrl} target="_blank" className="flex items-center gap-1 text-blue-400 text-sm hover:underline mb-1"><ExternalLink size={12} /> Photos</a>}
                {deal.googleDriveUrl && <a href={deal.googleDriveUrl} target="_blank" className="flex items-center gap-1 text-blue-400 text-sm hover:underline mb-1"><ExternalLink size={12} /> Google Drive</a>}
                {!deal.zillowUrl && !deal.realtorUrl && !deal.photosUrl && (
                  <p className="text-gray-600 text-sm">No links added yet</p>
                )}
              </Card>
            </div>

            {deal.description && (
              <div className="col-span-full">
                <Card title="Description" icon={FileText}>
                  <p className="text-gray-300 text-sm leading-relaxed">{deal.description}</p>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* === DEAL MATH === */}
        {tab === 'dealmath' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Pricing" icon={DollarSign}>
              <InfoRow label="Asking / Dispo Price" value={deal.askingPrice ? formatCurrency(deal.askingPrice) : null} />
              <InfoRow label="Buyer-Facing Price" value={deal.buyerFacingPrice ? formatCurrency(deal.buyerFacingPrice) : null} />
              <InfoRow label="ARV" value={deal.arv ? formatCurrency(deal.arv) : null} />
              <InfoRow label="Repair Estimate" value={deal.repairEstimate ? formatCurrency(deal.repairEstimate) : null} />
              <InfoRow label="Assignment Fee" value={deal.assignmentFee ? formatCurrency(deal.assignmentFee) : null} />
              <InfoRow label="JV Fee" value={deal.jvFee ? formatCurrency(deal.jvFee) : null} />
            </Card>

            <Card title="Spread Analysis" icon={TrendingUp}>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-500 text-sm">Gross Spread</span>
                  <span className={`text-lg font-bold ${spread > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {spread > 0 ? formatCurrency(spread) : `(${formatCurrency(Math.abs(spread))})`}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-500 text-sm">70% Rule Max</span>
                  <span className="text-white font-medium">{seventyRule > 0 ? formatCurrency(seventyRule) : '—'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-500 text-sm">Asking vs 70% Rule</span>
                  {deal.askingPrice && seventyRule > 0 && (
                    <span className={deal.askingPrice <= seventyRule ? 'text-green-400 text-sm' : 'text-amber-400 text-sm'}>
                      {deal.askingPrice <= seventyRule ? `✓ ${formatCurrency(seventyRule - deal.askingPrice)} under` : `${formatCurrency(deal.askingPrice - seventyRule)} over`}
                    </span>
                  )}
                </div>
                <InfoRow label="Price / Sqft" value={deal.pricePerSqft ? `$${deal.pricePerSqft.toFixed(0)}/sqft` : null} />
                <InfoRow label="ARV / Sqft" value={deal.arvPerSqft ? `$${deal.arvPerSqft.toFixed(0)}/sqft` : null} />
              </div>
            </Card>

            <Card title="Rental Analysis" icon={BarChart3}>
              <InfoRow label="Rent Estimate (mo)" value={deal.rentEstimate ? formatCurrency(deal.rentEstimate) : null} />
              <InfoRow label="Current Rent (mo)" value={deal.currentRent ? formatCurrency(deal.currentRent) : null} />
              <InfoRow label="Rent-to-Price Ratio" value={deal.rentToPriceRatio ? `${deal.rentToPriceRatio.toFixed(2)}%` : null} />
              <InfoRow label="Annual Taxes" value={deal.taxesAnnual ? formatCurrency(deal.taxesAnnual) : null} />
              <InfoRow label="Insurance Est." value={deal.insuranceEstimate ? `${formatCurrency(deal.insuranceEstimate)}/mo` : null} />
              <InfoRow label="HOA Monthly" value={deal.hoaMonthly ? formatCurrency(deal.hoaMonthly) : null} />
            </Card>

            {deal.aiDealMathSummary && (
              <Card title="AI Deal Math Summary" icon={Sparkles}>
                <p className="text-gray-300 text-sm leading-relaxed">{deal.aiDealMathSummary}</p>
                <button onClick={() => calcAction.mutate()} className="mt-3 text-xs text-blue-400 hover:underline flex items-center gap-1">
                  <RefreshCw size={10} /> Recalculate
                </button>
              </Card>
            )}
          </div>
        )}

        {/* === BUYER MATCH === */}
        {tab === 'buyers' && (
          <div className="space-y-4">
            {/* Coverage status */}
            {deal.buyerCoverageStatus && (
              <div className={`p-4 rounded-xl border ${
                deal.buyerCoverageStatus === 'Strong Coverage' ? 'bg-green-900/20 border-green-800/40' :
                deal.buyerCoverageStatus === 'Moderate Coverage' ? 'bg-yellow-900/20 border-yellow-800/40' :
                deal.buyerCoverageStatus === 'Weak Coverage' ? 'bg-orange-900/20 border-orange-800/40' :
                'bg-red-900/20 border-red-800/40'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`font-medium text-sm ${
                      deal.buyerCoverageStatus === 'Strong Coverage' ? 'text-green-400' :
                      deal.buyerCoverageStatus === 'Moderate Coverage' ? 'text-yellow-400' :
                      deal.buyerCoverageStatus === 'Weak Coverage' ? 'text-orange-400' : 'text-red-400'
                    }`}>{deal.buyerCoverageStatus}</p>
                    {deal.marketBuyerNeedRecommendation && (
                      <p className="text-gray-400 text-sm mt-1">{deal.marketBuyerNeedRecommendation}</p>
                    )}
                  </div>
                  <span className="text-gray-500 text-xs">Gap Score: {deal.buyerGapScore || 0}</span>
                </div>
              </div>
            )}

            {/* Match stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total Matches', value: deal.matchedBuyerCount || 0, color: 'text-white' },
                { label: 'Tier 1', value: deal.tier1MatchCount || 0, color: 'text-orange-400' },
                { label: 'Buyer Demand', value: `${deal.buyerDemandScore || 0}/100`, color: 'text-blue-400' },
                { label: 'Market Score', value: `${deal.marketDemandScore || 0}/100`, color: 'text-purple-400' },
              ].map(s => (
                <div key={s.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Match CTA */}
            <div className="flex gap-3">
              <button
                onClick={() => matchAction.mutate()}
                disabled={matchAction.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl font-medium transition"
              >
                <Target size={15} />
                {matchAction.isPending ? 'Matching...' : 'Run Buyer Match'}
              </button>
              {(deal.matchedBuyerCount || 0) > 0 && (
                <button className="flex items-center gap-2 px-5 py-2.5 bg-green-700 hover:bg-green-600 text-white text-sm rounded-xl font-medium transition">
                  <Zap size={15} /> Generate Buyer Blast
                </button>
              )}
            </div>

            {/* Placeholder for matched buyers list */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
              <Users size={32} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Buyer matches will appear here</p>
              <p className="text-gray-600 text-sm mt-1">Run buyer match to see ranked matches with compatibility scores</p>
            </div>
          </div>
        )}

        {/* === DISPO EXECUTION === */}
        {tab === 'dispo' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Missing info */}
            {missing.length > 0 && (
              <div className="col-span-full bg-amber-900/20 border border-amber-800/40 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-amber-400 font-medium text-sm flex items-center gap-1.5">
                      <AlertCircle size={14} /> {missing.length} Missing Fields
                    </p>
                    <p className="text-gray-400 text-xs mt-1">{missing.join(' · ')}</p>
                  </div>
                  <button
                    onClick={() => followUpAction.mutate()}
                    disabled={followUpAction.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-700/50 hover:bg-amber-700 text-amber-300 text-xs rounded-lg transition"
                  >
                    <Send size={12} /> Generate Follow-Up
                  </button>
                </div>
              </div>
            )}

            {/* Source / JV */}
            <Card title="Source / JV Partner" icon={Users}>
              <InfoRow label="Source Type" value={deal.sourceType} />
              <InfoRow label="Name" value={deal.sourceName} />
              {deal.sourcePhone && (
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-500 text-sm">Phone</span>
                  <a href={`tel:${deal.sourcePhone}`} className="text-blue-400 text-sm flex items-center gap-1">
                    <Phone size={12} /> {deal.sourcePhone}
                  </a>
                </div>
              )}
              {deal.sourceEmail && (
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-500 text-sm">Email</span>
                  <a href={`mailto:${deal.sourceEmail}`} className="text-blue-400 text-sm flex items-center gap-1">
                    <Mail size={12} /> {deal.sourceEmail}
                  </a>
                </div>
              )}
              <InfoRow label="Company" value={deal.sourceCompany} />
              <InfoRow label="JV Split" value={deal.jvSplit} />
              <InfoRow label="JV Agreement" value={deal.jvAgreementStatus} />
              {deal.facebookPostUrl && <a href={deal.facebookPostUrl} target="_blank" className="text-blue-400 text-xs mt-2 flex items-center gap-1 hover:underline"><ExternalLink size={10} /> Facebook Post</a>}
              {deal.sourceNotes && <p className="text-gray-400 text-xs mt-2 pt-2 border-t border-gray-800">{deal.sourceNotes}</p>}
            </Card>

            {/* Timeline */}
            <Card title="Timeline" icon={Clock}>
              <InfoRow label="Contract Date" value={deal.contractDate ? new Date(deal.contractDate).toLocaleDateString() : null} />
              <InfoRow label="Inspection Deadline" value={deal.inspectionDeadline ? new Date(deal.inspectionDeadline).toLocaleDateString() : null} />
              <InfoRow label="EMD Due" value={deal.emdDueDate ? new Date(deal.emdDueDate).toLocaleDateString() : null} />
              <InfoRow label="Closing / COE" value={deal.closingDate ? new Date(deal.closingDate).toLocaleDateString() : null} />
              <InfoRow label="Assignment Deadline" value={deal.assignmentDeadline ? new Date(deal.assignmentDeadline).toLocaleDateString() : null} />
              <InfoRow label="Title Company" value={deal.titleCompany} />
              <InfoRow label="Escrow Officer" value={deal.escrowOfficer} />
              <InfoRow label="Assignment Allowed" value={deal.assignmentAllowed} />
              <InfoRow label="Financing" value={deal.financingAllowed?.replace(/_/g, ' ')} />
              <InfoRow label="Vacant at Close" value={deal.vacantAtClose} />
            </Card>

            {/* Campaign Actions */}
            <Card title="Campaign Actions" icon={Zap}>
              <div className="space-y-2">
                {[
                  { label: 'Generate SMS Blast', color: 'bg-green-800/40 hover:bg-green-800 text-green-300' },
                  { label: 'Generate Email Blast', color: 'bg-blue-800/40 hover:bg-blue-800 text-blue-300' },
                  { label: 'Generate Facebook Post', color: 'bg-indigo-800/40 hover:bg-indigo-800 text-indigo-300' },
                  { label: 'Start Campaign', color: 'bg-purple-800/40 hover:bg-purple-800 text-purple-300' },
                ].map(btn => (
                  <button key={btn.label} onClick={() => toast.success('Coming soon!')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${btn.color}`}>
                    {btn.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
                <p className="text-gray-500 text-xs mb-2">Update Status</p>
                {['OFFER_RECEIVED', 'ASSIGNED', 'CLOSED', 'DEAD'].map(s => (
                  <button key={s} onClick={() => updateStatus.mutate(s)}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 transition">
                    Mark as {s.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </Card>

            {/* Activity Log */}
            <Card title="Activity Log" icon={FileText}>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-gray-300 text-xs">Deal created</p>
                    <p className="text-gray-600 text-xs">{new Date(deal.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                {deal.status !== 'DRAFT' && (
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-gray-300 text-xs">Status: {deal.status?.replace(/_/g, ' ')}</p>
                      <p className="text-gray-600 text-xs">{new Date(deal.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                <p className="text-gray-700 text-xs mt-2">Full activity log coming soon</p>
              </div>
            </Card>
          </div>
        )}
      </motion.div>
    </div>
  );
}
