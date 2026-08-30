import React from 'react';
import { RuleEvaluationResult, EvaluationStatus, RuleSeverity } from '../../types/api';
import { CheckCircle2, XCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ReportRuleCardProps {
  result: RuleEvaluationResult;
}

export function ReportRuleCard({ result }: ReportRuleCardProps) {
  const getStatusConfig = () => {
    switch (result.status) {
      case EvaluationStatus.PASS:
        return {
          icon: CheckCircle2,
          color: "text-success",
          bg: "bg-success/5",
          border: "border-success/20"
        };
      case EvaluationStatus.FAIL:
        return {
          icon: XCircle,
          color: "text-failure",
          bg: "bg-failure/5",
          border: "border-failure/20"
        };
      case EvaluationStatus.REQUIRES_HUMAN_REVIEW:
        return {
          icon: AlertTriangle,
          color: "text-warning",
          bg: "bg-warning/5",
          border: "border-warning/20"
        };
      case EvaluationStatus.NOT_APPLICABLE:
      default:
        return {
          icon: ShieldAlert,
          color: "text-text-secondary",
          bg: "bg-surface-elevated",
          border: "border-border/50"
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex flex-col border rounded-xl overflow-hidden print-avoid-break mb-4 transition-colors",
      config.bg, config.border
    )}>
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 border-b border-border/10 bg-black/5">
        <div className="flex items-center gap-3">
          <Icon className={cn("w-5 h-5 shrink-0", config.color)} />
          <span className="font-mono text-sm tracking-widest font-bold text-text-primary uppercase">
            {result.rule_id.replace(/_/g, ' ')}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {result.severity && result.status === EvaluationStatus.FAIL && (
            <span className={cn(
              "text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded",
              result.severity === RuleSeverity.CRITICAL ? "bg-failure text-white" : "bg-black/10 text-text-secondary"
            )}>
              {result.severity}
            </span>
          )}
          <span className={cn("text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border", config.color, config.border)}>
            {result.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Body: Source + Explanation */}
      <div className="p-4 flex flex-col gap-4 bg-surface">
        <div>
          <h4 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Rule Explanation</h4>
          <p className="text-sm text-text-primary leading-relaxed">{result.explanation}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <h4 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Regulatory Source</h4>
          <div className="text-sm text-text-primary flex flex-col gap-0.5">
            <span className="font-medium">{result.source_reference.source_document}</span>
            <span className="text-text-secondary font-mono text-[13px]">
              Rule {result.source_reference.source_rule} 
              {result.source_reference.source_clause && ` · Clause ${result.source_reference.source_clause}`}
              {result.source_reference.source_amendment_year && ` · ${result.source_reference.source_amendment_year}`}
            </span>
          </div>
        </div>

        {/* Evidence Section */}
        <div className="mt-2 border-t border-border/30 pt-3">
          <h4 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">Evidence</h4>
          {!result.evidence ? (
            <span className="text-sm text-text-secondary/60 italic">No specific evidence payload recorded.</span>
          ) : (
            <div className="bg-surface-elevated rounded-md p-3 font-mono text-[13px] border border-border/50 max-h-[300px] overflow-y-auto">
              {typeof result.evidence === 'object' ? (
                <div className="flex flex-col gap-1">
                  {Object.entries(result.evidence).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-text-secondary min-w-[120px]">{key}:</span>
                      <span className="text-text-primary break-words whitespace-pre-wrap">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-text-primary whitespace-pre-wrap">{String(result.evidence)}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
