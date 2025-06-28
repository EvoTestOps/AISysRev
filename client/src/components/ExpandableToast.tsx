import { useState } from "react";
import { toast } from "react-toastify";


type ValidationError = {
  file: string;
  row: number;
  message: string;
};

const ToastContent = ({ parsed }: { parsed: ValidationError[] }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div onClick={() => setExpanded(!expanded)} className="cursor-pointer">
      {!expanded ? (
        <span><strong>Errors occurred!</strong><br /> Click to see validation errors.</span>
      ) : (
        <div className="max-h-64 overflow-y-auto text-sm">
          <strong>Validation errors:</strong>
          <ul className="mt-2 list-disc list-inside">
            {parsed.map((e, index) => (
              <li key={index}>
                File: {e.file}, Row: {e.row}, Message: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export const ExpandableToast = (parsed: ValidationError[]) => {
  toast.error(<ToastContent parsed={parsed} />, {
    autoClose: 10000,
    closeOnClick: false,
  });
};