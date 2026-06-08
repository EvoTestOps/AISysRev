import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { X } from "lucide-react";
import { PerCriteriaStatsResponse } from "../state/types";

type Props = {
  open: boolean;
  onClose: () => void;
  data: PerCriteriaStatsResponse;
};

const fmtNum = (v: number | null) => (v === null ? "—" : v.toFixed(3));
const fmtPct = (v: number | null) =>
  v === null ? "—" : `${(v * 100).toFixed(1)}%`;

export const PerCriteriaStatsModal: React.FC<Props> = ({
  open,
  onClose,
  data,
}) => {
  const sortedIds = Object.keys(data.criteria).sort();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <DialogPanel className="relative bg-white shadow-2xl rounded-xl w-full max-w-4xl p-8 overflow-y-auto max-h-[90vh]">
        <X
          onClick={onClose}
          className="absolute top-4 right-4 h-5 w-5 cursor-pointer text-gray-500 hover:text-gray-700"
        />

        <DialogTitle className="text-lg font-bold mb-3">
          Per-criteria agreement statistics
        </DialogTitle>

        {data.n_raters < 2 ? (
          <p className="text-sm text-gray-500 mt-2">
            At least 2 completed per-criteria jobs are needed to compute
            agreement statistics.{" "}
            {data.n_raters === 1
              ? "Currently 1 job found."
              : "No completed per-criteria jobs found."}
          </p>
        ) : (
          <div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="pb-2 pr-4 font-semibold">ID</th>
                  <th className="pb-2 pr-4 font-semibold">Description</th>
                  <th className="pb-2 pr-4 font-semibold">Type</th>
                  <th className="pb-2 pr-4 text-right font-semibold">
                    Papers
                  </th>
                  <th className="pb-2 pr-4 text-right font-semibold">
                    Krippendorff's Alpha
                  </th>
                  <th className="pb-2 pr-4 text-right font-semibold">
                    Percent Agreement
                  </th>
                  <th className="pb-2 text-right font-semibold">Gwet AC1</th>
                </tr>
              </thead>
              <tbody>
                {sortedIds.map((id) => {
                  const s = data.criteria[id];
                  return (
                    <tr
                      key={id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-2 pr-4 font-mono font-semibold text-gray-700">
                        {id}
                      </td>
                      <td
                        className="py-2 pr-4 text-gray-600 max-w-xs truncate"
                        title={s.description}
                      >
                        {s.description}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.type === "inclusion"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                            }`}
                        >
                          {s.type}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-gray-700">
                        {s.n_papers}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-gray-700">
                        {fmtNum(s.krippendorff_alpha)}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-gray-700">
                        {fmtPct(s.percent_agreement)}
                      </td>
                      <td className="py-2 text-right font-mono text-gray-700">
                        {fmtNum(s.gwet_ac1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-5 text-xs text-gray-400 space-y-0.5 border-t border-gray-100 pt-3">
              <p>
                <span className="font-semibold">Krippendorff's Alpha </span> -
                interval metric, higher = more agreement
              </p>
              <p>
                <span className="font-semibold">Percent Agreement</span> -
                binary at p=0.5 threshold, higher = more agreement
              </p>
              <p>
                <span className="font-semibold">Gwet AC1</span> -
                chance-corrected agreement, binary at p=0.5 threshold; higher =
                more agreement
              </p>
            </div>
          </div>
        )}
      </DialogPanel>
    </Dialog>
  );
};
