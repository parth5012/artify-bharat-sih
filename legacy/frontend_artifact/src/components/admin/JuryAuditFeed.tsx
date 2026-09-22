import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Clock, Users, CheckCircle2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { AuditFeedItem } from '../../types';

interface JuryAuditFeedProps {
  auditFeed: AuditFeedItem[];
}

export const JuryAuditFeed: React.FC<JuryAuditFeedProps> = ({ auditFeed: initialFeed }) => {
  const [feed, setFeed] = useState<AuditFeedItem[]>(initialFeed);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [votedMap, setVotedMap] = useState<Record<string, 'approve' | 'reject'>>({});

  const handleVote = (itemId: string, voteType: 'approve' | 'reject') => {
    setFeed((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const newVote = {
          jurorId: 'YOU (MoSJE Admin Juror)',
          vote: voteType,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        const updatedVotes = [...item.jurorVotes.filter((v) => !v.jurorId.includes('YOU')), newVote];
        const approveCount = updatedVotes.filter((v) => v.vote === 'approve').length;
        const rejectCount = updatedVotes.filter((v) => v.vote === 'reject').length;

        let newStatus = item.status;
        if (approveCount >= 2) newStatus = 'Verified';
        else if (rejectCount >= 2) newStatus = 'Anomaly detected';

        return {
          ...item,
          jurorVotes: updatedVotes,
          jurorsCount: updatedVotes.length,
          quorumMet: updatedVotes.length >= 3,
          status: newStatus,
        };
      })
    );
    setVotedMap((prev) => ({ ...prev, [itemId]: voteType }));
  };

  const filteredItems = feed.filter((item) => {
    if (filterStatus === 'All') return true;
    if (filterStatus === 'Verified') return item.status === 'Verified';
    if (filterStatus === 'Anomaly') return item.status === 'Anomaly detected';
    if (filterStatus === 'Pending') return item.status === 'Pending' || item.status === 'Under review';
    return true;
  });

  return (
    <Card className="border-terracotta-200 shadow-warm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-terracotta-200 pb-4 mb-4 gap-3">
        <div>
          <h3 className="text-lg font-bold font-heading text-charcoal-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Zero-Trust Peer Review Audit Feed
          </h3>
          <p className="text-xs text-charcoal-700 mt-0.5">
            3-Juror Randomized Peer Consensus &amp; SHA-256 Provenance Audit Logs.
          </p>
        </div>

        <div className="bg-cream-200/80 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
          {['All', 'Verified', 'Anomaly', 'Pending'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterStatus === status
                  ? 'bg-white text-terracotta-600 shadow-sm font-bold'
                  : 'text-charcoal-700 hover:text-terracotta-600'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-2xl border transition-all ${
              item.status === 'Verified'
                ? 'bg-cream-50 border-emerald-300/70 shadow-sm'
                : item.status === 'Anomaly detected'
                ? 'bg-red-50/70 border-red-300 shadow-sm'
                : 'bg-amber-50/70 border-amber-300'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-cream-200 px-2 py-0.5 rounded text-charcoal-800 border border-cream-300">
                  {item.productShortcode}
                </span>
                <h4 className="text-sm font-bold text-charcoal-900">{item.craftName}</h4>
              </div>

              <div className="flex items-center gap-2">
                {item.status === 'Verified' && (
                  <Badge variant="verified" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                    Verified Quorum ({item.jurorVotes.filter((v) => v.vote === 'approve').length}/3)
                  </Badge>
                )}
                {item.status === 'Anomaly detected' && (
                  <Badge variant="danger" icon={<ShieldAlert className="w-3.5 h-3.5" />}>
                    Anomaly Detected
                  </Badge>
                )}
                {item.status === 'Pending' && (
                  <Badge variant="pending" icon={<Clock className="w-3.5 h-3.5" />}>
                    Quorum Pending ({item.jurorVotes.length}/3)
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-charcoal-700 mb-3">
              <div>
                <span>Artisan: </span>
                <strong className="text-charcoal-900">{item.artisanName}</strong>
              </div>
              <div>
                <span>Cluster: </span>
                <strong className="text-terracotta-700">{item.cluster}</strong>
              </div>
              <div>
                <span>Timestamp: </span>
                <span className="font-mono text-charcoal-800">{item.timestamp}</span>
              </div>
            </div>

            {item.anomalyFlag && (
              <div className="mb-3 p-2.5 bg-red-100/90 border border-red-300 rounded-xl text-xs text-red-900 font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                <span>Security Flag: {item.anomalyFlag}</span>
              </div>
            )}

            <div className="pt-2.5 border-t border-cream-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-charcoal-700 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-terracotta-500" />
                  Randomized Juror Votes:
                </span>
                {item.jurorVotes.map((vote, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                      vote.vote === 'approve'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}
                  >
                    {vote.jurorId}: {vote.vote.toUpperCase()}
                  </span>
                ))}
              </div>

              {/* Interactive Juror Consensus Buttons */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  onClick={() => handleVote(item.id, 'approve')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    votedMap[item.id] === 'approve'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                  }`}
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span>{votedMap[item.id] === 'approve' ? 'Approve Voted' : 'Approve'}</span>
                </button>

                <button
                  onClick={() => handleVote(item.id, 'reject')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    votedMap[item.id] === 'reject'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300'
                  }`}
                >
                  <ThumbsDown className="w-3 h-3" />
                  <span>{votedMap[item.id] === 'reject' ? 'Flag Voted' : 'Flag Anomaly'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
