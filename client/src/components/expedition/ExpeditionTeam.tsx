import React from 'react';
import { Users, Shield, Radio, MapPin, Award } from 'lucide-react';
import { Personnel } from '../../types';

interface ExpeditionTeamProps {
  personnel?: Personnel[];
  commanderName?: string;
}

export const ExpeditionTeam: React.FC<ExpeditionTeamProps> = ({
  personnel = [],
  commanderName,
}) => {
  if (!personnel || personnel.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center text-slate-500">
        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-semibold">No assigned personnel records found for this mission.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-[#0284C7]" />
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Assigned Field Personnel ({personnel.length})
          </h4>
        </div>
        {commanderName && (
          <div className="text-xs font-semibold text-slate-600 flex items-center space-x-1">
            <span className="text-slate-400">Mission Leader:</span>
            <span className="font-bold text-slate-900">{commanderName}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {personnel.map((member) => {
          const isCommander = member.role === 'Commander' || member.name === commanderName;

          return (
            <div
              key={member.id || member.memberId}
              className={`bg-white rounded-2xl p-4 border transition hover:border-sky-300 shadow-2xs ${
                isCommander ? 'border-sky-200 bg-sky-50/20' : 'border-slate-200/90'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm font-bold text-slate-900">{member.name}</span>
                    {isCommander && (
                      <span className="px-1.5 py-0.5 rounded-full bg-sky-100 text-[#0284C7] text-[9px] font-extrabold flex items-center gap-0.5">
                        <Shield className="w-2.5 h-2.5" />
                        LEADER
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-[#0284C7] mt-0.5">{member.role}</div>
                </div>

                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    member.status === 'Field Mission' || member.status === 'In Transit'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {member.status || 'Active'}
                </span>
              </div>

              {member.qualification && (
                <div className="mt-2.5 text-xs text-slate-500 flex items-start space-x-1.5">
                  <Award className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{member.qualification}</span>
                </div>
              )}

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center space-x-1 truncate max-w-[140px]">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{member.currentLocation || 'Assigned Station'}</span>
                </div>

                {member.contactInfo && (
                  <div className="flex items-center space-x-1 text-slate-600 font-mono text-[10px]">
                    <Radio className="w-3 h-3 text-[#0284C7]" />
                    <span className="truncate max-w-[120px]">{member.contactInfo.split('/')[0]}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
