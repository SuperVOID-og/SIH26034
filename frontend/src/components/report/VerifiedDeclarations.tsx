import React from 'react';
import { VerifiedDeclarationsReport } from '../../types/api';
import { ShieldCheck } from 'lucide-react';

interface VerifiedDeclarationsProps {
  declarations: VerifiedDeclarationsReport;
}

export function VerifiedDeclarations({ declarations }: VerifiedDeclarationsProps) {
  const fields = [
    { key: 'manufacturer_packer_importer_details', label: 'Manufacturer / Packer / Importer' },
    { key: 'generic_name', label: 'Generic Name' },
    { key: 'net_quantity', label: 'Net Quantity' },
    { key: 'mrp', label: 'MRP' },
    { key: 'manufacture_or_pack_date', label: 'Manufacture / Pack Date' },
    { key: 'consumer_care', label: 'Consumer Care' },
    { key: 'country_of_origin', label: 'Country of Origin' }
  ];

  return (
    <div className="flex flex-col gap-6 print-avoid-break">
      <div className="border-b border-[#D4DAE3] pb-2">
        <h3 className="text-xl font-semibold tracking-tight text-[#161B24] font-sora">Human-verified declarations</h3>
        <p className="text-sm text-[#667085] mt-1 max-w-2xl">
          The following values were verified by a human inspector and form the sole basis of the deterministic rule evaluation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        {fields.map(({ key, label }) => {
          const value = declarations[key as keyof VerifiedDeclarationsReport];
          const isNull = value === null || value === undefined || value.trim() === '';
          
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
                {label}
              </span>
              <div className="text-[15px] leading-relaxed">
                {isNull ? (
                  <span className="text-[#667085] italic font-medium">Not recorded</span>
                ) : (
                  <span className="text-[#161B24] font-medium">{value}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 p-4 rounded-lg bg-blue-50 border border-blue-200 flex gap-3 text-blue-800">
        <ShieldCheck className="w-5 h-5 shrink-0 text-blue-700" />
        <p className="text-sm leading-relaxed text-blue-800">
          <strong>Trust Note:</strong> Compliance evaluation strictly uses the human-verified declarations shown above, not the raw AI extraction data.
        </p>
      </div>
    </div>
  );
}
