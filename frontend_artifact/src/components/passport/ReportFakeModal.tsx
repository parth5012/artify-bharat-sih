import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { reportFakeProduct } from '../../api/verifyApi';

interface ReportFakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcode: string;
  /** Optional backend product id for passport resolution. */
  productId?: string;
}

export const ReportFakeModal: React.FC<ReportFakeModalProps> = ({
  isOpen,
  onClose,
  shortcode,
  productId,
}) => {
  const [reason, setReason] = useState<'Machine-made' | 'Incorrect provenance' | 'Suspicious product' | 'Incorrect artisan information' | 'Other'>('Machine-made');
  const [description, setDescription] = useState<string>('');
  const [reporterContact, setReporterContact] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await reportFakeProduct({
        shortcode,
        productId,
        reason,
        description,
        reporterContact,
      });
      setTicketId(response.ticketId);
    } catch (err) {
      console.error('Report submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setTicketId(null);
    setDescription('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title="🚩 Report Fake / Machine-Made Craft"
      subtitle={`Passport Shortcode: ${shortcode}`}
    >
      {!ticketId ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-charcoal-800 mb-1">
              Select Anomaly Reason:
            </label>
            <select
              value={reason}
              onChange={(e: any) => setReason(e.target.value)}
              className="w-full p-2.5 bg-white border border-terracotta-200 rounded-xl text-xs font-semibold text-charcoal-800 focus:outline-none focus:border-terracotta-500"
            >
              <option value="Machine-made">Machine-made powerloom imitation</option>
              <option value="Incorrect provenance">Incorrect GPS / loom provenance</option>
              <option value="Suspicious product">Suspicious synthetic fibers used</option>
              <option value="Incorrect artisan information">Fake artisan identity / trader resale</option>
              <option value="Other">Other fraud concern</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-charcoal-800 mb-1">
              Detailed Fraud Observations:
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe physical defects, synthetic sheen, or machine powerloom repetition..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-white border border-terracotta-200 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-terracotta-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-charcoal-800 mb-1">
              Contact Email / Phone (Optional for Updates):
            </label>
            <input
              type="text"
              placeholder="e.g. buyer@example.com"
              value={reporterContact}
              onChange={(e) => setReporterContact(e.target.value)}
              className="w-full p-2.5 bg-white border border-terracotta-200 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-terracotta-500"
            />
          </div>

          <div className="pt-3 border-t border-cream-200 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="md" isLoading={isSubmitting}>
              Submit Anomaly Report
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-6 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h4 className="text-base font-bold text-charcoal-800">Fraud Report Escalated to Jury Feed</h4>
          <p className="text-xs text-charcoal-700">
            Thank you for helping protect authentic Indian craft heritage. Your ticket reference is:
          </p>
          <div className="p-3 bg-terracotta-50 rounded-xl border border-terracotta-200 font-mono text-sm font-bold text-terracotta-800">
            {ticketId}
          </div>
          <Button variant="primary" size="md" onClick={handleReset} className="w-full mt-4">
            Close &amp; Return
          </Button>
        </div>
      )}
    </Modal>
  );
};
